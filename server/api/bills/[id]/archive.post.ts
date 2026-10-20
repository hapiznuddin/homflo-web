// Mengarsipkan bill LUNAS (satu arah: tanpa endpoint un-arsip di backend;
// bill belum lunas ditolak 422 BILL_NOT_PAID). Tanpa body — endpoint
// murni tombol lifecycle, idempoten di sisi backend.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  return laravelFetch(event, `/bills/${encodeURIComponent(String(id))}/archive`, {
    method: 'POST'
  })
})
