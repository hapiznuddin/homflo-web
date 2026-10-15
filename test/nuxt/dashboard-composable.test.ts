import { mountSuspended } from '@nuxt/test-utils/runtime'
import { clearNuxtState } from '#app'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  BudgetStatus,
  DashboardResponse,
  DashboardTransaction,
  TransactionDirection
} from '~/types/dashboard'
import type { LaravelDashboardPayload } from '~/utils/dashboardMapper'
import { formatMonthLabel } from '~/utils/format'
import { periodOptions, useDashboard } from '~/composables/useDashboard'

// $fetch auto-import Nuxt berasal dari #build/fetch.mjs (bukan global),
// sehingga vi.stubGlobal tidak mempan. Mock modulnya langsung; runtime
// lain di-spread agar mountSuspended tetap utuh.
const fetchMock = vi.hoisted(() => vi.fn())

vi.mock('#build/fetch.mjs', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>

  return { ...original, $fetch: fetchMock }
})

// useState hanya valid di dalam konteks app Nuxt, jadi komposable dijalankan
// lewat harness yang di-mount suspended. `latest` mengekspos ref mentah
// (bertipe) agar test tidak bergantung pada unwrapping vm.
let latest: ReturnType<typeof useDashboard> | undefined

const DashboardHarness = defineComponent({
  name: 'DashboardHarness',
  setup() {
    const api = useDashboard()

    latest = api

    return api
  },
  render: () => null
})

async function mountDashboard(): Promise<ReturnType<typeof useDashboard>> {
  await mountSuspended(DashboardHarness, { route: false })

  return latest!
}

// Payload agregat (snake_case): finansial nol-jujur, koleksi kosong —
// seksi finansial aktual datang dari endpoint khusus di bawah.
function apiPayload(year = 2026, month = 10): LaravelDashboardPayload {
  return {
    period: { year, month, key: `${year}-${String(month).padStart(2, '0')}` },
    household: { id: 'h1', name: 'Rumah Budi', role: 'owner', member_count: 2, pending_invitations: 0 },
    financial: {
      income: 0,
      expense: 0,
      net_cash_flow: 0,
      income_change_percent: 0,
      budget_usage_percent: 0,
      cash_flow_status: 'seimbang'
    },
    budget: [],
    upcoming_bills: [
      { id: 'bill-1', title: 'Internet', icon: 'i-lucide-wifi', due_date: '2026-10-05', amount: 416250 },
      { id: 'bill-2', title: 'Air PAM', icon: 'i-lucide-droplets', due_date: '2026-10-12', amount: 135000 },
      { id: 'bill-3', title: 'Perawatan AC', icon: 'i-lucide-air-vent', due_date: '2026-10-20', amount: 850000 }
    ],
    recent_transactions: [],
    maintenance: [
      { id: 'mnt-1', title: 'Cuci & Service AC Master', scheduled_date: '2026-10-03', priority: 'tinggi', location: 'Kamar Utama' },
      { id: 'mnt-2', title: 'Ganti Oli & Servis Berkala', scheduled_date: '2026-10-11', priority: 'sedang', location: 'Honda HR-V' },
      { id: 'mnt-3', title: 'Kuras & Sterilisasi Toren', scheduled_date: '2026-10-19', priority: 'rutin', location: 'Toren Atas' }
    ]
  }
}

// Payload endpoint Budgets: target + turunan server. Total meta SENGAJA
// berbeda dari jumlah spent kategori (6.500.000 vs 8.280.000) agar test
// mampu membuktikan tidak ada penjumlahan ulang di klien.
function budgetsPayload(year = 2026, month = 10) {
  return {
    data: [
      {
        id: 'bg-kebutuhan',
        household_id: 'h1',
        category: { id: 'kebutuhan', name: 'Kebutuhan Rumah', icon: 'i-lucide-shopping-basket' },
        year,
        month,
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
        year,
        month,
        amount: '3000000.00',
        actual_spending: '2850000.00',
        remaining: '150000.00',
        usage_percentage: 95,
        usage_status: 'normal',
        created_at: '2026-10-01T00:00:00.000000Z',
        updated_at: '2026-10-01T00:00:00.000000Z'
      },
      {
        id: 'bg-nol',
        household_id: 'h1',
        category: { id: 'darurat', name: 'Dana Darurat', icon: null },
        year,
        month,
        amount: '0.00',
        actual_spending: '50000.00',
        remaining: '-50000.00',
        usage_percentage: null,
        usage_status: 'no_budget',
        created_at: '2026-10-01T00:00:00.000000Z',
        updated_at: '2026-10-01T00:00:00.000000Z'
      },
      {
        id: 'bg-kendaraan',
        household_id: 'h1',
        category: { id: 'kendaraan', name: 'Operasional Kendaraan', icon: 'i-lucide-car' },
        year,
        month,
        amount: '1000000.00',
        actual_spending: '1180000.00',
        remaining: '-180000.00',
        usage_percentage: 118,
        usage_status: 'normal',
        created_at: '2026-10-01T00:00:00.000000Z',
        updated_at: '2026-10-01T00:00:00.000000Z'
      }
    ],
    meta: {
      period: { year, month },
      household: { actual_spending: '6500000.00' }
    }
  }
}

// Payload endpoint Transactions: terurut terbaru, bentuk presenter asli.
function transactionsPayload() {
  return {
    data: [
      { id: 'tx-1', household_id: 'h1', type: 'expense', amount: '685000.00', occurred_on: '2026-10-28', description: 'Belanja Supermarket', wallet: 'Rekening BCA Utama', category: { id: 'kebutuhan', name: 'Kebutuhan Rumah', icon: 'i-lucide-shopping-basket' }, created_at: '2026-10-28T10:00:00.000000Z', updated_at: '2026-10-28T10:00:00.000000Z' },
      { id: 'tx-2', household_id: 'h1', type: 'expense', amount: '502500.00', occurred_on: '2026-10-25', description: null, wallet: 'Dompet Jago', category: { id: 'tagihan', name: 'Tagihan & Utilitas', icon: 'i-lucide-receipt' }, created_at: '2026-10-25T10:00:00.000000Z', updated_at: '2026-10-25T10:00:00.000000Z' },
      { id: 'tx-3', household_id: 'h1', type: 'expense', amount: '220000.00', occurred_on: '2026-10-22', description: 'Service Motor Honda Vario', wallet: null, category: null, created_at: '2026-10-22T10:00:00.000000Z', updated_at: '2026-10-22T10:00:00.000000Z' },
      { id: 'tx-4', household_id: 'h1', type: 'income', amount: '3500000.00', occurred_on: '2026-10-19', description: 'Freelance Consultation', wallet: 'Rekening Mandiri', category: null, created_at: '2026-10-19T10:00:00.000000Z', updated_at: '2026-10-19T10:00:00.000000Z' },
      { id: 'tx-5', household_id: 'h1', type: 'expense', amount: '78000.00', occurred_on: '2026-10-16', description: null, wallet: 'Dompet Jago', category: { id: 'kebutuhan', name: 'Kebutuhan Rumah', icon: 'i-lucide-shopping-basket' }, created_at: '2026-10-16T10:00:00.000000Z', updated_at: '2026-10-16T10:00:00.000000Z' }
    ],
    meta: { current_page: 1, per_page: 5, total: 9, last_page: 2 }
  }
}

beforeEach(() => {
  // State read-model dibagi antar mount dalam satu file; reset agar tiap
  // test mulai dari periode berjalan tanpa data.
  clearNuxtState(['dashboard-period', 'dashboard-data', 'dashboard-pending', 'dashboard-error', 'dashboard-inflight', 'dashboard-request-seq'])
  // Boundary HTTP di-stub per URL: agregat, budgets + meta, dan transaksi
  // terbaru — tanpa network dan tanpa Laravel running.
  fetchMock.mockReset()
  fetchMock.mockImplementation(async (url: string, options?: { params?: { month?: number, year?: number } }) => {
    const month = options?.params?.month ?? 10
    const year = options?.params?.year ?? 2026

    if (url === '/api/budgets') {
      return { success: true, ...budgetsPayload(year, month) }
    }

    if (url === '/api/transactions') {
      return { success: true, data: transactionsPayload() }
    }

    return { success: true, data: apiPayload(year, month) }
  })
})

const budgetStatuses: BudgetStatus[] = ['normal', 'warning', 'near-limit', 'over']
const directions: TransactionDirection[] = ['in', 'out']

describe('useDashboard read-model contract', () => {
  it('load() mengambil 3 endpoint dengan param periode + menggabung kontrak read-model', async () => {
    const dash = await mountDashboard()

    await dash.load()

    expect(fetchMock).toHaveBeenCalledTimes(3)

    const calls = fetchMock.mock.calls as Array<[string, { params?: Record<string, number | string> }]>
    const byUrl = Object.fromEntries(calls.map(([url, options]) => [url, options?.params ?? {}]))

    expect(Object.keys(byUrl).sort()).toEqual(['/api/budgets', '/api/dashboard', '/api/transactions'])

    const [year, month] = dash.period.value.key.split('-').map(Number) as [number, number]

    expect(byUrl['/api/dashboard']).toEqual({ month, year })
    expect(byUrl['/api/budgets']).toEqual({ month, year })
    expect(byUrl['/api/transactions']).toEqual({ sort_by: 'occurred_on', sort_dir: 'desc', per_page: 5 })

    const data = dash.data.value

    expect(data).not.toBeNull()
    expect(data?.period.key).toBe(dash.period.value.key)
    expect(data?.budget.length).toBe(4)
    expect(data?.recentTransactions.length).toBe(5)
    expect(data?.upcomingBills.length).toBeGreaterThan(0)
    expect(data?.maintenance.length).toBeGreaterThan(0)
    expect(dash.pending.value).toBe(false)
    expect(dash.error.value).toBeNull()
  })

  it('tidak pernah memanggil /api/auth/me dari dashboard (auth lock)', async () => {
    const dash = await mountDashboard()

    await dash.load()

    const urls = fetchMock.mock.calls.map(call => String(call[0]))

    expect(urls.length).toBeGreaterThan(0)
    expect(urls.every(url => !url.includes('auth/me'))).toBe(true)
  })

  it('expense memakai total meta household + availability jujur (tanpa hitung ulang)', async () => {
    const dash = await mountDashboard()

    await dash.load()

    const data = dash.data.value

    // Meta 6.500.000 dipakai apa adanya — BUKAN jumlah spent kategori
    // (4.200.000 + 2.850.000 + 50.000 + 1.180.000 = 8.280.000).
    expect(data?.financial.expense).toBe(6500000)
    expect(data?.availability).toEqual({ income: false, expense: true, netCashFlow: false })
    expect(data?.financial.income).toBe(0)
    expect(data?.financial.netCashFlow).toBe(0)
  })

  it('meta tak-cocok periode membuat expense tidak tersedia (tanpa penjumlahan)', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/budgets') {
        const payload = budgetsPayload()

        return { success: true, data: payload.data, meta: { period: { year: 2020, month: 1 }, household: { actual_spending: '1.00' } } }
      }

      if (url === '/api/transactions') {
        return { success: true, data: transactionsPayload() }
      }

      return { success: true, data: apiPayload() }
    })

    const dash = await mountDashboard()

    await dash.load()

    expect(dash.data.value?.financial.expense).toBe(0)
    expect(dash.data.value?.availability.expense).toBe(false)
    expect(dash.error.value).toBeNull()
  })

  it('meta hilang membuat expense tidak tersedia (tanpa penjumlahan)', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/budgets') {
        return { success: true, data: budgetsPayload().data }
      }

      if (url === '/api/transactions') {
        return { success: true, data: transactionsPayload() }
      }

      return { success: true, data: apiPayload() }
    })

    const dash = await mountDashboard()

    await dash.load()

    expect(dash.data.value?.financial.expense).toBe(0)
    expect(dash.data.value?.availability.expense).toBe(false)
    expect(dash.error.value).toBeNull()
  })

  it('kategori budget dari API: persen/status/note termasuk no_budget dan remaining negatif', async () => {
    const dash = await mountDashboard()

    await dash.load()

    const categories = dash.data.value?.budget ?? []

    expect(categories.length).toBe(4)

    const byId = Object.fromEntries(categories.map(category => [category.id, category]))

    expect(byId['bg-kebutuhan']?.percent).toBe(84)
    expect(byId['bg-kebutuhan']?.status).toBe('warning')
    expect(byId['bg-kebutuhan']?.note).toContain('Sisa')
    expect(byId['bg-tagihan']?.percent).toBe(95)
    expect(byId['bg-tagihan']?.status).toBe('near-limit')
    expect(byId['bg-tagihan']?.note).toContain('Mendekati limit')

    const nol = byId['bg-nol']

    expect(nol?.percent).toBe(0)
    expect(nol?.status).toBe('normal')
    expect(nol?.note).toContain('Tanpa target')

    const over = byId['bg-kendaraan']

    expect(over?.percent).toBe(118)
    expect(over?.status).toBe('over')
    expect(over?.note).toContain('Lebih')

    for (const category of categories) {
      expect(category.id).toBeTruthy()
      expect(category.name).toBeTruthy()
      expect(category.icon).toBeTruthy()
      expect(category.budget).toBeGreaterThanOrEqual(0)
      expect(budgetStatuses).toContain(category.status)
    }
  })

  it('bills, transaksi API, dan maintenance memiliki field wajib + union tipe yang valid', async () => {
    const dash = await mountDashboard()

    await dash.load()

    const data = dash.data.value as DashboardResponse

    const billIds = new Set(data.upcomingBills.map(bill => bill.id))
    expect(billIds.size).toBe(data.upcomingBills.length)

    for (const bill of data.upcomingBills) {
      expect(bill.title).toBeTruthy()
      expect(bill.icon).toBeTruthy()
      expect(bill.dueLabel).toMatch(/^Jatuh tempo/)
      expect(bill.amount).toBeGreaterThan(0)
      expect(typeof bill.urgent).toBe('boolean')
    }

    const txIds = new Set(data.recentTransactions.map((tx: DashboardTransaction) => tx.id))
    expect(txIds.size).toBe(data.recentTransactions.length)

    for (const tx of data.recentTransactions) {
      expect(tx.title).toBeTruthy()
      expect(tx.wallet).toBeTruthy()
      expect(tx.dateLabel).toBeTruthy()
      expect(tx.amount).toBeGreaterThan(0)
      expect(directions).toContain(tx.direction)
    }

    // Judul turun dari deskripsi, kategori, lalu jenis — tanpa karangan.
    const byId = Object.fromEntries(data.recentTransactions.map(tx => [tx.id, tx]))

    expect(byId['tx-1']?.title).toBe('Belanja Supermarket')
    expect(byId['tx-2']?.title).toBe('Tagihan & Utilitas')
    expect(byId['tx-3']?.title).toBe('Service Motor Honda Vario')
    expect(byId['tx-4']?.title).toBe('Freelance Consultation')
    expect(byId['tx-5']?.title).toBe('Kebutuhan Rumah')
    expect(byId['tx-2']?.icon).toBe('i-lucide-receipt')

    for (const item of data.maintenance) {
      expect(item.title).toBeTruthy()
      expect(['tinggi', 'sedang', 'rutin']).toContain(item.priority)
      expect(item.dateLabel).toBeTruthy()
      expect(item.location).toBeTruthy()
    }
  })

  it('periode default saat ini: key YYYY-MM dan label id-ID yang cocok', async () => {
    const dash = await mountDashboard()

    const period = dash.period.value

    expect(period.key).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/)

    const [year, month] = period.key.split('-').map(Number) as [number, number]

    expect(period.label).toBe(formatMonthLabel(year, month))
  })

  it('periodOptions(): 13 opsi unik, dimulai dari bulan berjalan', () => {
    const options = periodOptions()

    expect(options).toHaveLength(13)
    expect(new Set(options.map(option => option.key)).size).toBe(13)

    const now = new Date()
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    expect(options[0]?.key).toBe(currentKey)

    for (const option of options) {
      const [year, month] = option.key.split('-').map(Number) as [number, number]

      expect(option.label).toBe(formatMonthLabel(year, month))
    }
  })

  it('setPeriod memuat ulang data untuk periode yang dipilih', async () => {
    const dash = await mountDashboard()

    await dash.load()

    const options = periodOptions()
    const target = options[2]!

    dash.setPeriod(target)

    expect(dash.period.value.key).toBe(target.key)

    await vi.waitFor(
      () => {
        expect(dash.data.value?.period.key).toBe(target.key)
      },
      { timeout: 5000, interval: 25 }
    )

    expect(dash.pending.value).toBe(false)
    expect(dash.error.value).toBeNull()
  })

  it('load() ulangan tidak membangun ulang data yang sudah segar (dedup)', async () => {
    const dash = await mountDashboard()

    await dash.load()

    const before = dash.data.value

    expect(before).not.toBeNull()

    await dash.load()

    expect(dash.data.value).toBe(before)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('request lama tidak menimpa hasil periode yang lebih baru (sequencing)', async () => {
    const dash = await mountDashboard()
    const candidates = periodOptions()
    const targetA = candidates.find(option => option.key !== dash.period.value.key)!
    const targetB = candidates.find(option => option.key !== dash.period.value.key && option.key !== targetA.key)!

    const resolvers = new Map<string, Array<(envelope: { success: boolean, data: unknown }) => void>>()

    fetchMock.mockImplementation(
      (url: string, options?: { params?: { month?: number, year?: number } }) =>
        new Promise<{ success: boolean, data: unknown, meta?: unknown }>((resolve) => {
          const month = options?.params?.month ?? 10
          const year = options?.params?.year ?? 2026
          const key = `${url}|${year}-${String(month).padStart(2, '0')}`
          const list = resolvers.get(key) ?? []

          list.push(resolve)
          resolvers.set(key, list)

          // Endpoint non-agregat langsung dijawab fixture agar hanya
          // request agregat yang tertahan untuk uji sequencing.
          if (url === '/api/budgets') {
            const payload = budgetsPayload(year, month)

            resolve({ success: true, data: payload.data, meta: payload.meta })
          }

          if (url === '/api/transactions') {
            resolve({ success: true, data: transactionsPayload() })
          }
        })
    )

    dash.setPeriod(targetA)
    dash.setPeriod(targetB)

    const keyA = `/api/dashboard|${targetA.key}`
    const keyB = `/api/dashboard|${targetB.key}`

    await vi.waitFor(
      () => {
        expect(resolvers.has(keyA) && resolvers.has(keyB)).toBe(true)
      },
      { timeout: 5000, interval: 25 }
    )

    // Selesaikan yang lama DULU: hasilnya wajib diabaikan.
    resolvers.get(keyA)!.forEach(resolve => resolve({ success: true, data: apiPayload(...targetA.key.split('-').map(Number) as [number, number]) }))
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(dash.data.value?.period.key).not.toBe(targetA.key)

    resolvers.get(keyB)!.forEach(resolve => resolve({ success: true, data: apiPayload(...targetB.key.split('-').map(Number) as [number, number]) }))

    await vi.waitFor(
      () => {
        expect(dash.data.value?.period.key).toBe(targetB.key)
      },
      { timeout: 5000, interval: 25 }
    )

    expect(dash.pending.value).toBe(false)
    expect(dash.error.value).toBeNull()
  })

  it('API 500 menghasilkan error jujur tanpa data karangan', async () => {
    fetchMock.mockRejectedValueOnce({ statusCode: 500, data: { message: 'Server error.' } })

    const dash = await mountDashboard()

    await dash.load()

    expect(dash.data.value).toBeNull()
    expect(dash.pending.value).toBe(false)
    expect(dash.error.value).toBe('Server error.')
  })

  it('API 401 menghasilkan pesan sesi berakhir tanpa data', async () => {
    fetchMock.mockRejectedValueOnce({ statusCode: 401, data: { message: 'Unauthenticated.' } })

    const dash = await mountDashboard()

    await dash.load()

    expect(dash.data.value).toBeNull()
    expect(dash.error.value).toBe('Sesi berakhir. Silakan login kembali.')
  })

  it('network failure menghasilkan error tanpa data', async () => {
    fetchMock.mockRejectedValueOnce(new Error('fetch failed'))

    const dash = await mountDashboard()

    await dash.load()

    expect(dash.data.value).toBeNull()
    expect(dash.pending.value).toBe(false)
    expect(typeof dash.error.value).toBe('string')
  })

  it('payload malformed menghasilkan error, bukan data karangan', async () => {
    const broken = apiPayload() as unknown as Record<string, unknown>

    broken.financial = { ...(broken.financial as object), income: 'banyak' }
    fetchMock.mockResolvedValueOnce({ success: true, data: broken })

    const dash = await mountDashboard()

    await dash.load()

    expect(dash.data.value).toBeNull()
    expect(dash.pending.value).toBe(false)
    expect(typeof dash.error.value).toBe('string')
  })

  it('payload kosong menghasilkan koleksi kosong yang jujur (bukan error)', async () => {
    const empty = apiPayload()

    empty.budget = []
    empty.upcoming_bills = []
    empty.recent_transactions = []
    empty.maintenance = []
    empty.financial = {
      income: 0,
      expense: 0,
      net_cash_flow: 0,
      income_change_percent: 0,
      budget_usage_percent: 0,
      cash_flow_status: 'seimbang'
    }
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/budgets') {
        return { success: true, data: [] }
      }

      if (url === '/api/transactions') {
        return { success: true, data: { data: [], meta: { current_page: 1, per_page: 5, total: 0, last_page: 1 } } }
      }

      return { success: true, data: empty }
    })

    const dash = await mountDashboard()

    await dash.load()

    expect(dash.error.value).toBeNull()
    expect(dash.data.value?.budget).toEqual([])
    expect(dash.data.value?.recentTransactions).toEqual([])
    expect(dash.data.value?.financial.income).toBe(0)
    expect(dash.data.value?.availability).toEqual({ income: false, expense: false, netCashFlow: false })
  })
})
