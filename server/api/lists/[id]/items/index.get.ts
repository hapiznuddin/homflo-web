// Daftar item dalam list. Filter status di-whitelist; list archived tetap
// readable sesuai kontrak.
const ALLOWED_QUERY_KEYS = ['status'] as const

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const query = getQuery(event)
  const params = new URLSearchParams()

  for (const key of ALLOWED_QUERY_KEYS) {
    const value = query[key]

    if (typeof value === 'string' && value !== '') {
      params.set(key, value)
    }
  }

  const search = params.toString()

  return laravelFetch(
    event,
    `/lists/${encodeURIComponent(String(id))}/items${search ? `?${search}` : ''}`
  )
})
