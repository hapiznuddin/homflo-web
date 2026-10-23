// Membuat catatan perawatan. Field di-whitelist sesuai StoreMaintenanceRequest;
// household dan lifecycle ditentukan server dari session + aksi Complete/Cancel.
import { pickMaintenanceBody } from '../../utils/maintenanceBody'

export default defineEventHandler(async (event) => {
  const raw = await readBody<Record<string, unknown>>(event)

  return laravelFetch(event, '/maintenance', {
    method: 'POST',
    body: pickMaintenanceBody(raw)
  })
})
