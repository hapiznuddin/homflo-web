// Daftar jadwal + riwayat servis satu kendaraan milik household aktif. Array
// terurut backend (scheduled_date lalu id), tanpa pagination dan tanpa query
// filter status (kontrak backend: kardinalitas bounded; filter dilakukan di
// klien). ID kendaraan asing dimasking backend sebagai 404 VEHICLE_NOT_FOUND.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  try {
    // Explicit generic: without it, Nitro tries to infer the response type
    // by matching the URL against every registered route, which blows up
    // with "excessive stack depth" on complex route tables.
    return await $fetch<{ success: boolean, data: unknown[] }>(
      `${laravelBase()}/vehicles/${encodeURIComponent(String(id))}/maintenance`,
      {
        headers: {
          Accept: 'application/json',
          ...forwardAuthHeaders(event)
        }
      }
    )
  } catch (err: unknown) {
    // Preserve Laravel's status (401 tamu, 404 kendaraan asing/hilang)
    // instead of letting it explode into a Nitro 500.
    const status
      = typeof err === 'object'
        && err !== null
        && 'statusCode' in err
        && typeof (err as { statusCode?: unknown }).statusCode === 'number'
        ? (err as { statusCode: number }).statusCode
        : 500
    const data
      = typeof err === 'object' && err !== null && 'data' in err
        ? (err as { data?: unknown }).data
        : null

    throw createError({ statusCode: status, data })
  }
})
