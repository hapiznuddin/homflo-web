export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<Record<string, unknown>>(event)

  return laravelFetch(event, `/households/${encodeURIComponent(String(id))}/invitations`, {
    method: 'POST',
    body: { email: body?.email }
  })
})
