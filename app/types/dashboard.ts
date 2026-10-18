// Dashboard read-model contracts. The dashboard is a derived read model,
// never the financial source of truth. These types mirror the future
// GET /api/dashboard response so fixture data can be swapped for API
// data without touching components.
export interface DashboardPeriod {
  /** YYYY-MM */
  key: string
  /** Display label, e.g. "Oktober 2024" */
  label: string
}

export type CashFlowStatus = 'surplus' | 'defisit' | 'seimbang'

/**
 * Ringkasan finansial untuk presentasi KPI.income/expense/netCashFlow
 * dikonversi dari string desimal eksak backend ke number HANYA di mapper
 * (batas presentasi); tidak pernah dihitung ulang di klien. Nilai
 * number aman untuk display karena semua nominal berada di dalam batas
 * schema dan `formatRupiah` hanya memformat.
 */
export interface DashboardFinancialSummary {
  income: number
  expense: number
  netCashFlow: number
  incomeChangePercent: number
  budgetUsagePercent: number
  cashFlowStatus: CashFlowStatus
}

export type BudgetStatus = 'normal' | 'warning' | 'near-limit' | 'over'

export interface DashboardBudgetCategory {
  id: string
  name: string
  icon: string
  spent: number
  budget: number
  percent: number
  status: BudgetStatus
  note?: string
  /**
   * False ketika backend melaporkan `usage_status = no_budget` (kategori
   * tanpa target anggaran). UI tidak boleh menampilkan persentase numerik,
   * progress bar, maupun aria-label persen untuk kategori semacam ini;
   * `percent`/`status` pada model tersebut hanya placeholder yang tidak
   * dirender.
   */
  hasTarget: boolean
}

export interface DashboardUpcomingBill {
  id: string
  title: string
  icon: string
  dueLabel: string
  amount: number
  urgent: boolean
}

export type TransactionDirection = 'in' | 'out'

export interface DashboardTransaction {
  id: string
  title: string
  icon: string
  dateLabel: string
  wallet: string
  amount: number
  direction: TransactionDirection
}

export type MaintenancePriority = 'tinggi' | 'sedang' | 'rutin'

export interface DashboardMaintenance {
  id: string
  title: string
  priority: MaintenancePriority
  dateLabel: string
  location: string
}

export interface DashboardResponse {
  period: DashboardPeriod
  financial: DashboardFinancialSummary
  budget: DashboardBudgetCategory[]
  upcomingBills: DashboardUpcomingBill[]
  recentTransactions: DashboardTransaction[]
  maintenance: DashboardMaintenance[]
  /**
   * Ketersediaan data aktual per KPI. Sejak blok financial divalidasi
   * penuh di mapper (string desimal + union status), ketiganya tersedia
   * bersamaan; `false` berarti payload belum/tidak tervalidasi — UI
   * wajib menampilkan status jujur (bukan angka nol seolah terverifikasi).
   */
  availability: DashboardDataAvailability
}

/**
 * Sumber data aktual per KPI. income/expense/netCashFlow kini semuanya
 * berasal dari blok financial GET /api/dashboard yang tervalidasi
 * (Phase 14.2.1 backend agregasi); ketiganya tersedia atau gagal
 * bersamaan.
 */
export interface DashboardDataAvailability {
  income: boolean
  expense: boolean
  netCashFlow: boolean
}
