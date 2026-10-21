// Kontrak Transactions API (mirror presenter backend
// TransactionController::presentTransaction). Amount adalah STRING desimal
// ("150000.50") — UI hanya memformat untuk tampilan, tidak pernah
// berhitung dengan float. Tidak ada agregat di sisi klien.

// Termasuk 'transfer' sejak Phase 15.2.1 — backend selalu mendukung
// tiga tipe (StoreTransactionRequest: in:income,expense,transfer);
// transfer tidak pernah direpresentasikan sebagai income maupun expense.
export type TransactionType = 'income' | 'expense' | 'transfer'

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
  /**
   * Tautan morph sumber bill (D-08, selalu dikirim backend): non-null
   * berarti baris ini pembayaran tagihan — TIDAK boleh menawarkan
   * edit/hapus generik (guard backend BILL_PAYMENT_LOCKED tetap
   * otoritas; penyembunyian aksi hanya UX).
   */
  bill_payment: { bill_id: string, bill_title: string } | null
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
  /** Nama dompet (kolom legacy tampilan) — bukan identifier posting. */
  wallet: string
  /**
   * ID dompet dari Wallet API (ULID) — sumber posting sesungguhnya
   * (StoreTransactionRequest mewajibkannya untuk create); '' = belum
   * dipilih. Pemindahan dompet saat edit menyusul di fase transfer.
   */
  wallet_id: string
  /** ID kategori dari API; '' berarti tanpa kategori (didukung backend). */
  category_id: string
}
