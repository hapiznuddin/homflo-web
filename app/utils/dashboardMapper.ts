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
import { formatFullDate, formatMonthLabel, formatRupiah, formatShortDate } from '~/utils/format'

export interface LaravelDashboardPeriod {
  year: number
  month: number
  key: string
}

export interface LaravelDashboardFinancial {
  /** String desimal eksak backend, mis. "250000.75" (boleh negatif). */
  income: string
  /** String desimal eksak backend, mis. "50250.25". */
  expense: string
  /** String desimal eksak backend, boleh negatif, mis. "-50250.25". */
  net_cash_flow: string
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
    note: percent >= 90 && percent < 100 ? 'Mendekati limit' : undefined,
    // Jalur agregat lama selalu membawa target valid (budget > 0
    // divalidasi di atas), sehingga persentase aman ditampilkan.
    hasTarget: true
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

// meta.unsupported_domains dari kontrak GET /api/dashboard (Phase 14.2)
// — hanya DIBACA, kontrak API tidak diubah. Meta absen = daftar kosong
// (payload lama tanpa meta tetap valid); meta hadir tapi bukan array
// string = payload malformed -> melempar seperti field lain, bukan
// diabaikan diam-diam (prinsip "tidak pernah diisi karangan").
function parseUnsupportedDomains(meta: LaravelDashboardPayload['meta']): string[] {
  const domains = meta?.unsupported_domains

  if (domains === undefined) {
    return []
  }

  if (!Array.isArray(domains) || domains.some(domain => typeof domain !== 'string')) {
    throw invalidPayload('meta.unsupported_domains bukan array string')
  }

  return [...domains]
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
      // Placeholder yang tidak dirender: kategori tanpa target tidak boleh
      // menampilkan persentase numerik apa pun (lihat hasTarget + UI).
      percent: 0,
      status: 'normal',
      note: `Tanpa target · ${remainingNote}`,
      hasTarget: false
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
      : remainingNote,
    hasTarget: true
  }
}

// Satu item transaksi dari endpoint Transactions (Phase 5) -> baris
// transaksi dashboard. Judul dan ikon diturunkan untuk tampilan saja;
// nominal dipakai apa adanya tanpa agregasi. Validasi tipe tetap
// eksplisit: hanya income, expense, dan transfer (perpindahan antar
// dompet, Phase 15.1) yang diterima — tipe lain MELEMPAR, tidak pernah
// diisi karangan.

const TYPE_FALLBACK: Record<TransactionDirection, { title: string, icon: string }> = {
  in: { title: 'Pemasukan', icon: 'i-lucide-trending-up' },
  out: { title: 'Pengeluaran', icon: 'i-lucide-trending-down' },
  transfer: { title: 'Transfer', icon: 'i-lucide-arrow-right-left' }
}

export function mapTransactionApiItem(item: LaravelTransactionApiItem): DashboardTransaction {
  if (item.type !== 'income' && item.type !== 'expense' && item.type !== 'transfer') {
    throw invalidPayload('transaction.type tidak dikenal')
  }

  // Transfer punya arah sendiri ('transfer'): bukan 'in', bukan 'out',
  // sehingga tidak pernah ikut warna/diarahkan sebagai income/expense.
  // Agregat finansial tidak disentuh di sini — sepenuhnya dari blok
  // financial GET /api/dashboard (lihat mapDashboardResponse).
  const direction: TransactionDirection = item.type === 'income'
    ? 'in'
    : item.type === 'expense' ? 'out' : 'transfer'
  const fallback = TYPE_FALLBACK[direction]
  const title = item.description && item.description.trim().length > 0
    ? item.description
    : item.category?.name ?? fallback.title
  const icon = item.category?.icon && item.category.icon.length > 0
    ? item.category.icon
    : fallback.icon

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
}

// Menggabungkan seksi finansial aktual ke read-model dashboard.
// - budget: dari endpoint Budgets (apa adanya, tanpa hitung ulang).
// - recentTransactions: dari endpoint Transactions (apa adanya).
// - income/expense/netCashFlow/cash_flow_status: sepenuhnya dari blok
//   financial GET /api/dashboard (sudah divalidasi mapDashboardResponse).
//   Meta budgets TIDAK dipakai sebagai sumber KPI expense — hanya
//   konteks Budget. Tidak ada penjumlahan kategori di klien.
export function mapDashboardFinance(
  base: DashboardResponse,
  budgets: LaravelBudgetsPayload,
  transactions: LaravelTransactionsPayload
): DashboardFinanceMerge {
  return {
    budget: requireArray<LaravelBudgetApiItem>(budgets.data, 'budgets.data').map(mapBudgetApiItem),
    recentTransactions: requireArray<LaravelTransactionApiItem>(transactions.data, 'transactions.data')
      .map(mapTransactionApiItem)
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

  // Nominal finansial dikirim backend sebagai string desimal eksak
  // (Phase 14.2.1). Diparse dan divalidasi di sini; konversi number
  // hanya untuk model presentasi — tanpa aritmetika ulang di klien.
  // Gagal parse = melempar -> composable menampilkan error state,
  // bukan angka nol palsu.
  return {
    period: { key, label: formatMonthLabel(year, month) },
    financial: {
      income: Number(decimalString(financial.income, 'financial.income')),
      expense: Number(decimalString(financial.expense, 'financial.expense')),
      netCashFlow: Number(decimalString(financial.net_cash_flow, 'financial.net_cash_flow')),
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
    // Blok financial tervalidasi penuh di atas (income/expense/net +
    // union status) sehingga ketiga KPI agregat resmi tersedia. Nilai
    // nol yang tampil berikutnya adalah nol terverifikasi backend.
    availability: { income: true, expense: true, netCashFlow: true },
    // Status unsupported vs kosong (Phase 15.1): daftar dari meta yang
    // sudah ada pada kontrak Phase 14.2 — hanya dibaca, tidak diubah.
    unsupportedDomains: parseUnsupportedDomains(payload.meta)
  }
}
