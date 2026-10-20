// Menghapus bill (hard delete). Untuk bill periode recurrence ini adalah
// skip PERMANEN (kursor jadwal tidak mundur; periode tidak dibuat ulang)
// dan backend menolak bill yang sudah lunas (422 BILL_ALREADY_PAID).
// Transaksi terkait tidak pernah disentuh; daftar disinkronkan ulang oleh
// klien setelah backend mengonfirmasi.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  return laravelFetch(event, `/bills/${encodeURIComponent(String(id))}`, {
    method: 'DELETE'
  })
})
