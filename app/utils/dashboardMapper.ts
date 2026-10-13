// Mapper terpusat: GET /api/dashboard (Laravel, snake_case) -> DashboardResponse
// (model UI). Satu-satunya tempat transformasi response dashboard; komponen
// tidak boleh mem-parse payload API sendiri.

import type {
  BudgetStatus,
  CashFlowStatus,
  DashboardBudgetCategory,
  DashboardMaintenance,
  DashboardResponse,
  DashboardTransaction,
  DashboardUpcomingBill,
  MaintenancePriority,
  TransactionDirection
} from '~/types/dashboard'
import { formatFullDate, formatMonthLabel, formatShortDate } from '~/utils/format'

export interface LaravelDashboardPeriod {
  year: number
  month: number
  key: string
}

export interface LaravelDashboardFinancial {
  income: number
  expense: number
  net_cash_flow: number
  income_change_percent: number
  budget_usage_percent: number
  cash_flow_status: string
}

export interface LaravelBudgetItem {
  id: string
  name: string
  icon?: string
  kind?: string
  spent: number
  budget: number
}

export interface LaravelBillItem {
  id: string
  title: string
  icon?: string
  kind?: string
  due_date: string
  amount: number
}

export interface LaravelTransactionItem {
  id: string
  title: string
  icon?: string
  kind?: string
  occurred_at: string
  wallet: string
  amount: number
  direction: string
}

export interface LaravelMaintenanceItem {
  id: string
  title: string
  scheduled_date: string
  priority: string
  location: string
}

export interface LaravelDashboardPayload {
  period: LaravelDashboardPeriod
  household: {
    id: string
    name: string
    role: string
    member_count: number
    pending_invitations: number
  }
  financial: LaravelDashboardFinancial
  budget: LaravelBudgetItem[]
  upcoming_bills: LaravelBillItem[]
  recent_transactions: LaravelTransactionItem[]
  maintenance: LaravelMaintenanceItem[]
  meta?: { unsupported_domains?: string[] }
}

// Tagihan dianggap mendesak bila jatuh tempo maksimal 3 hari dari hari ini
// (termasuk yang sudah lewat).
const URGENT_WITHIN_DAYS = 3

const KIND_ICONS: Record<string, string> = {
  kebutuhan: 'i-lucide-shopping-basket',
  tagihan: 'i-lucide-receipt',
  perawatan: 'i-lucide-house-plus',
  kendaraan: 'i-lucide-car',
  transaksi: 'i-lucide-circle-dollar-sign'
}

const DEFAULT_ICON = 'i-lucide-circle-dollar-sign'

function invalidPayload(reason: string): Error {
  return new Error(`Data dashboard belum dapat dimuat. (${reason})`)
}

function finiteNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw invalidPayload(`field ${field} bukan angka valid`)
  }

  return value
}

function nonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw invalidPayload(`field ${field} kosong`)
  }

  return value
}

function validDate(value: unknown, field: string): Date {
  const date = new Date(typeof value === 'string' ? value : NaN)

  if (Number.isNaN(date.getTime())) {
    throw invalidPayload(`field ${field} bukan tanggal valid`)
  }

  return date
}

function resolveIcon(icon: string | undefined, kind: string | undefined): string {
  if (icon && icon.length > 0) {
    return icon
  }

  return (kind && KIND_ICONS[kind]) || DEFAULT_ICON
}

function budgetStatus(percent: number): BudgetStatus {
  if (percent >= 100) {
    return 'over'
  }

  if (percent >= 90) {
    return 'near-limit'
  }

  if (percent >= 70) {
    return 'warning'
  }

  return 'normal'
}

function mapBudgetCategory(item: LaravelBudgetItem): DashboardBudgetCategory {
  const spent = finiteNumber(item.spent, 'budget.spent')
  const budget = finiteNumber(item.budget, 'budget.budget')

  if (budget <= 0) {
    throw invalidPayload('budget harus lebih dari nol')
  }

  const percent = Math.round((spent / budget) * 100)
  const status = budgetStatus(percent)

  return {
    id: nonEmptyString(item.id, 'budget.id'),
    name: nonEmptyString(item.name, 'budget.name'),
    icon: resolveIcon(item.icon, item.kind),
    spent,
    budget,
    percent,
    status,
    note: percent >= 90 && percent < 100 ? 'Mendekati limit' : undefined
  }
}

function isUrgent(dueDate: Date, today: Date): boolean {
  const startOfDay = (date: Date): number =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

  return (startOfDay(dueDate) - startOfDay(today)) / 86400000 <= URGENT_WITHIN_DAYS
}

function mapBill(item: LaravelBillItem, today: Date): DashboardUpcomingBill {
  const dueDate = validDate(item.due_date, 'bill.due_date')

  return {
    id: nonEmptyString(item.id, 'bill.id'),
    title: nonEmptyString(item.title, 'bill.title'),
    icon: resolveIcon(item.icon, item.kind),
    dueLabel: `Jatuh tempo ${formatShortDate(dueDate)}`,
    amount: finiteNumber(item.amount, 'bill.amount'),
    urgent: isUrgent(dueDate, today)
  }
}

function mapTransaction(item: LaravelTransactionItem): DashboardTransaction {
  if (item.direction !== 'in' && item.direction !== 'out') {
    throw invalidPayload('transaction.direction tidak dikenal')
  }

  const direction: TransactionDirection = item.direction

  return {
    id: nonEmptyString(item.id, 'transaction.id'),
    title: nonEmptyString(item.title, 'transaction.title'),
    icon: resolveIcon(item.icon, item.kind),
    dateLabel: formatFullDate(validDate(item.occurred_at, 'transaction.occurred_at')),
    wallet: nonEmptyString(item.wallet, 'transaction.wallet'),
    amount: finiteNumber(item.amount, 'transaction.amount'),
    direction
  }
}

function mapMaintenance(item: LaravelMaintenanceItem): DashboardMaintenance {
  if (item.priority !== 'tinggi' && item.priority !== 'sedang' && item.priority !== 'rutin') {
    throw invalidPayload('maintenance.priority tidak dikenal')
  }

  const priority: MaintenancePriority = item.priority

  return {
    id: nonEmptyString(item.id, 'maintenance.id'),
    title: nonEmptyString(item.title, 'maintenance.title'),
    priority,
    dateLabel: formatShortDate(validDate(item.scheduled_date, 'maintenance.scheduled_date')),
    location: nonEmptyString(item.location, 'maintenance.location')
  }
}

function requireArray<T>(value: unknown, field: string): T[] {
  if (!Array.isArray(value)) {
    throw invalidPayload(`field ${field} bukan array`)
  }

  return value as T[]
}

export function mapCashFlowStatus(value: string): CashFlowStatus {
  if (value === 'surplus' || value === 'defisit' || value === 'seimbang') {
    return value
  }

  throw invalidPayload('financial.cash_flow_status tidak dikenal')
}

// Payload malformed (bukan error jaringan) tetap melempar Error agar
// composable menampilkannya sebagai state error — tidak pernah diisi
// fixture atau nilai karangan.
export function mapDashboardResponse(
  payload: LaravelDashboardPayload,
  today: Date = new Date()
): DashboardResponse {
  if (!payload || typeof payload !== 'object') {
    throw invalidPayload('payload kosong')
  }

  const year = finiteNumber(payload.period?.year, 'period.year')
  const month = finiteNumber(payload.period?.month, 'period.month')
  const key = nonEmptyString(payload.period?.key, 'period.key')
  const financial = payload.financial ?? {}

  return {
    period: { key, label: formatMonthLabel(year, month) },
    financial: {
      income: finiteNumber(financial.income, 'financial.income'),
      expense: finiteNumber(financial.expense, 'financial.expense'),
      netCashFlow: finiteNumber(financial.net_cash_flow, 'financial.net_cash_flow'),
      incomeChangePercent: finiteNumber(financial.income_change_percent, 'financial.income_change_percent'),
      budgetUsagePercent: finiteNumber(financial.budget_usage_percent, 'financial.budget_usage_percent'),
      cashFlowStatus: mapCashFlowStatus(typeof financial.cash_flow_status === 'string' ? financial.cash_flow_status : '')
    },
    budget: requireArray<LaravelBudgetItem>(payload.budget, 'budget').map(mapBudgetCategory),
    upcomingBills: requireArray<LaravelBillItem>(payload.upcoming_bills, 'upcoming_bills')
      .map(item => mapBill(item, today)),
    recentTransactions: requireArray<LaravelTransactionItem>(payload.recent_transactions, 'recent_transactions')
      .map(mapTransaction),
    maintenance: requireArray<LaravelMaintenanceItem>(payload.maintenance, 'maintenance')
      .map(mapMaintenance)
  }
}
