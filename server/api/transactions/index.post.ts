// Mencatat transaksi. Field di-whitelist sesuai StoreTransactionRequest;
// household ditentukan server, source_* tidak pernah diteruskan.
const ALLOWED_BODY_KEYS = [
  'type',
  'category_id',
  'amount',
  'occurred_on',
  'description',
  'wallet'
] as const

export default defineEventHandler(async (event) => {
  const raw = await readBody<Record<string, unknown>>(event)
  const body: Record<string, unknown> = {}

  for (const key of ALLOWED_BODY_KEYS) {
    const value = raw?.[key]

    if (value !== undefined) {
      body[key] = value
    }
  }

  return laravelFetch(event, '/transactions', {
    method: 'POST',
    body
  })
})
