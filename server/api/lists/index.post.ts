// Membuat list. Field di-whitelist sesuai StoreListRequest; household dan
// created_by ditentukan server dari session.
import { pickListCreateBody } from '../../utils/listBody'

export default defineEventHandler(async (event) => {
  const raw = await readBody<Record<string, unknown>>(event)

  return laravelFetch(event, '/lists', {
    method: 'POST',
    body: pickListCreateBody(raw)
  })
})
