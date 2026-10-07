export default defineEventHandler(async (event) => {
  return laravelFetch(event, '/email/verification-notification', { method: 'POST' })
})
