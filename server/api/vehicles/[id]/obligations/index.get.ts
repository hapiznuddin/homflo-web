// Daftar kewajiban satu kendaraan milik household aktif. Array terurut
// backend (due_date lalu id), tanpa pagination. ID kendaraan asing dimasking
// backend sebagai 404 VEHICLE_NOT_FOUND. Cookie/CSRF/status/error diteruskan
// oleh laravelFetch apa adanya.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  return laravelFetch(event, `/vehicles/${encodeURIComponent(String(id))}/obligations`)
})
