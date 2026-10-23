// Aksi lifecycle Complete: POST tanpa body. completed_at ditentukan server;
// hanya record scheduled yang diterima (422 bila sudah selesai/dibatalkan).
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  return laravelFetch(event, `/maintenance/${encodeURIComponent(String(id))}/complete`, {
    method: 'POST'
  })
})
