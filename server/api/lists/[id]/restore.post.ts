// Memulihkan list archived. Tanpa body; pointer default tidak berubah.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  return laravelFetch(event, `/lists/${encodeURIComponent(String(id))}/restore`, {
    method: 'POST'
  })
})
