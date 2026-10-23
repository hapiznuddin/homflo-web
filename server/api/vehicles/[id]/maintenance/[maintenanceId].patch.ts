// Mengubah catatan servis pada kendaraan tertentu. Field di-whitelist sesuai
// UpdateVehicleMaintenanceRequest; catatan tidak dapat dipindahkan ke
// kendaraan lain dan lifecycle tetap server-managed.
import { pickVehicleMaintenanceBody } from '../../../../utils/vehicleMaintenanceBody'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const maintenanceId = getRouterParam(event, 'maintenanceId')
  const raw = await readBody<Record<string, unknown>>(event)

  return laravelFetch(
    event,
    `/vehicles/${encodeURIComponent(String(id))}/maintenance/${encodeURIComponent(String(maintenanceId))}`,
    {
      method: 'PATCH',
      body: pickVehicleMaintenanceBody(raw)
    }
  )
})
