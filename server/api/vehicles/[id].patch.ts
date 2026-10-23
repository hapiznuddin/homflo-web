// Mengubah kendaraan. Field di-whitelist sesuai UpdateVehicleRequest;
// ownership tidak pernah dapat diubah dari sini.
import { pickVehicleBody } from '../../utils/vehicleBody'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const raw = await readBody<Record<string, unknown>>(event)

  return laravelFetch(event, `/vehicles/${encodeURIComponent(String(id))}`, {
    method: 'PATCH',
    body: pickVehicleBody(raw)
  })
})
