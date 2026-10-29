// Daftar item dalam list. Kontrak §10.6 mengembalikan dua grup
// (active/completed) sekaligus, sehingga tidak ada query param yang
// diteruskan; list archived tetap readable sesuai kontrak.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  return laravelFetch(
    event,
    `/lists/${encodeURIComponent(String(id))}/items`
  )
})
