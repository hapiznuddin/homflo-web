// Aksi lifecycle Cancel: POST tanpa body. cancelled_at ditentukan server;
// hanya record scheduled yang diterima (422 bila sudah selesai/dibatalkan).
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  return laravelFetch(event, `/maintenance/${encodeURIComponent(String(id))}/cancel`, {
    method: 'POST'
  })
})
