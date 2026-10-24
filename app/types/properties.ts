// Kontrak Properties API (mirror presenter PropertyController::presentProperty).
// List default hanya menampilkan Property aktif (archived_at IS NULL).
// include_archived=true menampilkan Property aktif + arsip.
// Nama Property tidak harus unik.
// ULID primary key. household_id ditetapkan server-side.
// ownership_status: only 'owned' atau 'rented'.
// type: only 'house', 'apartment', 'land', 'shophouse', 'other'.

export interface PropertyItem {
  id: string
  household_id: string
  name: string
  type: string
  address: string
  description: string | null
  ownership_status: string
  notes: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface PropertyFormValues {
  name: string
  type: string
  address: string
  ownership_status: string
  description: string
  notes: string
}

export interface PropertyFilters {
  /** Default hanya aktif; include_archived=true menampilkan aktif + arsip. */
  include_archived?: boolean
}
