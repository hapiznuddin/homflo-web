// Whitelist body Obligations via proxy Nuxt. Browser TIDAK PERNAH meneruskan
// body apa adanya: hanya field yang didukung StoreVehicleObligationRequest /
// UpdateVehicleObligationRequest yang diteruskan.
//
// `status` hanya writable pada update (create selalu active di server).
// `vehicle_id`, `household_id`, `id`, dan timestamp ditentukan server melalui
// nested route + konteks session, sehingga tidak pernah boleh dikirim dari
// browser. Field opsional kosong dikirim sebagai null eksplisit.
export const VEHICLE_OBLIGATION_CREATE_KEYS = [
  'obligation_type_id',
  'title',
  'description',
  'issued_date',
  'due_date',
  'amount'
] as const

export const VEHICLE_OBLIGATION_UPDATE_KEYS = [
  ...VEHICLE_OBLIGATION_CREATE_KEYS,
  'status'
] as const

const NULLABLE_KEYS = new Set<string>([
  'description',
  'issued_date',
  'amount'
])

function pick(
  raw: Record<string, unknown> | null | undefined,
  keys: readonly string[]
): Record<string, unknown> {
  const body: Record<string, unknown> = {}

  for (const key of keys) {
    const value = raw?.[key]

    if (value !== undefined) {
      body[key] = NULLABLE_KEYS.has(key) && value === '' ? null : value
    }
  }

  return body
}

export function pickVehicleObligationCreateBody(
  raw: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  return pick(raw, VEHICLE_OBLIGATION_CREATE_KEYS)
}

export function pickVehicleObligationUpdateBody(
  raw: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  return pick(raw, VEHICLE_OBLIGATION_UPDATE_KEYS)
}
