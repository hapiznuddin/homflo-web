// Menghapus target anggaran (hard delete sesuai schema; riwayat
// transaksi tidak pernah tersentuh). Daftar disinkronkan ulang oleh
// klien setelah backend mengonfirmasi.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  return laravelFetch(event, `/budgets/${encodeURIComponent(String(id))}`, {
    method: 'DELETE'
  })
})
