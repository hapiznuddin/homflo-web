// Only the theme field is part of the current preference contract.
export default defineEventHandler(async (event) => {
  const body = await readBody<{ theme?: unknown }>(event)

  return laravelFetch(event, '/preferences', {
    method: 'PATCH',
    body: { theme: typeof body?.theme === 'string' ? body.theme : '' }
  })
})
