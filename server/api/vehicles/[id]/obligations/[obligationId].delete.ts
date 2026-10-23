// Menghapus satu kewajiban. Hanya record tersebut yang dihapus — kendaraan
// dan kewajiban lain tidak pernah ikut terhapus dari sini. Daftar disinkronkan
// ulang oleh klien setelah backend mengonfirmasi.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const obligationId = getRouterParam(event, 'obligationId')

  return laravelFetch(
    event,
    `/vehicles/${encodeURIComponent(String(id))}/obligations/${encodeURIComponent(String(obligationId))}`,
    {
      method: 'DELETE'
    }
  )
})
