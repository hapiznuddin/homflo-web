import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type {
  BudgetStatus,
  DashboardResponse,
  DashboardTransaction,
  TransactionDirection
} from '~/types/dashboard'
import { formatMonthLabel } from '~/utils/format'
import { periodOptions, useDashboard } from '~/composables/useDashboard'

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

const budgetStatuses: BudgetStatus[] = ['normal', 'warning', 'near-limit', 'over']
const directions: TransactionDirection[] = ['in', 'out']

describe('useDashboard read-model contract', () => {
  it('load() mengisi data dengan seluruh field kontrak read-model', async () => {
    const dash = await mountDashboard()

    await dash.load()

    const data = dash.data.value

    expect(data).not.toBeNull()
    expect(data?.period.key).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/)
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
  })
})
