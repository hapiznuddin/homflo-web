// Mengubah jadwal recurrence (D-07): body FLAT, partial sesuai
// UpdateBillRecurrenceRequest. Karena statis "recurrences" menempati
// jalur tersendiri, rute ini terdaftar lebih dulu daripada
// /api/bills/[id] (pola sama dengan route:list Laravel) sehingga id
// "recurrences" tidak pernah tertukar dengan id bill.
const ALLOWED_BODY_KEYS = [
  'title',
  'amount',
  'category_id',
  'notes',
  'due_day',
  'frequency',
  'is_active'
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

  return laravelFetch(event, `/bills/recurrences/${encodeURIComponent(String(id))}`, {
    method: 'PATCH',
    body
  })
})
