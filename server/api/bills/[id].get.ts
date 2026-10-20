// Detail satu bill milik household aktif (termasuk payments[] histori).
// ID diteruskan apa adanya; Laravel me-resolve sekaligus mengisolasi
// (binding + scoped lookup + 404-mask), sehingga ID asing tidak
// membocorkan apa pun.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  try {
    // Explicit generic: without it, Nitro tries to infer the response type
    // by matching the URL against every registered route, which blows up
    // with "excessive stack depth" on complex route tables.
    return await $fetch<{ success: boolean, data: Record<string, unknown> }>(
      `${laravelBase()}/bills/${encodeURIComponent(String(id))}`,
      {
        headers: {
          Accept: 'application/json',
          ...forwardAuthHeaders(event)
        }
      }
    )
  } catch (err: unknown) {
    // Preserve Laravel's status (401 tamu, 404 asing/hilang) instead of
    // letting it explode into a Nitro 500, so the client can resolve
    // clean states.
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
