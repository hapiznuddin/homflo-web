// Membayar bill LUNAS dari satu dompet aktif. Field di-whitelist sesuai
// PayBillRequest: hanya wallet_id (wajib) dan occurred_on (opsional,
// default hari bisnis server). amount DAN category_id TIDAK PERNAH
// diteruskan — nominal pelunasan diturunkan backend di bawah lock dan
// kategori diwarisi dari bill (fail-closed).
const ALLOWED_BODY_KEYS = [
  'wallet_id',
  'occurred_on'
] as const

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const raw = await readBody<Record<string, unknown>>(event)
  const body: Record<string, unknown> = {}

  for (const key of ALLOWED_BODY_KEYS) {
    const value = raw?.[key]

    if (value !== undefined) {
      body[key] = value
    }
  }

  return laravelFetch(event, `/bills/${encodeURIComponent(String(id))}/payments`, {
    method: 'POST',
    body
  })
})
