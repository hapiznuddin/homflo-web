// Per-user application preferences. Laravel resolves the user from the
// session, so no user id is accepted from the browser.
export default defineEventHandler(async (event) => {
  return laravelFetch(event, '/preferences')
})
