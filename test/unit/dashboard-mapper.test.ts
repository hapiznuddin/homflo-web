import { describe, expect, it } from 'vitest'
import {
  mapCashFlowStatus,
  mapDashboardResponse,
  type LaravelDashboardPayload
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
