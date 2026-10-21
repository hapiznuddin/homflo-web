// Kontrak Budgets API (mirror presenter backend
// BudgetController::presentBudget): target anggaran (CRUD) + field
// derivasi usage Phase 12 (BudgetService::deriveFor). Nilai usage
// dihitung SERVER per periode tampilan dan dipakai APA ADANYA — UI
// dilarang menghitung ulang agregasi/status (Phase 15.3.1).
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
  /** Penggunaan aktual periode tampilan, dihitung server ("250000.00"). */
  actual_spending: string
  /** amount - actual_spending; BISA NEGATIF saat over-budget ("-75000.00"). */
  remaining: string
  /** Persentase server; null saat amount nol (no_budget) — jangan dipaksa jadi 0. */
  usage_percentage: number | null
  /** Status server: 'normal' | 'no_budget'. Bukan klasifikasi client. */
  usage_status: 'normal' | 'no_budget'
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
