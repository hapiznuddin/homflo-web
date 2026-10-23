// Aksi lifecycle Complete: POST tanpa body. completed_at ditentukan server;
// hanya record scheduled yang diterima (422 VEHICLE_MAINTENANCE_ALREADY_COMPLETED
// bila sudah selesai). Tidak ada aksi Cancel/undo.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const maintenanceId = getRouterParam(event, 'maintenanceId')

  return laravelFetch(
    event,
    `/vehicles/${encodeURIComponent(String(id))}/maintenance/${encodeURIComponent(String(maintenanceId))}/complete`,
    {
      method: 'POST'
    }
  )
})
