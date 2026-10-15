// Kontrak Budgets API (mirror presenter backend
// BudgetController::presentBudget). Hanya target anggaran (CRUD).
// TIDAK ada spent/remaining/percent — API tidak menyediakannya dan UI
// dilarang menghitungnya (Phase 8).
// Amount adalah STRING desimal ("500000.00") — hanya untuk tampilan.

export interface BudgetCategory {
  id: string
  name: string
  icon: string | null
}

export interface BudgetItem {
  id: string
  household_id: string
  category: BudgetCategory | null
  year: number
  month: number
  /** String desimal eksak dari backend, mis. "500000.00". */
  amount: string
  created_at: string
  updated_at: string
}

export interface BudgetFilters {
  year?: number
  month?: number
}

export interface BudgetPeriod {
  year: number
  month: number
  /** Label id-ID, mis. "Oktober 2026". */
  label: string
}

export interface BudgetFormValues {
  /** ID kategori dari API; '' berarti belum dipilih (wajib diisi). */
  category_id: string
  /** String mentah dari input; dikonversi ke integer saat submit. */
  year: string
  /** String mentah dari input; dikonversi ke integer saat submit. */
  month: string
  /** Input mentah pengguna, mis. "500000" atau "500000,50". */
  amount: string
}
