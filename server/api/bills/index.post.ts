// Membuat bill sekali ATAU membuat jadwal + 12 periode (bila recurrence
// dikirim). Field di-whitelist sesuai StoreBillRequest; household_id
// tidak pernah diteruskan (ditentukan server dari sesi).
const ALLOWED_BODY_KEYS = [
  'title',
  'amount',
  'due_date',
  'category_id',
  'notes',
  'recurrence'
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

  // recurrence adalah objek jadwal, bukan relasi id: kontrak backend hanya
  // menerima { frequency } — kunci asing di dalamnya dibuang di boundary.
  const recurrence = body.recurrence

  if (recurrence !== undefined) {
    body.recurrence =
      typeof recurrence === 'object' && recurrence !== null && !Array.isArray(recurrence)
        ? { frequency: (recurrence as Record<string, unknown>).frequency }
        : recurrence
  }

  return laravelFetch(event, '/bills', {
    method: 'POST',
    body
  })
})
