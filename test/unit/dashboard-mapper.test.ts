import { describe, expect, it } from 'vitest'
import {
  mapBudgetApiItem,
  mapCashFlowStatus,
  mapDashboardFinance,
  mapDashboardResponse,
  mapTransactionApiItem,
  type LaravelBudgetsPayload,
  type LaravelDashboardPayload,
  type LaravelTransactionsPayload
} from '../../app/utils/dashboardMapper'

function basePayload(): LaravelDashboardPayload {
  return {
    period: { year: 2026, month: 10, key: '2026-10' },
    household: { id: 'h1', name: 'Rumah Budi', role: 'owner', member_count: 2, pending_invitations: 0 },
    financial: {
      income: 12000000,
      expense: 6500000,
      net_cash_flow: 5500000,
      income_change_percent: 8,
      budget_usage_percent: 52,
      cash_flow_status: 'surplus'
    },
    budget: [],
    upcoming_bills: [],
    recent_transactions: [],
    maintenance: []
  }
}

describe('mapDashboardResponse', () => {
  it('memetakan snake_case API ke model UI + label periode id-ID', () => {
    const data = mapDashboardResponse(basePayload())

    expect(data.period).toEqual({ key: '2026-10', label: 'Oktober 2026' })
    expect(data.financial).toEqual({
      income: 12000000,
      expense: 6500000,
      netCashFlow: 5500000,
      incomeChangePercent: 8,
      budgetUsagePercent: 52,
      cashFlowStatus: 'surplus'
    })
  })

  it('payload kosong menghasilkan koleksi kosong yang jujur (bukan error)', () => {
    const data = mapDashboardResponse(basePayload())

    expect(data.budget).toEqual([])
    expect(data.upcomingBills).toEqual([])
    expect(data.recentTransactions).toEqual([])
    expect(data.maintenance).toEqual([])
  })

  it('threshold status budget + note mengikuti kontrak tunggal', () => {
    const cases: Array<[number, number, string, string | undefined]> = [
      [690000, 1000000, 'normal', undefined],
      [700000, 1000000, 'warning', undefined],
      [890000, 1000000, 'warning', undefined],
      [900000, 1000000, 'near-limit', 'Mendekati limit'],
      [990000, 1000000, 'near-limit', 'Mendekati limit'],
      [1000000, 1000000, 'over', undefined],
      [1200000, 1000000, 'over', undefined]
    ]

    for (const [spent, budget, status, note] of cases) {
      const payload = basePayload()

      payload.budget = [{ id: 'c', name: 'Kategori', spent, budget }]

      const [category] = mapDashboardResponse(payload).budget

      expect(category?.percent).toBe(Math.round((spent / budget) * 100))
      expect(category?.status).toBe(status)
      expect(category?.note).toBe(note)
    }
  })

  it('aturan urgent: ≤3 hari (termasuk lewat jatuh tempo), >3 hari tidak', () => {
    const today = new Date(2026, 9, 10)
    const payload = basePayload()

    payload.upcoming_bills = [
      { id: 'b1', title: 'Lewat', due_date: '2026-10-08', amount: 100 },
      { id: 'b2', title: 'Hari ini', due_date: '2026-10-10', amount: 100 },
      { id: 'b3', title: 'Tiga hari', due_date: '2026-10-13', amount: 100 },
      { id: 'b4', title: 'Empat hari', due_date: '2026-10-14', amount: 100 }
    ]

    const bills = mapDashboardResponse(payload, today).upcomingBills

    expect(bills.map(bill => bill.urgent)).toEqual([true, true, true, false])
    expect(bills[0]?.dueLabel).toBe('Jatuh tempo 8 Okt')
  })

  it('label tanggal transaksi + fallback ikon domain', () => {
    const payload = basePayload()

    payload.recent_transactions = [
      {
        id: 'tx-1',
        title: 'Belanja',
        occurred_at: '2026-10-28T10:00:00Z',
        wallet: 'Kas',
        amount: 50000,
        direction: 'out'
      }
    ]
    payload.maintenance = [
      { id: 'm-1', title: 'Servis', scheduled_date: '2026-10-03', priority: 'rutin', location: 'Rumah' }
    ]

    const data = mapDashboardResponse(payload)

    expect(data.recentTransactions[0]?.dateLabel).toBe('28 Okt 2026')
    expect(data.recentTransactions[0]?.icon).toBe('i-lucide-circle-dollar-sign')
    expect(data.maintenance[0]?.dateLabel).toBe('3 Okt')
  })

  it('ikon eksplisit menang atas tabel kind', () => {
    const payload = basePayload()

    payload.budget = [{ id: 'c', name: 'K', icon: 'i-lucide-star', kind: 'tagihan', spent: 10, budget: 100 }]
    payload.upcoming_bills = [{ id: 'b', title: 'T', kind: 'tagihan', due_date: '2026-10-05', amount: 10 }]

    const data = mapDashboardResponse(payload)

    expect(data.budget[0]?.icon).toBe('i-lucide-star')
    expect(data.upcomingBills[0]?.icon).toBe('i-lucide-receipt')
  })

  it('payload malformed melempar Error (tidak pernah diisi karangan)', () => {
    const cases: Array<(payload: LaravelDashboardPayload) => void> = [
      (payload) => { payload.financial.income = 'banyak' as unknown as number },
      (payload) => { payload.financial.cash_flow_status = 'profit' },
      (payload) => { payload.budget = 'x' as unknown as [] },
      (payload) => { payload.budget = [{ id: 'c', name: 'K', spent: 10, budget: 0 }] },
      (payload) => {
        payload.recent_transactions = [{
          id: 't', title: 'T', occurred_at: '2026-10-01', wallet: 'W', amount: 1, direction: 'sideways'
        }]
      },
      (payload) => {
        payload.maintenance = [{ id: 'm', title: 'M', scheduled_date: '2026-10-01', priority: 'low', location: 'L' }]
      },
      (payload) => {
        payload.upcoming_bills = [{ id: 'b', title: 'B', due_date: 'bukan-tanggal', amount: 1 }]
      }
    ]

    for (const mutate of cases) {
      const payload = basePayload()

      mutate(payload)

      expect(() => mapDashboardResponse(payload)).toThrowError()
    }
  })

  it('mapCashFlowStatus menerima trio valid dan menolak sisanya', () => {
    expect(mapCashFlowStatus('surplus')).toBe('surplus')
    expect(mapCashFlowStatus('defisit')).toBe('defisit')
    expect(mapCashFlowStatus('seimbang')).toBe('seimbang')
    expect(() => mapCashFlowStatus('profit')).toThrowError()
  })
})

function budgetApiItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bg-1',
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
    updated_at: '2026-10-01T00:00:00.000000Z',
    ...overrides
  }
}

function transactionApiItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tx-1',
    household_id: 'h1',
    type: 'expense',
    amount: '685000.00',
    occurred_on: '2026-10-02',
    description: 'Belanja Supermarket',
    wallet: 'Rekening BCA Utama',
    category: { id: 'kebutuhan', name: 'Kebutuhan Rumah', icon: 'i-lucide-shopping-basket' },
    created_at: '2026-10-02T10:00:00.000000Z',
    updated_at: '2026-10-02T10:00:00.000000Z',
    ...overrides
  }
}

describe('mapBudgetApiItem', () => {
  it('memetakan target + turunan server tanpa hitung ulang', () => {
    const mapped = mapBudgetApiItem(budgetApiItem())

    expect(mapped.id).toBe('bg-1')
    expect(mapped.name).toBe('Kebutuhan Rumah')
    expect(mapped.icon).toBe('i-lucide-shopping-basket')
    expect(mapped.spent).toBe(4200000)
    expect(mapped.budget).toBe(5000000)
    expect(mapped.percent).toBe(84)
    expect(mapped.status).toBe('warning')
    expect(mapped.note).toContain('Sisa')
    expect(mapped.note).toContain('800.000')
  })

  it('menerima usage_percentage integer JSON apa adanya', () => {
    const mapped = mapBudgetApiItem(budgetApiItem({ usage_percentage: 100 }))

    expect(mapped.percent).toBe(100)
    expect(mapped.status).toBe('over')
  })

  it('no_budget memakai status non-numerik eksplisit', () => {
    const mapped = mapBudgetApiItem(budgetApiItem({
      amount: '0.00',
      actual_spending: '50000.00',
      remaining: '-50000.00',
      usage_percentage: null,
      usage_status: 'no_budget'
    }))

    expect(mapped.percent).toBe(0)
    expect(mapped.status).toBe('normal')
    expect(mapped.note).toContain('Tanpa target')
    expect(mapped.note).toContain('Lebih')
  })

  it('remaining negatif ditampilkan jujur (tidak dipotong nol)', () => {
    const mapped = mapBudgetApiItem(budgetApiItem({
      amount: '1000000.00',
      actual_spending: '1180000.00',
      remaining: '-180000.00',
      usage_percentage: 118,
      usage_status: 'normal'
    }))

    expect(mapped.percent).toBe(118)
    expect(mapped.status).toBe('over')
    expect(mapped.note).toContain('Lebih')
  })

  it('near-limit mempertahankan note Mendekati limit + sisa', () => {
    const mapped = mapBudgetApiItem(budgetApiItem({
      actual_spending: '2850000.00',
      remaining: '150000.00',
      usage_percentage: 95
    }))

    expect(mapped.status).toBe('near-limit')
    expect(mapped.note).toContain('Mendekati limit')
    expect(mapped.note).toContain('Sisa')
  })

  it('menolak kontrak tak dikenal tanpa karangan', () => {
    expect(() => mapBudgetApiItem(budgetApiItem({ usage_status: 'unknown' }))).toThrowError()
    expect(() => mapBudgetApiItem(budgetApiItem({ usage_status: 'no_budget', usage_percentage: 0 }))).toThrowError()
    expect(() => mapBudgetApiItem(budgetApiItem({ actual_spending: 'banyak' }))).toThrowError()
    expect(() => mapBudgetApiItem(budgetApiItem({ category: null }))).toThrowError()
    expect(() => mapBudgetApiItem(budgetApiItem({ usage_percentage: 'tinggi' }))).toThrowError()
  })
})

describe('mapTransactionApiItem', () => {
  it('memetakan presenter transaksi apa adanya', () => {
    const mapped = mapTransactionApiItem(transactionApiItem())

    expect(mapped).toEqual({
      id: 'tx-1',
      title: 'Belanja Supermarket',
      icon: 'i-lucide-shopping-basket',
      dateLabel: '2 Okt 2026',
      wallet: 'Rekening BCA Utama',
      amount: 685000,
      direction: 'out'
    })
  })

  it('judul turun dari deskripsi, kategori, lalu jenis', () => {
    expect(mapTransactionApiItem(transactionApiItem({ description: '  ' })).title).toBe('Kebutuhan Rumah')
    expect(mapTransactionApiItem(transactionApiItem({ description: null, category: null })).title).toBe('Pengeluaran')
    expect(mapTransactionApiItem(transactionApiItem({ description: null, category: null, type: 'income' })).title).toBe('Pemasukan')
  })

  it('ikon turun dari kategori lalu jenis; dompet kosong memakai penanda', () => {
    expect(mapTransactionApiItem(transactionApiItem({ category: null })).icon).toBe('i-lucide-trending-down')
    expect(mapTransactionApiItem(transactionApiItem({ category: null, type: 'income' })).icon).toBe('i-lucide-trending-up')
    expect(mapTransactionApiItem(transactionApiItem({ wallet: null })).wallet).toBe('—')
    expect(mapTransactionApiItem(transactionApiItem({ wallet: '' })).wallet).toBe('—')
  })

  it('menolak kontrak tak dikenal tanpa karangan', () => {
    expect(() => mapTransactionApiItem(transactionApiItem({ type: 'transfer' }))).toThrowError()
    expect(() => mapTransactionApiItem(transactionApiItem({ occurred_on: 'kapan' }))).toThrowError()
    expect(() => mapTransactionApiItem(transactionApiItem({ amount: 'banyak' }))).toThrowError()
  })
})

describe('mapDashboardFinance', () => {
  const base = () => mapDashboardResponse(basePayload())

  const budgets = (overrides: Partial<LaravelBudgetsPayload> = {}): LaravelBudgetsPayload => ({
    data: [budgetApiItem()],
    meta: { period: { year: 2026, month: 10 }, household: { actual_spending: '6500000.00' } },
    ...overrides
  })

  const transactions = (overrides: Partial<LaravelTransactionsPayload> = {}): LaravelTransactionsPayload => ({
    data: [transactionApiItem()],
    meta: { current_page: 1, per_page: 5, total: 1, last_page: 1 },
    ...overrides
  })

  it('menggabung budget, transaksi, expense meta, dan availability', () => {
    const merged = mapDashboardFinance(base(), budgets(), transactions(), 2026, 10)

    expect(merged.budget).toHaveLength(1)
    expect(merged.budget[0]?.name).toBe('Kebutuhan Rumah')
    expect(merged.recentTransactions).toHaveLength(1)
    expect(merged.recentTransactions[0]?.title).toBe('Belanja Supermarket')
    expect(merged.financial.expense).toBe(6500000)
    expect(merged.availability).toEqual({ income: false, expense: true, netCashFlow: false })
    // Income/net dari agregat dipertahankan apa adanya (nol-jujur).
    expect(merged.financial.income).toBe(12000000)
  })

  it('tidak menjumlahkan kategori maupun mencampur periode', () => {
    const differentTotals = budgets({
      data: [budgetApiItem({ actual_spending: '99999999.99' })],
      meta: { period: { year: 2026, month: 10 }, household: { actual_spending: '1.00' } }
    })

    const merged = mapDashboardFinance(base(), differentTotals, transactions(), 2026, 10)

    expect(merged.financial.expense).toBe(1)
  })

  it('meta hilang atau tak-cocok membuat expense tidak tersedia', () => {
    const noMeta = mapDashboardFinance(base(), { data: [budgetApiItem()] }, transactions(), 2026, 10)

    expect(noMeta.financial.expense).toBe(0)
    expect(noMeta.availability.expense).toBe(false)

    const mismatch = mapDashboardFinance(
      base(),
      { data: [budgetApiItem()], meta: { period: { year: 2020, month: 1 }, household: { actual_spending: '1.00' } } },
      transactions(),
      2026,
      10
    )

    expect(mismatch.financial.expense).toBe(0)
    expect(mismatch.availability.expense).toBe(false)
  })
})
