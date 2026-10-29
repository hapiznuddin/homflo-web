// Menambah item. Field di-whitelist sesuai StoreListItemRequest; list_id,
// created_by, dan lifecycle ditentukan server.
import { pickListItemCreateBody } from '../../../../utils/listBody'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const raw = await readBody<Record<string, unknown>>(event)

  return laravelFetch(event, `/lists/${encodeURIComponent(String(id))}/items`, {
    method: 'POST',
    body: pickListItemCreateBody(raw)
  })
})
