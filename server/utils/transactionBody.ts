// Whitelist body untuk transaksi via proxy Nuxt. Browser TIDAK PERNAH
// meneruskan body apa adanya: hanya field yang didukung FormRequest
// Laravel yang diteruskan.
//
// Phase 15.2.2: `wallet_id` (ULID dompet — required backend untuk
// create). Phase 15.2.3: `destination_wallet_id` (khusus transfer;
// StoreTransactionRequest memakai prohibited_unless — income/expense
// TIDAK boleh mengirim key ini, jadi payload create non-transfer
// memang tidak memuatnya). Whitelist meneruskan key apa adanya bila
// disertakan; aturan per-tipe dipegang oleh pemanggil (composable) dan
// dijaga backend.
export const TRANSACTION_CREATE_ALLOWED_KEYS = [
  'type',
  'category_id',
  'wallet_id',
  'destination_wallet_id',
  'amount',
  'occurred_on',
  'description',
  'wallet'
] as const

// Whitelist PATCH (UpdateTransactionRequest): sama dengan create plus
// penormaan `destination_wallet_id` (id‖null) — konversi
// transfer→non-transfer WAJIB mengirim null secara eksplisit agar
// tujuan lama tidak terbawa (TransactionService::change membaca key
// via array_key_exists). Bukan pass-through.
export const TRANSACTION_UPDATE_ALLOWED_KEYS = [
  ...TRANSACTION_CREATE_ALLOWED_KEYS
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

// Whitelist PATCH — pemanggilan terpisah agar kontrak update terkunci
// unit test secara independen dari create.
export function pickTransactionUpdateBody(
  raw: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  return pickTransactionCreateBody(raw, TRANSACTION_UPDATE_ALLOWED_KEYS)
}
