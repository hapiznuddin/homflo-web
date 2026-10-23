// Kontrak API Obligations kendaraan (mirror presenter
// VehicleObligationController::presentObligation dan
// ObligationTypeController::presentType, Phase 16.4.5).
//
// Obligations adalah resource administratif terpisah dari Bills: tidak ada
// paid_at, payment_status, recurrence, atau status turunan dari due_date.
// Status yang dikenal hanya active/inactive dan selalu berasal dari server.
// vehicle_id dikirim backend tetapi tidak pernah dibentuk dari browser —
// kendaraan berasal dari nested route + konteks session.

export type VehicleObligationStatus = 'active' | 'inactive'

/** Potongan jenis yang ditempel pada setiap obligation. */
export interface ObligationTypeSummary {
  id: string
  /** Kode stabil hanya untuk tipe bawaan; null untuk custom. */
  code: string | null
  name: string
  is_system: boolean
}

export interface VehicleObligationItem {
  id: string
  vehicle_id: string
  obligation_type: ObligationTypeSummary
  title: string
  description: string | null
  /** Format Y-m-d; null bila tidak dicatat. */
  issued_date: string | null
  /** Format Y-m-d; wajib di backend. */
  due_date: string
  /** Desimal sebagai string (mis. "250000.00"); null bila tidak dicatat. */
  amount: string | null
  /** Status administratif server; tidak pernah dihitung ulang dari tanggal. */
  status: VehicleObligationStatus
  created_at: string
  updated_at: string
}

export interface VehicleObligationFormValues {
  /** ULID tipe yang tersedia untuk household kendaraan. */
  obligation_type_id: string
  /** Wajib, maksimal 255 karakter. */
  title: string
  /** Opsional, maksimal 5000 karakter. */
  description: string
  /** Opsional, format Y-m-d. */
  issued_date: string
  /** Wajib, format Y-m-d. */
  due_date: string
  /** Input pengguna sebagai teks; string kosong = nominal tidak dicatat. */
  amount: string
  /** Hanya dikirim saat update; create selalu active dari server. */
  status: VehicleObligationStatus
}

export interface ObligationTypeItem {
  id: string
  /** null untuk tipe sistem; ID household untuk tipe custom. */
  household_id: string | null
  /** Kode stabil hanya untuk tipe bawaan; null untuk custom. */
  code: string | null
  name: string
  is_system: boolean
  created_at: string
  updated_at: string
}

export interface ObligationTypeFormValues {
  /** Wajib, maksimal 255 karakter. */
  name: string
}
