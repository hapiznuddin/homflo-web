// Switch the authenticated user's active household pointer. The route only
// carries the target household; Laravel verifies membership server-side.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  return laravelFetch(event, `/households/${encodeURIComponent(String(id))}/activate`, {
    method: 'POST'
  })
})
