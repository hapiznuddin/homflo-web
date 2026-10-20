// Read-only proxy daftar dompet (kontrak Phase 14.3.1 §5.8): pass-through
// penuh tanpa whitelist query/body karena Laravel tidak menerima filter
// apa pun di index (respons array flat berisi is_active + balance untuk
// tampilan). Tidak ada — dan tidak boleh ada — proxy write Wallet di
// Phase 14.3.
export default defineEventHandler(async (event) => {
  try {
    // Explicit generic: without it, Nitro tries to infer the response type
    // by matching the URL against every registered route, which blows up
    // with "excessive stack depth" on complex route tables.
    return await $fetch<{ success: boolean, data: unknown[] }>(
      `${laravelBase()}/wallets`,
      {
        headers: {
          Accept: 'application/json',
          ...forwardAuthHeaders(event)
        }
      }
    )
  } catch (err: unknown) {
    // Preserve Laravel's status (401 tamu, 404 tanpa household) instead
    // of letting it explode into a Nitro 500, so the client can resolve
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
