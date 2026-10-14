// Kontrak Categories API (mirror presenter backend
// CategoryController::presentCategory). List tidak dipaginasi
// (array terurut nama); hanya field yang dibutuhkan UI.

export interface CategoryItem {
  id: string
  name: string
  icon: string | null
}

export interface CategoryFormValues {
  name: string
  /** Identifier ikon bebas (mis. "i-lucide-tag"); kosong = tanpa ikon. */
  icon: string
}
