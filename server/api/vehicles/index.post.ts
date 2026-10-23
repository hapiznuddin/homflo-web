// Membuat kendaraan. Field di-whitelist sesuai StoreVehicleRequest;
// household ditentukan server dari session.
import { pickVehicleBody } from '../../utils/vehicleBody'

export default defineEventHandler(async (event) => {
  const raw = await readBody<Record<string, unknown>>(event)

  return laravelFetch(event, '/vehicles', {
    method: 'POST',
    body: pickVehicleBody(raw)
  })
})
