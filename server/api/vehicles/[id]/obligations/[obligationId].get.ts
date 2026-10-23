// Detail satu kewajiban pada kendaraan tertentu. Laravel me-resolve sekaligus
// mengisolasi (scoped lookup + 404-mask VEHICLE_OBLIGATION_NOT_FOUND),
// sehingga record kendaraan lain tidak membocorkan apa pun.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const obligationId = getRouterParam(event, 'obligationId')

  return laravelFetch(
    event,
    `/vehicles/${encodeURIComponent(String(id))}/obligations/${encodeURIComponent(String(obligationId))}`
  )
})
