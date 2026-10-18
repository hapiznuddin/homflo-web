import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LaravelDashboardPayload } from '~/utils/dashboardMapper'
import { greetingForHour } from '~/utils/format'
import DashboardPage from '~/pages/dashboard/index.vue'

// $fetch auto-import Nuxt berasal dari #build/fetch.mjs (bukan global),
// sehingga vi.stubGlobal tidak mempan. Mock modulnya langsung.
const fetchMock = vi.hoisted(() => vi.fn())

vi.mock('#build/fetch.mjs', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>

  return { ...original, $fetch: fetchMock }
})

// useAuth di-mock agar boundary autentikasi terisolasi dari backend:
// halaman di-mount langsung dan tidak boleh memicu logout dari dalam
// setup halaman.
const authMock = vi.hoisted(() => ({
  user: {
    value: {
      id: 'u1',
      username: 'budi',
      name: 'Budi Santoso',
      email: 'budi@example.com',
      email_verified_at: '2026-01-01T00:00:00.000Z'
    }
  },
  household: { value: { id: 'h1', name: 'Rumah Budi', role: 'owner' } },
  onboarding: { value: { required: false } },
  status: { value: 'authenticated' },
  bootstrap: vi.fn(async () => 'authenticated'),
  logout: vi.fn()
}))

mockNuxtImport('useAuth', () => () => authMock)

// Boundary /api/dashboard di-stub dengan payload API (snake_case) agar
// halaman diuji end-to-end lewat mapper tanpa network/Laravel running.
function apiPayload(): LaravelDashboardPayload {
  return {
    period: { year: 2026, month: 10, key: '2026-10' },
    household: { id: 'h1', name: 'Rumah Budi', role: 'owner', member_count: 2, pending_invitations: 0 },
    financial: {
      income: '15000000.00',
      expense: '7000000.00',
      net_cash_flow: '8000000.00',
      income_change_percent: 8,
      budget_usage_percent: 56,
      cash_flow_status: 'surplus'
    },
    budget: [
      { id: 'kebutuhan', name: 'Kebutuhan Rumah', icon: 'i-lucide-shopping-basket', spent: 1000000, budget: 2000000, kind: 'kebutuhan' },
      { id: 'tagihan', name: 'Tagihan & Utilitas', icon: 'i-lucide-receipt', spent: 2850000, budget: 3000000, kind: 'tagihan' }
    ],
    upcoming_bills: [
      { id: 'bill-1', title: 'Internet', icon: 'i-lucide-wifi', due_date: '2026-10-05', amount: 416250 }
    ],
    recent_transactions: [
      { id: 'tx-1', title: 'Belanja Supermarket', icon: 'i-lucide-shopping-cart', occurred_at: '2026-10-02T10:00:00Z', wallet: 'Rekening BCA Utama', amount: 685000, direction: 'out' }
    ],
    maintenance: [
      { id: 'mnt-1', title: 'Cuci & Service AC Master', scheduled_date: '2026-10-03', priority: 'rutin', location: 'Kamar Utama' }
    ]
  }
}

// Boundary di-stub per URL: agregat nol-jujur, budgets + meta aktual,
// dan transaksi terbaru — tanpa network/Laravel running.
function budgetsFixture() {
  return {
    data: [
      {
        id: 'bg-kebutuhan',
        household_id: 'h1',
        category: { id: 'kebutuhan', name: 'Kebutuhan Rumah', icon: 'i-lucide-shopping-basket' },
        year: 2026,
        month: 10,
        amount: '5000000.00',
        actual_spending: '4200000.00',
        remaining: '800000.00',
        usage_percentage: 84,
        usage_status: 'normal',
        created_at: '2026-10-01T00:00:00.000000Z',
        updated_at: '2026-10-01T00:00:00.000000Z'
      },
      {
        id: 'bg-tagihan',
        household_id: 'h1',
        category: { id: 'tagihan', name: 'Tagihan & Utilitas', icon: 'i-lucide-receipt' },
        year: 2026,
        month: 10,
        amount: '3000000.00',
        actual_spending: '2850000.00',
        remaining: '150000.00',
        usage_percentage: 95,
        usage_status: 'normal',
        created_at: '2026-10-01T00:00:00.000000Z',
        updated_at: '2026-10-01T00:00:00.000000Z'
      }
    ],
    meta: {
      period: { year: 2026, month: 10 },
      household: { actual_spending: '6500000.00' }
    }
  }
}

function transactionsFixture() {
  return {
    data: [
      { id: 'tx-1', household_id: 'h1', type: 'expense', amount: '685000.00', occurred_on: '2026-10-02', description: 'Belanja Supermarket', wallet: 'Rekening BCA Utama', category: { id: 'kebutuhan', name: 'Kebutuhan Rumah', icon: 'i-lucide-shopping-basket' }, created_at: '2026-10-02T10:00:00.000000Z', updated_at: '2026-10-02T10:00:00.000000Z' }
    ],
    meta: { current_page: 1, per_page: 5, total: 1, last_page: 1 }
  }
}

async function mountPage() {
  // useDashboard asli: async setup menyelesaikan load() (via $fetch stub)
  // sebelum mount.
  return mountSuspended(DashboardPage, { route: '/dashboard' })
}

describe('dashboard page (success path)', () => {
  beforeEach(() => {
    authMock.bootstrap.mockClear()
    authMock.logout.mockClear()
    fetchMock.mockReset()
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/budgets') {
        return { success: true, ...budgetsFixture() }
      }

      if (url === '/api/transactions') {
        return { success: true, data: transactionsFixture() }
      }

      return { success: true, data: apiPayload() }
    })
  })

  it('menyapa pengguna dengan nama depan sesuai jam', async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain(`${greetingForHour(new Date().getHours())}, Budi`)
  })

  it('menampilkan nama household di atas greeting', async () => {
    const wrapper = await mountPage()
    const text = wrapper.text()
    const greeting = `${greetingForHour(new Date().getHours())}, Budi`

    expect(text).toContain('Rumah Budi')
    expect(text.indexOf('Rumah Budi')).toBeLessThan(text.indexOf(greeting))
  })

  it('menampilkan tiga kartu KPI utama', async () => {
    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Pendapatan Bulan Ini')
    expect(text).toContain('Pengeluaran Bulan Ini')
    expect(text).toContain('Arus Kas Bersih')
  })

  it('KPI memakai agregat dashboard: pendapatan, pengeluaran, dan arus kas tampil penuh', async () => {
    const wrapper = await mountPage()
    const text = wrapper.text()

    // Blok financial dashboard (income 15jt, expense 7jt, net +8jt)
    // dipakai apa adanya; tidak ada "Belum tersedia" lagi untuk KPI ini.
    expect(text).toContain('15.000.000')
    expect(text).toContain('7.000.000')
    expect(text).toContain('8.000.000')
    expect(text).not.toContain('Belum tersedia')
    expect(text).toContain('Surplus bulan ini')
  })

  it('menampilkan seluruh section: Budget, Akan Datang, Transaksi, Perawatan, Aksi Cepat', async () => {
    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Budget')
    expect(text).toContain('Akan Datang')
    expect(text).toContain('Transaksi Terbaru')
    expect(text).toContain('Perawatan & Pemeliharaan')
    expect(text).toContain('Aksi Cepat')
  })

  it('kategori budget 95% memunculkan peringatan near-limit (Mendekati limit)', async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Mendekati limit')
  })

  it('tidak menampilkan skeleton saat data sudah dimuat', async () => {
    const wrapper = await mountPage()

    expect(wrapper.find('[aria-label="Memuat dashboard"]').exists()).toBe(false)
  })

  it('aksi cepat tetap disabled dengan label jujur "Segera hadir"', async () => {
    const wrapper = await mountPage()
    const button = wrapper.findAll('button').find(element => element.text().includes('Tambah Transaksi'))

    expect(button).toBeDefined()
    expect(button!.attributes('title')).toBe('Segera hadir')
    expect(button!.attributes('aria-disabled')).toBe('true')
  })

  it('halaman tidak memanggil logout atau bootstrap berulang (auth lock)', async () => {
    await mountPage()

    expect(authMock.logout).not.toHaveBeenCalled()
    // Bootstrap hanya boleh datang dari boundary middleware (maksimal sekali
    // per navigasi), tidak pernah dari dalam setup halaman.
    expect(authMock.bootstrap.mock.calls.length).toBeLessThanOrEqual(1)
  })
})
