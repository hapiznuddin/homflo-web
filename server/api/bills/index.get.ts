// Daftar bills milik household aktif. Meneruskan filter arsip yang
// didukung Laravel (IndexBillRequest); kunci query di-whitelist agar
// parameter asing tidak diteruskan. Kontrak backend: tanpa pagination
// (respons berupa array flat) dan include_archived=true mengembalikan
// bill aktif + terarsip — pemisahan baris arsip dilakukan di tampilan.
const ALLOWED_QUERY_KEYS = [
  'include_archived'
] as const

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const params: Record<string, string> = {}

  for (const key of ALLOWED_QUERY_KEYS) {
    const value = query[key]

    if (typeof value === 'string' && value !== '') {
      params[key] = value
    }
  }

  try {
    // Explicit generic: without it, Nitro tries to infer the response type
    // by matching the URL against every registered route, which blows up
    // with "excessive stack depth" on complex route tables.
    return await $fetch<{ success: boolean, data: unknown[] }>(
      `${laravelBase()}/bills`,
      {
        params,
        headers: {
          Accept: 'application/json',
          ...forwardAuthHeaders(event)
        }
      }
    )
  } catch (err: unknown) {
    // Preserve Laravel's status (401 tamu, 404 tanpa household, 422 filter)
    // instead of letting it explode into a Nitro 500, so the client can
    // resolve clean states.
    const status =
      typeof err === 'object' &&
      err !== null &&
      'statusCode' in err &&
      typeof (err as { statusCode?: unknown }).statusCode === 'number'
        ? (err as { statusCode: number }).statusCode
        : 500
    const data =
      typeof err === 'object' && err !== null && 'data' in err
        ? (err as { data?: unknown }).data
        : null

    throw createError({ statusCode: status, data })
  }
})
