import type {
  ObligationTypeItem,
  VehicleObligationItem,
  VehicleObligationStatus
} from '~/types/vehicleObligations'

// Helper murni domain Obligations (tanpa API Nuxt) agar dapat diuji di
// project unit. Status SELALU berasal dari field backend; tanggal yang sudah
// lewat hanya ditampilkan sebagai konteks tanggal, bukan status baru.

export const VEHICLE_OBLIGATION_STATUS_LABELS: Record<VehicleObligationStatus, string> = {
  active: 'Aktif',
  inactive: 'Tidak aktif'
}

export function obligationStatusLabel(status: VehicleObligationStatus): string {
  return VEHICLE_OBLIGATION_STATUS_LABELS[status]
}

export function obligationStatusChipClass(status: VehicleObligationStatus): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
    default:
      return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
  }
}

/** Opsi status administratif untuk form edit (create selalu active). */
export const VEHICLE_OBLIGATION_STATUS_OPTIONS: Array<{
  label: string
  value: VehicleObligationStatus
}> = [
  { label: 'Aktif', value: 'active' },
  { label: 'Tidak aktif', value: 'inactive' }
]

/**
 * Tanggal lokal hari ini sebagai Y-m-d. Dipakai untuk konteks tampilan saja;
 * tidak mengubah status apa pun.
 */
export function ymdToday(now = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/** Perbandingan leksikal aman untuk dua tanggal berformat Y-m-d. */
export function isYmdBefore(value: string, reference: string): boolean {
  return value < reference
}

/**
 * True bila due_date sudah lewat dari hari ini. Ini hanya penanda konteks
 * tanggal — UI tidak boleh menyebutnya "terlambat" atau mengubah status.
 */
export function isObligationDueDatePast(item: VehicleObligationItem, today = ymdToday()): boolean {
  return isYmdBefore(item.due_date, today)
}

/**
 * Nominal opsional dari backend (string desimal). Aplikasi tidak memiliki
 * metadata mata uang per household dan seluruh UI finansial memakai IDR,
 * jadi IDR dipertahankan. Berbeda dari formatRupiah (0 desimal), formatter ini
 * menampilkan maksimal dua desimal agar nilai decimal(15,2) tidak dibulatkan
 * diam-diam; nilai tanpa sen tetap tampil seperti format aplikasi.
 */
const obligationAmountFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
})

export function formatObligationAmount(amount: string | null): string | null {
  if (amount === null || amount.trim() === '') {
    return null
  }

  const value = Number(amount)

  if (!Number.isFinite(value)) {
    return null
  }

  return obligationAmountFormatter.format(value)
}

/**
 * Parse input nominal form. String kosong berarti tidak dicatat (null).
 * Nilai harus non-negatif dengan maksimal dua digit desimal; hasil tetap
 * string agar presisi desimal tidak berubah saat melewati JSON.
 */
export function parseObligationAmount(raw: string): {
  value: string | null
  invalid: boolean
} {
  const trimmed = raw.trim()

  if (trimmed === '') {
    return { value: null, invalid: false }
  }

  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return { value: null, invalid: true }
  }

  // Batas kolom decimal(15,2) di backend.
  if (Number(trimmed) > 9999999999999.99) {
    return { value: null, invalid: true }
  }

  return { value: trimmed, invalid: false }
}

/** Tipe bawaan dan custom dipisah untuk tampilan yang eksplisit. */
export function splitObligationTypes(types: ObligationTypeItem[]): {
  system: ObligationTypeItem[]
  custom: ObligationTypeItem[]
} {
  return {
    system: types.filter(type => type.is_system),
    custom: types.filter(type => !type.is_system)
  }
}

/**
 * Opsi USelect untuk form. Tipe sistem diberi penanda "Bawaan" agar pengguna
 * tahu tipe tersebut tidak dapat diubah/dihapus.
 */
export function obligationTypeOptions(types: ObligationTypeItem[]): Array<{
  label: string
  value: string
}> {
  return types.map(type => ({
    label: type.is_system ? `${type.name} · Bawaan` : `${type.name} · Custom`,
    value: type.id
  }))
}
