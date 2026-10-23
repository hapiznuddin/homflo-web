// Kontrak Vehicle Maintenance API (mirror presenter
// VehicleMaintenanceController::presentMaintenance). List tidak dipaginasi dan
// sudah diurutkan backend (scheduled_date lalu id) — UI memakai urutan server
// apa adanya. Lifecycle MVP hanya scheduled/completed dan diturunkan
// server-side dari completed_at; tidak ada status cancelled.
//
// vehicle_id dikirim backend tetapi tidak pernah dibentuk dari browser:
// kendaraan berasal dari nested route + konteks session. completed_at/status
// hanya berubah lewat aksi Complete backend.

export type VehicleMaintenanceStatus = 'scheduled' | 'completed'

/** Filter daftar dilakukan client-side (endpoint list belum mendukung query status). */
export type VehicleMaintenanceFilter = 'all' | VehicleMaintenanceStatus

export interface VehicleMaintenanceItem {
  id: string
  vehicle_id: string
  title: string
  description: string | null
  /** Format Y-m-d; null bila tidak tercatat. */
  scheduled_date: string | null
  /** Format Y-m-d; null kecuali status completed. */
  completed_at: string | null
  odometer: number | null
  /** Diturunkan backend; tidak pernah dikirim pengguna. */
  status: VehicleMaintenanceStatus
  created_at: string
  updated_at: string
}

export interface VehicleMaintenanceFormValues {
  /** Wajib, string maksimal 255 karakter. */
  title: string
  /** Opsional, string maksimal 5000 karakter. */
  description: string
  /** Wajib saat create; format Y-m-d sesuai API. */
  scheduled_date: string
  /** Input pengguna sebagai teks; string kosong = odometer tidak dicatat. */
  odometer: string
}
