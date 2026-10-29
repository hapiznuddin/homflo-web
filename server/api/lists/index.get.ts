// Daftar list milik household aktif. Query di-whitelist sesuai
// IndexListRequest; parameter asing tidak diteruskan ke Laravel.
const ALLOWED_QUERY_KEYS = ['include_archived', 'type'] as const

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const params = new URLSearchParams()

  for (const key of ALLOWED_QUERY_KEYS) {
    const value = query[key]

    if (typeof value === 'string' && value !== '') {
      params.set(key, value)
    }
  }

  const search = params.toString()

  return laravelFetch(event, `/lists${search ? `?${search}` : ''}`)
})
