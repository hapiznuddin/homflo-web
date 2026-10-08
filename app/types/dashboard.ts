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
}
