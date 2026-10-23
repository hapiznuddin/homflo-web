// Mengubah catatan perawatan (termasuk reschedule lewat scheduled_date).
// Field di-whitelist sesuai UpdateMaintenanceRequest; status/timestamp
// lifecycle tidak pernah dapat diubah dari sini.
import { pickMaintenanceBody } from '../../utils/maintenanceBody'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const raw = await readBody<Record<string, unknown>>(event)

  return laravelFetch(event, `/maintenance/${encodeURIComponent(String(id))}`, {
    method: 'PATCH',
    body: pickMaintenanceBody(raw)
  })
})
