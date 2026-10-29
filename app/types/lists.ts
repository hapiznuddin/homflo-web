// Kontrak Lists API (mirror presenter backend ListController::presentList
// + ListItem presenter + Expense integration §8). Semua ID ULID string.
// Browser tidak pernah memanggil Laravel langsung; semua request lewat proxy Nuxt /api.

export interface ListSummary {
  /** ULID string */
  id: string
  household_id: string
  name: string
  type: 'shopping' | 'custom'
  /** Ditunggu dari households.default_list_id, bukan kolom list */
  is_default: boolean
  archived_at: string | null
  counts: {
    active: number
    completed: number
  }
  /** null bila data legacy tanpa attribution; presenter boleh menampilkan {id, name} */
  created_by: { id: string; name: string } | null
  created_at: string
  updated_at: string
}

export type ListItemStatus = 'active' | 'completed'

/** Ringkasan Expense yang menempel pada satu item (contract ListExpenseLink). */
export interface ListExpenseLink {
  id: string
  amount: string
  occurred_on: string
  wallet: { id: string; name: string; type: string; is_active: boolean } | null
  category: { id: string; name: string; icon: string | null } | null
  created_at: string
}

export interface ListItem {
  /** ULID string */
  id: string
  list_id: string
  title: string
  /** nullable = not specified; bukan 0 */
  quantity: string | null
  /** varchar(20) bebas teks; AMD-02/03/04: di-copy persis dari legacy, tidak dinormalisasi */
  unit: string | null
  /** nullable - opsional; diisi saat completion */
  estimated_price: string | null
  /** Snapshot harga aktual; hanya diisi saat completed. Terkunci setelah Expense ada (A-19, AMD-05). */
  actual_price: string | null
  /** Turunan server dari completed_at; bukan kolom terpisah. */
  status: ListItemStatus
  /** Null = active; terisi = completed */
  completed_at: string | null
  /** Diisi server saat completion; dikosongkan saat uncomplete */
  completed_by: { id: string; name: string } | null
  /** user yang membuat item; server-side dari sesi */
  created_by: { id: string; name: string } | null
  /** Expense yang terhubung ke item ini; maksimal satu per item. */
  expense: ListExpenseLink | null
  created_at: string
  updated_at: string
}

export interface ListItemFormValues {
  title: string
  /** Optional/nullable sesuai StoreListItemRequest; omitted = not specified. */
  quantity?: string | null
  unit?: string | null
  estimated_price?: string | null
}

export interface ListCreateFormValues {
  name: string
  /** Required by POST /api/lists; immutable after create. */
  type: 'shopping' | 'custom'
}

// Tidak ada field dari client — archived_at di-set server-side.
export type ListArchiveFormValues = Record<string, never>

/** Bentuk TransactionItem penuh yang dikembalikan endpoint Expense. */
export interface ListItemExpense {
  id: string
  household_id: string
  type: string
  amount: string
  occurred_on: string
  description: string | null
  wallet: string | null
  wallet_id: string | null
  destination_wallet_id: string | null
  source_wallet: { id: string; name: string; type: string; is_active: boolean } | null
  destination_wallet: { id: string; name: string; type: string; is_active: boolean } | null
  category: { id: string; name: string; icon: string | null } | null
  bill_payment: { bill_id: string; bill_title: string } | null
  created_at: string
  updated_at: string
}

/** Input endpoint Expense; amount selalu diturunkan server dari actual_price. */
export interface ListItemExpenseInput {
  wallet_id: string
  category_id?: string | null
  occurred_on?: string | null
  /** Override atomik atas snapshot actual_price item. */
  actual_price?: string | null
}

/** Respon GET /api/lists */
export interface ListsResponse {
  data: ListSummary[]
  meta?: { total: number; last_page: number }
}

/** Respon GET /api/lists/{list} */
export interface ListDetailResponse {
  data: ListSummary
}

/** Respon GET /api/lists/{list}/items — selalu dua grup, bukan array datar. */
export interface ListItemsResponse {
  list_id: string
  counts: { active: number; completed: number }
  active: ListItem[]
  completed: ListItem[]
}

/** Respon POST /api/lists/{list}/items/{item}/expense (201 created / 200 idempotent). */
export interface ListItemExpenseResponse {
  created: boolean
  expense: ListItemExpense
  item: ListItem
}

/** Error codes sesuai kontrak */
export const LIST_ERROR_CODES = {
  ARCHIVED: 'LIST_ARCHIVED',
  NOT_FOUND: 'LIST_NOT_FOUND',
  ITEM_NOT_FOUND: 'LIST_ITEM_NOT_FOUND',
  ITEM_HAS_EXPENSE: 'LIST_ITEM_HAS_EXPENSE',
  ALREADY_COMPLETED: 'LIST_ITEM_ALREADY_COMPLETED',
  NOT_COMPLETED: 'LIST_ITEM_NOT_COMPLETED',
  PRICE_LOCKED: 'LIST_ITEM_PRICE_LOCKED',
  ACTUAL_PRICE_REQUIRED: 'LIST_ITEM_ACTUAL_PRICE_REQUIRED',
  EXPENSE_LOCKED: 'LIST_EXPENSE_LOCKED'
} as const

export type ListErrorCode = typeof LIST_ERROR_CODES[keyof typeof LIST_ERROR_CODES]
