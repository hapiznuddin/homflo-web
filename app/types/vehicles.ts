// Kontrak Vehicles API (mirror presenter VehicleController::presentVehicle).
// List tidak dipaginasi dan sudah diurutkan backend berdasarkan nama lalu
// id — UI memakai urutan server apa adanya. `plate_number` adalah nama field
// backend; UI memakai label "plat nomor" dan memetakannya secara eksplisit
// di batas request (composable -> payload).

export interface VehicleItem {
  id: string
  household_id: string
  name: string
  brand: string | null
  model: string | null
  year: number | null
  type: string | null
  plate_number: string | null
  odometer: number | null
  created_at: string
  updated_at: string
}

export interface VehicleFormValues {
  name: string
  brand: string
  model: string
  /** Input pengguna sebagai teks; string kosong = tahun tidak dicatat. */
  year: string
  /** Nilai UI (label plat nomor); dikirim sebagai `plate_number`. */
  license_plate: string
  type: string
  /** Input pengguna sebagai teks; string kosong = odometer tidak dicatat. */
  odometer: string
}
