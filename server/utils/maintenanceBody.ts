// Whitelist body maintenance via proxy Nuxt. Browser TIDAK PERNAH meneruskan
// body apa adanya: hanya field yang didukung StoreMaintenanceRequest /
// UpdateMaintenanceRequest yang diteruskan. household_id, status,
// completed_at, dan cancelled_at bukan field yang boleh dikirim — ownership
// dan lifecycle berasal dari konteks session + aksi Complete/Cancel backend.
export const MAINTENANCE_ALLOWED_KEYS = [
  'asset_id',
  'title',
  'description',
  'location',
  'scheduled_date',
  'priority'
] as const

const NULLABLE_KEYS = new Set<string>([
  'description'
])

// Filter murni (tanpa dependensi Nitro) agar kontrak whitelist dapat
// di-unit-test langsung. String kosong pada kolom nullable dikirim sebagai
// null eksplisit (form HTML mengosongkan field dengan '').
export function pickMaintenanceBody(raw: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const body: Record<string, unknown> = {}

  for (const key of MAINTENANCE_ALLOWED_KEYS) {
    const value = raw?.[key]

    if (value !== undefined) {
      body[key] = NULLABLE_KEYS.has(key) && value === '' ? null : value
    }
  }

  return body
}
