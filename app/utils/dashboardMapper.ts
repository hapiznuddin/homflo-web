// Mapper terpusat: GET /api/dashboard (Laravel, snake_case) -> DashboardResponse
// (model UI). Satu-satunya tempat transformasi response dashboard; komponen
// tidak boleh mem-parse payload API sendiri.

import type {
  BudgetStatus,
  CashFlowStatus,
  DashboardBudgetCategory,
  DashboardDataAvailability,
  DashboardFinancialSummary,
  DashboardMaintenance,
  DashboardResponse,
  DashboardTransaction,
  DashboardUpcomingBill,
  MaintenancePriority,
  TransactionDirection
} from '~/types/dashboard'
import { formatFullDate, formatMonthLabel, formatRupiah, formatShortDate } from '~/utils/format'

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

// ---------------------------------------------------------------------------
// Bentuk response endpoint Budgets (Phase 12): target + turunan yang
// dihitung server. Tidak ada penjumlahan ulang di sini — nilai dipakai
// apa adanya untuk tampilan.
// ---------------------------------------------------------------------------

export interface LaravelBudgetApiCategory {
  id: string
  name: string
  icon: string | null
}

export interface LaravelBudgetApiItem {
  id: string
  household_id: string
  category: LaravelBudgetApiCategory | null
  year: number
  month: number
  amount: string
  actual_spending: string
  remaining: string
  /** number (int maupun float) atau null untuk budget nol. */
  usage_percentage: number | null
  usage_status: string
  created_at: string
  updated_at: string
}

export interface LaravelBudgetsPayload {
  data: LaravelBudgetApiItem[]
  meta?: {
    period?: { year: number, month: number }
    household?: { actual_spending: string }
  }
}

// ---------------------------------------------------------------------------
// Bentuk response endpoint Transactions (Phase 5): daftar terurut
// terbaru. Dipakai apa adanya untuk tampilan.
// ---------------------------------------------------------------------------

export interface LaravelTransactionApiItem {
  id: string
  household_id: string
  type: string
  /** String desimal eksak, mis. "150000.50". */
  amount: string
  /** Format Y-m-d. */
  occurred_on: string
  description: string | null
  wallet: string | null
  category: LaravelBudgetApiCategory | null
  created_at: string
  updated_at: string
}

export interface LaravelTransactionsPayload {
  data: LaravelTransactionApiItem[]
  meta: { current_page: number, per_page: number, total: number, last_page: number }
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

// String desimal eksak backend ("150000.50", boleh negatif untuk
// remaining). Hanya divalidasi bentuknya; nilai dipakai apa adanya
// untuk tampilan tanpa aritmetika ulang.
function decimalString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^-?\d+(\.\d{1,2})?$/.test(value)) {
    throw invalidPayload(`field ${field} bukan string desimal valid`)
  }

  return value
}

// Satu item budget dari endpoint Budgets (Phase 12) -> kartu budget
// dashboard. Persen dan status dipakai apa adanya dari server; tidak
// ada penjumlahan atau perhitungan ulang di sini.
export function mapBudgetApiItem(item: LaravelBudgetApiItem): DashboardBudgetCategory {
  if (item.usage_status !== 'normal' && item.usage_status !== 'no_budget') {
    throw invalidPayload('budget.usage_status tidak dikenal')
  }

  const spent = decimalString(item.actual_spending, 'budget.actual_spending')
  const budget = decimalString(item.amount, 'budget.amount')
  const remaining = decimalString(item.remaining, 'budget.remaining')

  if (item.category === null) {
    throw invalidPayload('budget.category kosong')
  }

  const name = nonEmptyString(item.category.name, 'budget.category.name')
  const icon = item.category.icon && item.category.icon.length > 0
    ? item.category.icon
    : DEFAULT_ICON

  if (item.usage_status === 'no_budget') {
    if (item.usage_percentage !== null) {
      throw invalidPayload('budget no_budget harus bernilai null')
    }

    const remainingNumber = Number(remaining)
    const remainingNote = remainingNumber >= 0
      ? `Sisa ${formatRupiah(remainingNumber)}`
      : `Lebih ${formatRupiah(-remainingNumber)}`

    return {
      id: nonEmptyString(item.id, 'budget.id'),
      name,
      icon,
      spent: Number(spent),
      budget: Number(budget),
      percent: 0,
      status: 'normal',
      note: `Tanpa target · ${remainingNote}`
    }
  }

  const percent = finiteNumber(item.usage_percentage, 'budget.usage_percentage')
  const status = budgetStatus(percent)
  const remainingNumber = Number(remaining)
  const remainingNote = remainingNumber >= 0
    ? `Sisa ${formatRupiah(remainingNumber)}`
    : `Lebih ${formatRupiah(-remainingNumber)}`

  return {
    id: nonEmptyString(item.id, 'budget.id'),
    name,
    icon,
    spent: Number(spent),
    budget: Number(budget),
    percent,
    status,
    note: percent >= 90 && percent < 100
      ? `Mendekati limit · ${remainingNote}`
      : remainingNote
  }
}

// Satu item transaksi dari endpoint Transactions (Phase 5) -> baris
// transaksi dashboard. Judul dan ikon diturunkan untuk tampilan saja;
// nominal dipakai apa adanya tanpa agregasi.
export function mapTransactionApiItem(item: LaravelTransactionApiItem): DashboardTransaction {
  if (item.type !== 'income' && item.type !== 'expense') {
    throw invalidPayload('transaction.type tidak dikenal')
  }

  const direction: TransactionDirection = item.type === 'income' ? 'in' : 'out'
  const title = item.description && item.description.trim().length > 0
    ? item.description
    : item.category?.name ?? (direction === 'in' ? 'Pemasukan' : 'Pengeluaran')
  const icon = item.category?.icon && item.category.icon.length > 0
    ? item.category.icon
    : direction === 'in' ? 'i-lucide-trending-up' : 'i-lucide-trending-down'

  return {
    id: nonEmptyString(item.id, 'transaction.id'),
    title,
    icon,
    dateLabel: formatFullDate(validDate(item.occurred_on, 'transaction.occurred_on')),
    wallet: item.wallet && item.wallet.length > 0 ? item.wallet : '—',
    amount: Number(decimalString(item.amount, 'transaction.amount')),
    direction
  }
}

export interface DashboardFinanceMerge {
  budget: DashboardBudgetCategory[]
  recentTransactions: DashboardTransaction[]
  financial: DashboardFinancialSummary
  availability: DashboardDataAvailability
}

// Menggabungkan seksi finansial aktual ke read-model dashboard.
// - budget: dari endpoint Budgets (apa adanya, tanpa hitung ulang).
// - recentTransactions: dari endpoint Transactions (apa adanya).
// - expense: HANYA dari meta.household bila periodenya cocok dengan
//   periode yang diminta; selain itu ditandai tidak tersedia.
// - income/netCashFlow: selalu tidak tersedia (belum ada API agregat).
// - meta yang hilang/tak-cocok TIDAK pernah diganti penjumlahan
//   kategori (dilarang kontrak).
export function mapDashboardFinance(
  base: DashboardResponse,
  budgets: LaravelBudgetsPayload,
  transactions: LaravelTransactionsPayload,
  year: number,
  month: number
): DashboardFinanceMerge {
  const metaPeriod = budgets.meta?.period
  const metaTotal = budgets.meta?.household?.actual_spending
  const periodMatches = metaPeriod !== undefined
    && metaPeriod !== null
    && typeof metaPeriod.year === 'number'
    && typeof metaPeriod.month === 'number'
    && metaPeriod.year === year
    && metaPeriod.month === month
    && typeof metaTotal === 'string'

  const expenseAvailable = periodMatches && metaTotal !== undefined
  const expense = expenseAvailable ? Number(decimalString(metaTotal, 'meta.household.actual_spending')) : 0

  return {
    budget: requireArray<LaravelBudgetApiItem>(budgets.data, 'budgets.data').map(mapBudgetApiItem),
    recentTransactions: requireArray<LaravelTransactionApiItem>(transactions.data, 'transactions.data')
      .map(mapTransactionApiItem),
    financial: {
      ...base.financial,
      expense
    },
    availability: {
      income: false,
      expense: expenseAvailable,
      netCashFlow: false
    }
  }
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
      .map(mapMaintenance),
    // Agregat bawaan tidak membawa finansial terverifikasi; seksi
    // finansial aktual diisi mapDashboardFinance dari endpoint khusus.
    availability: { income: false, expense: false, netCashFlow: false }
  }
}
