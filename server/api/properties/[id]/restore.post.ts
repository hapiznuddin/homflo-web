// Mengaktifkan kembali Property yang terarsip. Tanpa body — murni aksi
// lifecycle dan idempoten di backend.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  return laravelFetch(event, `/properties/${encodeURIComponent(String(id))}/restore`, {
    method: 'POST'
  })
})
