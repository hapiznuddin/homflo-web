export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event)

  return laravelFetch(event, '/password/reset', {
    method: 'POST',
    body: {
      email: body?.email,
      token: body?.token,
      password: body?.password,
      password_confirmation: body?.password_confirmation
    }
  })
})
