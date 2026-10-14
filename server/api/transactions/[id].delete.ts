// Menghapus transaksi (hard delete sesuai schema; tanpa retention
// policy). Daftar disinkronkan ulang oleh klien setelah backend
// mengonfirmasi.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  return laravelFetch(event, `/transactions/${encodeURIComponent(String(id))}`, {
    method: 'DELETE'
  })
})
