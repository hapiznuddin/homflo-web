// Rename household. Only the name is accepted from the browser; ownership
// and household identity are resolved by Laravel from the session and route.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<{ name?: unknown }>(event)

  return laravelFetch(event, `/households/${encodeURIComponent(String(id))}`, {
    method: 'PATCH',
    body: { name: typeof body?.name === 'string' ? body.name : '' }
  })
})
