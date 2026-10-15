// Mengubah target anggaran. Field di-whitelist sesuai
// UpdateBudgetRequest; ownership tidak pernah dapat diubah dari sini.
const ALLOWED_BODY_KEYS = [
  'category_id',
  'year',
  'month',
  'amount'
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

  return laravelFetch(event, `/budgets/${encodeURIComponent(String(id))}`, {
    method: 'PATCH',
    body
  })
})
