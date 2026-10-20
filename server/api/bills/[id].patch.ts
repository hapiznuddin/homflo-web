// Mengubah bill. Field di-whitelist sesuai UpdateBillRequest; is_active
// (arsip) dan recurrence (jadwal) TIDAK PERNAH diteruskan — keduanya
// 'prohibited' di backend dan punya endpoint khusus masing-masing.
const ALLOWED_BODY_KEYS = [
  'title',
  'amount',
  'due_date',
  'category_id',
  'notes'
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

  return laravelFetch(event, `/bills/${encodeURIComponent(String(id))}`, {
    method: 'PATCH',
    body
  })
})
