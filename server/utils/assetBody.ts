// Whitelist body aset via proxy Nuxt. Browser TIDAK PERNAH meneruskan
// body apa adanya: hanya field yang didukung StoreAssetRequest /
// UpdateAssetRequest yang diteruskan. household_id bukan field yang
// boleh dikirim — ownership berasal dari konteks session di backend.
export const ASSET_ALLOWED_KEYS = [
  'name',
  'description',
  'location',
  'acquired_on',
  'acquisition_cost'
] as const

const NULLABLE_KEYS = new Set<string>([
  'description',
  'location',
  'acquired_on',
  'acquisition_cost'
])

// Filter murni (tanpa dependensi Nitro) agar kontrak whitelist dapat
// di-unit-test langsung. String kosong pada kolom nullable dikirim
// sebagai null eksplisit (form HTML mengosongkan field dengan '').
export function pickAssetBody(raw: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const body: Record<string, unknown> = {}

  for (const key of ASSET_ALLOWED_KEYS) {
    const value = raw?.[key]

    if (value !== undefined) {
      body[key] = NULLABLE_KEYS.has(key) && value === '' ? null : value
    }
  }

  return body
}
