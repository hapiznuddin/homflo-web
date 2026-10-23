// Kontrak Assets API (mirror presenter AssetController::presentAsset).
// List tidak dipaginasi dan sudah diurutkan backend berdasarkan nama —
// UI memakai urutan server apa adanya. acquisition_cost adalah STRING
// desimal dua digit atau null; UI hanya memformat untuk tampilan.

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
}

export interface AssetFormValues {
  name: string
  description: string
  location: string
  /** Format Y-m-d; string kosong = tidak diisi. */
  acquired_on: string
  /** Input pengguna; dinormalisasi ke dot-form sebelum dikirim. */
  acquisition_cost: string
}
