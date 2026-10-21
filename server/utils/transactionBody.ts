// Whitelist body untuk POST transaksi generik via proxy Nuxt.
// Browser TIDAK PERNAH meneruskan body apa adanya: hanya field yang
// didukung StoreTransactionRequest yang diteruskan ke Laravel.
//
// Phase 15.2.2 menambahkan `wallet_id` (ULID dompet — required backend
// untuk create). `destination_wallet_id` sengaja BELUM masuk: khusus
// transfer, direncanakan bersama fitur transfer (Phase 15.2.3).
export const TRANSACTION_CREATE_ALLOWED_KEYS = [
  'type',
  'category_id',
  'wallet_id',
  'amount',
  'occurred_on',
  'description',
  'wallet'
] as const

// Filter murni (tanpa dependensi Nitro) agar kontrak whitelist dapat
// di-unit-test langsung.
export function pickTransactionCreateBody(
  raw: Record<string, unknown> | null | undefined,
  allowedKeys: readonly string[] = TRANSACTION_CREATE_ALLOWED_KEYS
): Record<string, unknown> {
  const body: Record<string, unknown> = {}

  for (const key of allowedKeys) {
    const value = raw?.[key]

    if (value !== undefined) {
      body[key] = value
    }
  }

  return body
}
