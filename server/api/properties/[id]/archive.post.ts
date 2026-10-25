// Mengarsipkan Property (idempoten di backend). Tanpa body — murni aksi
// lifecycle; tidak ada endpoint DELETE permanen.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  return laravelFetch(event, `/properties/${encodeURIComponent(String(id))}/archive`, {
    method: 'POST'
  })
})
