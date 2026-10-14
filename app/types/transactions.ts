// Kontrak Transactions API (mirror presenter backend
// TransactionController::presentTransaction). Amount adalah STRING desimal
// ("150000.50") — UI hanya memformat untuk tampilan, tidak pernah
// berhitung dengan float. Tidak ada agregat di sisi klien.

export type TransactionType = 'income' | 'expense'

export interface TransactionCategory {
  id: string
  name: string
  icon: string | null
}

export interface TransactionItem {
  id: string
  household_id: string
  type: TransactionType
  /** String desimal eksak dari backend, mis. "150000.50". */
  amount: string
  /** Format Y-m-d. */
  occurred_on: string
  description: string | null
  wallet: string | null
  category: TransactionCategory | null
  created_at: string
  updated_at: string
}

export interface TransactionListMeta {
  current_page: number
  per_page: number
  total: number
  last_page: number
}

export interface TransactionListData {
  data: TransactionItem[]
  meta: TransactionListMeta
}

export interface TransactionFilters {
  date_from?: string
  date_to?: string
  category_id?: string
  type?: TransactionType
  sort_by?: 'occurred_on' | 'amount' | 'created_at'
  sort_dir?: 'asc' | 'desc'
  per_page?: number
  page?: number
}

export interface TransactionFormValues {
  type: TransactionType
  /** Input mentah pengguna, mis. "150000" atau "150000,50". */
  amount: string
  occurred_on: string
  description: string
  wallet: string
  /** ID kategori dari API; '' berarti tanpa kategori (didukung backend). */
  category_id: string
}
