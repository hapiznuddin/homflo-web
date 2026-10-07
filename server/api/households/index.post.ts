export default defineEventHandler(async (event) => {
  const body = await readBody<{ name?: unknown }>(event)

  return laravelFetch(event, '/households', {
    method: 'POST',
    body: { name: typeof body?.name === 'string' ? body.name : '' }
  })
})
