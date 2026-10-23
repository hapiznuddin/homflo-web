// Membuat catatan servis untuk kendaraan pada nested route. Field di-whitelist
// sesuai StoreVehicleMaintenanceRequest; vehicle_id/household_id/status/
// completed_at ditentukan server, bukan payload.
import { pickVehicleMaintenanceBody } from '../../../../utils/vehicleMaintenanceBody'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const raw = await readBody<Record<string, unknown>>(event)

  return laravelFetch(event, `/vehicles/${encodeURIComponent(String(id))}/maintenance`, {
    method: 'POST',
    body: pickVehicleMaintenanceBody(raw)
  })
})
