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
  /** Null = active; terisi = completed */
  completed_at: string | null
  /** Diisi server saat completion; dikosongkan saat uncomplete */
  completed_by: { id: string; name: string } | null
  /** user yang membuat item; server-side dari sesi */
  created_by: { id: string; name: string } | null
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

export interface ListItemExpense {
  /** Transaction presenter shape */
  id: string
  type: string
  amount: string
  occurred_on: string
  wallet_id: string | null
  description: string | null
  source_type: string
  source_id: string
  household_id: string
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

/** Respon GET /api/lists/{list}/items */
export interface ListItemsResponse {
  data: ListItem[]
  meta?: { total: number; last_page: number }
}

/** Respon POST /api/lists/{list}/items/{item}/expense */
export interface ListItemExpenseResponse {
  data: ListItemExpense
}

/** Error codes sesuai kontrak */
export const LIST_ERROR_CODES = {
  ARCHIVED: 'LIST_ARCHIVED',
  NOT_FOUND: 'LIST_NOT_FOUND',
  ITEM_NOT_FOUND: 'LIST_ITEM_NOT_FOUND',
  ALREADY_COMPLETED: 'LIST_ITEM_ALREADY_COMPLETED',
  NOT_COMPLETED: 'LIST_ITEM_NOT_COMPLETED',
  PRICE_LOCKED: 'LIST_ITEM_PRICE_LOCKED',
  ACTUAL_PRICE_REQUIRED: 'LIST_ITEM_ACTUAL_PRICE_REQUIRED'
} as const

export type ListErrorCode = typeof LIST_ERROR_CODES[keyof typeof LIST_ERROR_CODES]
