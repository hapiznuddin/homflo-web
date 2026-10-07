export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event)

  return laravelFetch(event, '/password/forgot', {
    method: 'POST',
    body: { email: body?.email }
  })
})
