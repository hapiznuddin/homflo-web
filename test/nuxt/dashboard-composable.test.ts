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

// Payload API (snake_case) yang meniru nilai fixture lama agar asersi
// kontrak konten tetap berlaku melalui mapper + flow API yang baru.
function apiPayload(year = 2026, month = 10): LaravelDashboardPayload {
  return {
    period: { year, month, key: `${year}-${String(month).padStart(2, '0')}` },
    household: { id: 'h1', name: 'Rumah Budi', role: 'owner', member_count: 2, pending_invitations: 0 },
    financial: {
      income: 12000000,
      expense: 6500000,
      net_cash_flow: 5500000,
      income_change_percent: 8,
      budget_usage_percent: 52,
      cash_flow_status: 'surplus'
    },
    budget: [
      { id: 'kebutuhan', name: 'Kebutuhan Rumah', icon: 'i-lucide-shopping-basket', spent: 4200000, budget: 5000000 },
      { id: 'tagihan', name: 'Tagihan & Utilitas', icon: 'i-lucide-receipt', spent: 2850000, budget: 3000000 },
      { id: 'perawatan', name: 'Perawatan Rumah', icon: 'i-lucide-house-plus', spent: 1250000, budget: 2000000 },
      { id: 'kendaraan', name: 'Operasional Kendaraan', icon: 'i-lucide-car', spent: 980000, budget: 1500000 }
    ],
    upcoming_bills: [
      { id: 'bill-1', title: 'Internet', icon: 'i-lucide-wifi', due_date: '2026-10-05', amount: 416250 },
      { id: 'bill-2', title: 'Air PAM', icon: 'i-lucide-droplets', due_date: '2026-10-12', amount: 135000 },
      { id: 'bill-3', title: 'Perawatan AC', icon: 'i-lucide-air-vent', due_date: '2026-10-20', amount: 850000 }
    ],
    recent_transactions: [
      { id: 'tx-1', title: 'Belanja Supermarket', icon: 'i-lucide-shopping-cart', occurred_at: '2026-10-28T10:00:00Z', wallet: 'Rekening BCA Utama', amount: 685000, direction: 'out' },
      { id: 'tx-2', title: 'Token Listrik', icon: 'i-lucide-zap', occurred_at: '2026-10-25T10:00:00Z', wallet: 'Dompet Jago', amount: 502500, direction: 'out' },
      { id: 'tx-3', title: 'Service Motor Honda Vario', icon: 'i-lucide-wrench', occurred_at: '2026-10-22T10:00:00Z', wallet: 'Kas Tunai', amount: 220000, direction: 'out' },
      { id: 'tx-4', title: 'Freelance Consultation', icon: 'i-lucide-briefcase', occurred_at: '2026-10-19T10:00:00Z', wallet: 'Rekening Mandiri', amount: 3500000, direction: 'in' },
      { id: 'tx-5', title: 'Isi Galon', icon: 'i-lucide-droplet', occurred_at: '2026-10-16T10:00:00Z', wallet: 'Dompet Jago', amount: 78000, direction: 'out' }
    ],
    maintenance: [
      { id: 'mnt-1', title: 'Cuci & Service AC Master', scheduled_date: '2026-10-03', priority: 'tinggi', location: 'Kamar Utama' },
      { id: 'mnt-2', title: 'Ganti Oli & Servis Berkala', scheduled_date: '2026-10-11', priority: 'sedang', location: 'Honda HR-V' },
      { id: 'mnt-3', title: 'Kuras & Sterilisasi Toren', scheduled_date: '2026-10-19', priority: 'rutin', location: 'Toren Atas' }
    ]
  }
}

beforeEach(() => {
  // State read-model dibagi antar mount dalam satu file; reset agar tiap
  // test mulai dari periode berjalan tanpa data.
  clearNuxtState(['dashboard-period', 'dashboard-data', 'dashboard-pending', 'dashboard-error', 'dashboard-inflight', 'dashboard-request-seq'])
  // Boundary HTTP di-stub: periode di-echo agar setPeriod terverifikasi,
  // tanpa network dan tanpa Laravel running.
  fetchMock.mockReset()
  fetchMock.mockImplementation(async (_url: string, options?: { params?: { month?: number, year?: number } }) => {
    const month = options?.params?.month ?? 10
    const year = options?.params?.year ?? 2026

    return { success: true, data: apiPayload(year, month) }
  })
})

const budgetStatuses: BudgetStatus[] = ['normal', 'warning', 'near-limit', 'over']
const directions: TransactionDirection[] = ['in', 'out']

describe('useDashboard read-model contract', () => {
  it('load() mengambil /api/dashboard dengan param periode + mengisi kontrak read-model', async () => {
    const dash = await mountDashboard()

    await dash.load()

    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, options] = fetchMock.mock.calls[0] as [string, { params: { month: number, year: number } }]

    expect(url).toBe('/api/dashboard')

    const [year, month] = dash.period.value.key.split('-').map(Number) as [number, number]

    expect(options.params).toEqual({ month, year })

    const data = dash.data.value

    expect(data).not.toBeNull()
    expect(data?.period.key).toBe(dash.period.value.key)
    expect(typeof data?.period.label).toBe('string')
    expect(data?.period.label.length).toBeGreaterThan(0)

    for (const field of [
      'income',
      'expense',
      'netCashFlow',
      'incomeChangePercent',
      'budgetUsagePercent'
    ] as const) {
      expect(typeof data?.financial[field]).toBe('number')
      expect(Number.isFinite(data?.financial[field])).toBe(true)
    }

    expect(['surplus', 'defisit', 'seimbang']).toContain(data?.financial.cashFlowStatus)
    expect(data?.budget.length).toBeGreaterThan(0)
    expect(data?.upcomingBills.length).toBeGreaterThan(0)
    expect(data?.recentTransactions.length).toBeGreaterThan(0)
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

  it('ringkasan finansial konsisten: netCashFlow = income - expense', async () => {
    const dash = await mountDashboard()

    await dash.load()

    const financial = dash.data.value?.financial

    expect(financial).toBeDefined()
    expect(financial!.netCashFlow).toBe(financial!.income - financial!.expense)
    expect(financial!.incomeChangePercent).toBeGreaterThanOrEqual(0)
    expect(financial!.budgetUsagePercent).toBeGreaterThanOrEqual(0)
  })

  it('kategori budget: persentase, status threshold, dan note mengikuti kontrak', async () => {
    const dash = await mountDashboard()

    await dash.load()

    const categories = dash.data.value?.budget ?? []

    expect(categories.length).toBeGreaterThan(0)

    for (const category of categories) {
      expect(category.id).toBeTruthy()
      expect(category.name).toBeTruthy()
      expect(category.icon).toBeTruthy()
      expect(category.budget).toBeGreaterThan(0)
      expect(category.percent).toBe(Math.round((category.spent / category.budget) * 100))
      expect(budgetStatuses).toContain(category.status)

      const expectedStatus: BudgetStatus =
        category.percent >= 100
          ? 'over'
          : category.percent >= 90
            ? 'near-limit'
            : category.percent >= 70
              ? 'warning'
              : 'normal'

      expect(category.status).toBe(expectedStatus)

      if (category.percent >= 90 && category.percent < 100) {
        expect(category.note).toBe('Mendekati limit')
      } else {
        expect(category.note).toBeUndefined()
      }
    }
  })

  it('bills, transaksi, dan maintenance memiliki field wajib + union tipe yang valid', async () => {
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
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('request lama tidak menimpa hasil periode yang lebih baru (sequencing)', async () => {
    const dash = await mountDashboard()
    const candidates = periodOptions()
    const targetA = candidates.find(option => option.key !== dash.period.value.key)!
    const targetB = candidates.find(option => option.key !== dash.period.value.key && option.key !== targetA.key)!

    const resolvers = new Map<string, (envelope: { success: boolean, data: LaravelDashboardPayload }) => void>()

    fetchMock.mockImplementation(
      (_url: string, options?: { params?: { month?: number, year?: number } }) =>
        new Promise<{ success: boolean, data: LaravelDashboardPayload }>((resolve) => {
          const month = options?.params?.month ?? 10
          const year = options?.params?.year ?? 2026

          resolvers.set(`${year}-${String(month).padStart(2, '0')}`, resolve)
        })
    )

    dash.setPeriod(targetA)
    dash.setPeriod(targetB)

    await vi.waitFor(
      () => {
        expect(resolvers.has(targetA.key) && resolvers.has(targetB.key)).toBe(true)
      },
      { timeout: 5000, interval: 25 }
    )

    // Selesaikan yang lama DULU: hasilnya wajib diabaikan.
    resolvers.get(targetA.key)!({ success: true, data: apiPayload(...targetA.key.split('-').map(Number) as [number, number]) })
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(dash.data.value?.period.key).not.toBe(targetA.key)

    resolvers.get(targetB.key)!({ success: true, data: apiPayload(...targetB.key.split('-').map(Number) as [number, number]) })

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
    fetchMock.mockResolvedValueOnce({ success: true, data: empty })

    const dash = await mountDashboard()

    await dash.load()

    expect(dash.error.value).toBeNull()
    expect(dash.data.value?.budget).toEqual([])
    expect(dash.data.value?.recentTransactions).toEqual([])
    expect(dash.data.value?.financial.income).toBe(0)
  })
})
