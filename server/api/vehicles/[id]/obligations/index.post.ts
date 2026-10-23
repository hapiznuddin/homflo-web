// Membuat kewajiban untuk kendaraan pada nested route. Field di-whitelist
// sesuai StoreVehicleObligationRequest; vehicle_id/household_id/id/status
// ditentukan server (route + session + default Active).
import { pickVehicleObligationCreateBody } from '../../../../utils/vehicleObligationBody'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const raw = await readBody<Record<string, unknown>>(event)

  return laravelFetch(event, `/vehicles/${encodeURIComponent(String(id))}/obligations`, {
    method: 'POST',
    body: pickVehicleObligationCreateBody(raw)
  })
})
