// Whitelist body Property via proxy Nuxt. Browser TIDAK PERNAH meneruskan
// body apa adanya: hanya field yang didukung StorePropertyRequest /
// UpdatePropertyRequest yang diteruskan. household_id, id, archived_at,
// dan timestamp bukan field yang boleh dikirim — household berasal dari
// session backend dan lifecycle arsip hanya lewat endpoint archive/restore.
export const PROPERTY_ALLOWED_KEYS = [
  'name',
  'type',
  'address',
  'description',
  'ownership_status',
  'notes'
] as const

const NULLABLE_KEYS = new Set<string>([
  'description',
  'notes'
])

// Filter murni (tanpa dependensi Nitro) agar kontrak whitelist dapat
// di-unit-test langsung. String kosong pada kolom nullable dikirim sebagai
// null eksplisit (form HTML mengosongkan field dengan '').
export function pickPropertyBody(raw: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const body: Record<string, unknown> = {}

  for (const key of PROPERTY_ALLOWED_KEYS) {
    const value = raw?.[key]

    if (value !== undefined) {
      body[key] = NULLABLE_KEYS.has(key) && value === '' ? null : value
    }
  }

  return body
}
