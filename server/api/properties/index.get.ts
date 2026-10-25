// Daftar Property milik household aktif. Hanya include_archived=true yang
// diteruskan (kontrak backend: aktif + arsip); kunci query asing dibuang.
// Tanpa pagination — backend mengembalikan array flat terurut nama.
const ALLOWED_QUERY_KEYS = [
  'include_archived'
] as const

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const params: Record<string, string> = {}

  for (const key of ALLOWED_QUERY_KEYS) {
    const value = query[key]

    // Jangan meneruskan string sembarang: PropertyController memakai
    // truthiness PHP, sehingga "false" justru dianggap true.
    if (key === 'include_archived' && value === 'true') {
      params[key] = 'true'
    }
  }

  try {
    // Explicit generic: tanpa ini Nitro mencoba menyimpulkan tipe respons
    // dengan mencocokkan URL ke seluruh route dan bisa stack overflow.
    return await $fetch<{ success: boolean, data: unknown[], include_archived?: boolean }>(
      `${laravelBase()}/properties`,
      {
        params,
        headers: {
          Accept: 'application/json',
          ...forwardAuthHeaders(event)
        }
      }
    )
  } catch (err: unknown) {
    // Pertahankan status Laravel (401 tamu, 404 tanpa household) agar
    // client dapat menampilkan state yang tepat, bukan Nitro 500.
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
