export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event)

  return laravelFetch(event, '/password/change', {
    method: 'POST',
    body: {
      current_password: body?.current_password,
      password: body?.password,
      password_confirmation: body?.password_confirmation
    }
  })
})
