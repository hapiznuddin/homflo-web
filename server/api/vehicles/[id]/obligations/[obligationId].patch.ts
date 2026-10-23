// Mengubah kewajiban pada kendaraan tertentu. Field di-whitelist sesuai
// UpdateVehicleObligationRequest; record tidak dapat dipindahkan ke kendaraan
// lain dan status hanya active/inactive.
import { pickVehicleObligationUpdateBody } from '../../../../utils/vehicleObligationBody'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const obligationId = getRouterParam(event, 'obligationId')
  const raw = await readBody<Record<string, unknown>>(event)

  return laravelFetch(
    event,
    `/vehicles/${encodeURIComponent(String(id))}/obligations/${encodeURIComponent(String(obligationId))}`,
    {
      method: 'PATCH',
      body: pickVehicleObligationUpdateBody(raw)
    }
  )
})
