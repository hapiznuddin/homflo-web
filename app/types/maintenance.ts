// Kontrak Maintenance API (mirror presenter MaintenanceController::presentMaintenance).
// List tidak dipaginasi dan sudah diurutkan backend (scheduled_date lalu id) —
// UI memakai urutan server apa adanya. `status` diturunkan server-side dari
// timestamp lifecycle; completed_at/cancelled_at bertipe date (Y-m-d) atau null.
// asset_id null bila aset dihapus (ON DELETE SET NULL).

export type MaintenancePriority = 'tinggi' | 'sedang' | 'rutin'

export type MaintenanceStatus = 'scheduled' | 'completed' | 'cancelled'

/** Filter daftar dilakukan client-side (endpoint list belum mendukung query status). */
export type MaintenanceFilter = 'all' | MaintenanceStatus

export interface MaintenanceItem {
  id: string
  household_id: string
  /** Null bila aset sudah dihapus dari rumah tangga. */
  asset_id: string | null
  title: string
  description: string | null
  location: string
  /** Format Y-m-d; null bila tidak tercatat. */
  scheduled_date: string | null
  /** Format Y-m-d; null kecuali status completed. */
  completed_at: string | null
  /** Format Y-m-d; null kecuali status cancelled. */
  cancelled_at: string | null
  priority: MaintenancePriority
  /** Diturunkan backend; tidak pernah dikirim pengguna. */
  status: MaintenanceStatus
  created_at: string
  updated_at: string
}

export interface MaintenanceFormValues {
  /** ULID aset rumah tangga yang sama; wajib. */
  asset_id: string
  title: string
  description: string
  location: string
  /** Format Y-m-d; string kosong = tidak diisi. */
  scheduled_date: string
  priority: MaintenancePriority
}
