// Kontrak Assets API (mirror presenter AssetController::presentAsset).
// List tidak dipaginasi dan sudah diurutkan backend berdasarkan nama —
// UI memakai urutan server apa adanya. acquisition_cost adalah STRING
// desimal dua digit atau null; UI hanya memformat untuk tampilan.
// property_id/property ditambahkan di akhir kontrak (Phase 16.5.5.2).

/** Ringkasan Property nested pada response Asset; bukan payload write. */
export interface AssetPropertySummary {
  id: string
  name: string
  /** null = Property aktif; timestamp = Property diarsipkan. */
  archived_at: string | null
}

export interface AssetItem {
  id: string
  household_id: string
  name: string
  description: string | null
  location: string | null
  /** Format Y-m-d; null = tanggal perolehan tidak dicatat. */
  acquired_on: string | null
  /** String desimal eksak dari backend, mis. "4500000.00"; null = tidak dicatat. */
  acquisition_cost: string | null
  created_at: string
  updated_at: string
  property_id: string | null
  property: AssetPropertySummary | null
}

export interface AssetFormValues {
  name: string
  description: string
  location: string
  /** Format Y-m-d; string kosong = tidak diisi. */
  acquired_on: string
  /** Input pengguna; dinormalisasi ke dot-form sebelum dikirim. */
  acquisition_cost: string
  /**
   * ULID Property aktif atau sentinel `none` untuk "Tanpa properti".
   * Composable memetakan sentinel/string kosong menjadi null.
   */
  property_id: string
}
