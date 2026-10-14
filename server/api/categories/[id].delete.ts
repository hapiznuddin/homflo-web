// Menghapus kategori (hard delete sesuai schema; transaksi/bills yang
// tertaut di-detach backend, budget yang tertaut menolak via 422).
// Daftar disinkronkan ulang oleh klien setelah backend mengonfirmasi.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  return laravelFetch(event, `/categories/${encodeURIComponent(String(id))}`, {
    method: 'DELETE'
  })
})
