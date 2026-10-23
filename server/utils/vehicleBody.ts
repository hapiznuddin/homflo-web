// Whitelist body kendaraan via proxy Nuxt. Browser TIDAK PERNAH meneruskan
// body apa adanya: hanya field yang didukung StoreVehicleRequest /
// UpdateVehicleRequest yang diteruskan. `household_id` bukan field yang boleh
// dikirim — ownership berasal dari konteks session di backend. Nama field
// backend adalah `plate_number` (UI memetakannya dari label plat nomor).
export const VEHICLE_ALLOWED_KEYS = [
  'name',
  'brand',
  'model',
  'year',
  'type',
  'plate_number',
  'odometer'
] as const

const NULLABLE_KEYS = new Set<string>([
  'brand',
  'model',
  'year',
  'type',
  'plate_number',
  'odometer'
])

// Filter murni (tanpa dependensi Nitro) agar kontrak whitelist dapat
// di-unit-test langsung. String kosong pada kolom nullable dikirim sebagai
// null eksplisit (form HTML mengosongkan field dengan '').
export function pickVehicleBody(raw: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const body: Record<string, unknown> = {}

  for (const key of VEHICLE_ALLOWED_KEYS) {
    const value = raw?.[key]

    if (value !== undefined) {
      body[key] = NULLABLE_KEYS.has(key) && value === '' ? null : value
    }
  }

  return body
}
