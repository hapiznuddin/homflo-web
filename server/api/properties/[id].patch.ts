// Mengubah Property. Field di-whitelist sesuai UpdatePropertyRequest;
// archived_at tidak pernah diteruskan — backend menolak edit properti
// arsip dengan 409 PROPERTY_ARCHIVED.
import { pickPropertyBody } from '../../utils/propertyBody'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const raw = await readBody<Record<string, unknown>>(event)

  return laravelFetch(event, `/properties/${encodeURIComponent(String(id))}`, {
    method: 'PATCH',
    body: pickPropertyBody(raw)
  })
})
