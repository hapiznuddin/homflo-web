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

export interface WalletLink {
  id: string
  name: string
  type: string
  is_active: boolean
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
   * ID dompet sumber posting (presenter: `wallet_id`) — null untuk baris
   * legacy sebelum dompet. Dipakai prefill select dompet saat edit.
   */
  wallet_id?: string | null
  /**
   * ID dompet tujuan — hanya terisi untuk transfer (presenter backend);
   * null untuk income/expense. Konversi tipe saat edit mengirim key ini
   * secara eksplisit (id‖null) sesuai kontrak TransactionService::change.
   */
  destination_wallet_id?: string | null
  /** Tautan dompet sumber {id,name,type,is_active} dari presenter. */
  source_wallet?: WalletLink | null
  /** Tautan dompet tujuan — hanya untuk transfer. */
  destination_wallet?: WalletLink | null
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
   * ID dompet sumber dari Wallet API (ULID) — sumber posting
   * sesungguhnya (StoreTransactionRequest mewajibkannya untuk create);
   * '' = belum dipilih. Pemindahan dompet saat edit didukung backend
   * (UpdateTransactionRequest: `wallet_id sometimes`).
   */
  wallet_id: string
  /**
   * ID dompet tujuan — HANYA untuk transfer (StoreTransactionRequest:
   * `prohibited_unless:type,transfer` + `required_if`); '' = belum
   * dipilih/tidak berlaku. Untuk PATCH, key selalu dikirim (id‖null)
   * agar konversi transfer→non-transfer menghapus tujuan lama.
   */
  destination_wallet_id: string
  /** ID kategori dari API; '' berarti tanpa kategori (didukung backend). */
  category_id: string
}
