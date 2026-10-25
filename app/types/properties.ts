// Kontrak Properties API (mirror presenter PropertyController::presentProperty).
// List default hanya menampilkan Property aktif (archived_at IS NULL).
// include_archived=true menampilkan Property aktif + arsip.
// Nama Property tidak harus unik.
// ULID primary key. household_id ditetapkan server-side.
// ownership_status: hanya 'owned' atau 'rented'.
// type: hanya 'house', 'apartment', 'land', 'shophouse', 'other'.

export type PropertyType = 'house' | 'apartment' | 'land' | 'shophouse' | 'other'
export type PropertyOwnershipStatus = 'owned' | 'rented'

export interface PropertyItem {
  id: string
  household_id: string
  name: string
  type: PropertyType
  address: string
  description: string | null
  ownership_status: PropertyOwnershipStatus
  notes: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface PropertyFormValues {
  name: string
  /** Belum dipilih = undefined agar placeholder select tampil; backend tetap otoritas validasi. */
  type?: PropertyType
  address: string
  ownership_status?: PropertyOwnershipStatus
  description: string
  notes: string
}

export interface PropertyFilters {
  /** Default hanya aktif; include_archived=true menampilkan aktif + arsip. */
  include_archived?: boolean
}
