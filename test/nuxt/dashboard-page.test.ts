import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { greetingForHour } from '~/utils/format'
import DashboardPage from '~/pages/dashboard.vue'

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

async function mountPage() {
  // useDashboard fixture asli: async setup menyelesaikan load() sebelum mount.
  return mountSuspended(DashboardPage, { route: '/dashboard' })
}

describe('dashboard page (success path)', () => {
  beforeEach(() => {
    authMock.bootstrap.mockClear()
    authMock.logout.mockClear()
  })

  it('menyapa pengguna dengan nama depan sesuai jam', async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain(`${greetingForHour(new Date().getHours())}, Budi`)
  })

  it('menampilkan tiga kartu KPI utama', async () => {
    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Pendapatan Bulan Ini')
    expect(text).toContain('Pengeluaran Bulan Ini')
    expect(text).toContain('Arus Kas Bersih')
    expect(text).toContain('dari bulan lalu')
    expect(text).toContain('dari alokasi anggaran')
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

  it('read-model fixture memunculkan peringatan budget near-limit (95%)', async () => {
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
