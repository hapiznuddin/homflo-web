// Menghapus catatan perawatan (hard delete sesuai schema). Daftar
// disinkronkan ulang oleh klien setelah backend mengonfirmasi.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  return laravelFetch(event, `/maintenance/${encodeURIComponent(String(id))}`, {
    method: 'DELETE'
  })
})
