// Whitelist body jenis kewajiban via proxy Nuxt. Hanya `name` yang writable
// pada create/update. household_id, code, dan is_system ditentukan server;
// tipe sistem tidak dapat diubah/dihapus dan tidak pernah dibuat dari sini.
export const OBLIGATION_TYPE_ALLOWED_KEYS = ['name'] as const

export function pickObligationTypeBody(
  raw: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const body: Record<string, unknown> = {}

  for (const key of OBLIGATION_TYPE_ALLOWED_KEYS) {
    const value = raw?.[key]

    if (value !== undefined) {
      body[key] = value
    }
  }

  return body
}
