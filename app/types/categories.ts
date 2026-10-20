// Kontrak Categories API (mirror presenter backend
// CategoryController::presentCategory). List tidak dipaginasi
// (array terurut nama); hanya field yang dibutuhkan UI.

export interface CategoryItem {
  id: string
  name: string
  icon: string | null
  /**
   * Jenis kategori dari backend (presentCategory mengirimkannya).
   * null = kategori legacy tanpa tipe — ditolak backend untuk bill
   * (CATEGORY_TYPE_MISMATCH), jadi tidak ditawarkan pada form Bills.
   */
  type?: 'expense' | 'income' | null
}

export interface CategoryFormValues {
  name: string
  /** Identifier ikon bebas (mis. "i-lucide-tag"); kosong = tanpa ikon. */
  icon: string
  /** Jenis kategori: 'income' atau 'expense'. Wajib diisi. */
  type: 'income' | 'expense'
}
