// Detail satu Property milik household aktif (termasuk arsip). ID
// diteruskan apa adanya; Laravel me-resolve sekaligus mengisolasi
// (binding + scoped lookup + 404-mask PROPERTY_NOT_FOUND).
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  try {
    // Explicit generic: tanpa ini Nitro mencoba menyimpulkan tipe respons
    // dengan mencocokkan URL ke seluruh route dan bisa stack overflow.
    return await $fetch<{ success: boolean, data: Record<string, unknown> }>(
      `${laravelBase()}/properties/${encodeURIComponent(String(id))}`,
      {
        headers: {
          Accept: 'application/json',
          ...forwardAuthHeaders(event)
        }
      }
    )
  } catch (err: unknown) {
    // Pertahankan status Laravel (401 tamu, 404 asing/hilang) agar client
    // dapat menampilkan state not-found, bukan Nitro 500.
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
