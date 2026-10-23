// Menghapus kendaraan. Kendaraan yang masih memiliki riwayat servis ditolak
// backend dengan 409 VEHICLE_HAS_MAINTENANCE_HISTORY; riwayat TIDAK PERNAH
// ikut dihapus dari sini. Klien menangani konflik itu secara eksplisit.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  return laravelFetch(event, `/vehicles/${encodeURIComponent(String(id))}`, {
    method: 'DELETE'
  })
})
