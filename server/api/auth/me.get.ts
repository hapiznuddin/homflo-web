interface LaravelMeResponse {
  success: boolean
  data: {
    user: Record<string, unknown>
    household: Record<string, unknown> | null
    onboarding: { required: boolean }
  }
}

export default defineEventHandler(async (event) => {
  try {
    // Explicit generic: without it, Nitro tries to infer the response type
    // by matching the URL against every registered route, which blows up
    // with "excessive stack depth" on complex route tables.
    return await $fetch<LaravelMeResponse>(`${laravelBase()}/me`, {
      headers: {
        Accept: 'application/json',
        ...forwardAuthHeaders(event)
      }
    })
  } catch (err: unknown) {
    // Preserve Laravel's status (e.g. 401 for guests) instead of letting
    // it explode into a Nitro 500, so the client can resolve clean states.
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
