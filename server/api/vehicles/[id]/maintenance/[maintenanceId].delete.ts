// Menghapus satu catatan servis. Hanya record tersebut yang dihapus —
// kendaraan dan catatan servis lain tidak pernah ikut terhapus dari sini.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const maintenanceId = getRouterParam(event, 'maintenanceId')

  return laravelFetch(
    event,
    `/vehicles/${encodeURIComponent(String(id))}/maintenance/${encodeURIComponent(String(maintenanceId))}`,
    {
      method: 'DELETE'
    }
  )
})
