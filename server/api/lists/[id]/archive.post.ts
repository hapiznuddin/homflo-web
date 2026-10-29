// Mengarsipkan list. Tanpa body; backend memindahkan pointer default ke
// kandidat shopping aktif atau menolak 409 DEFAULT_LIST_REQUIRED.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  return laravelFetch(event, `/lists/${encodeURIComponent(String(id))}/archive`, {
    method: 'POST'
  })
})
