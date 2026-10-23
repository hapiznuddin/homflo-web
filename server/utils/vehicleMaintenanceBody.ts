// Whitelist body Vehicle Maintenance via proxy Nuxt. Browser TIDAK PERNAH
// meneruskan body apa adanya: hanya field yang didukung
// StoreVehicleMaintenanceRequest / UpdateVehicleMaintenanceRequest yang
// diteruskan. `vehicle_id`, `household_id`, `status`, dan `completed_at`
// ditentukan server (nested route + session + aksi Complete), sehingga tidak
// pernah boleh dikirim dari browser.
export const VEHICLE_MAINTENANCE_ALLOWED_KEYS = [
  'title',
  'description',
  'scheduled_date',
  'odometer'
] as const

const NULLABLE_KEYS = new Set<string>([
  'description',
  'odometer'
])

// Filter murni (tanpa dependensi Nitro) agar kontrak whitelist dapat
// di-unit-test langsung. String kosong pada kolom nullable dikirim sebagai
// null eksplisit (form HTML mengosongkan field dengan ''). scheduled_date
// tidak diubah: backend mewajibkannya saat create dan menolak nilai kosong
// saat update.
export function pickVehicleMaintenanceBody(
  raw: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const body: Record<string, unknown> = {}

  for (const key of VEHICLE_MAINTENANCE_ALLOWED_KEYS) {
    const value = raw?.[key]

    if (value !== undefined) {
      body[key] = NULLABLE_KEYS.has(key) && value === '' ? null : value
    }
  }

  return body
}
