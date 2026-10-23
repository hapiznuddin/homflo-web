// Menghapus aset (hard delete sesuai schema). Maintenance yang tertaut
// di-detach backend lewat ON DELETE SET NULL; daftar disinkronkan ulang
// oleh klien setelah backend mengonfirmasi.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  return laravelFetch(event, `/assets/${encodeURIComponent(String(id))}`, {
    method: 'DELETE'
  })
})
