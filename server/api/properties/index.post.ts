// Membuat Property. Field di-whitelist sesuai StorePropertyRequest;
// household_id dan lifecycle arsip tidak pernah diteruskan.
import { pickPropertyBody } from '../../utils/propertyBody'

export default defineEventHandler(async (event) => {
  const raw = await readBody<Record<string, unknown>>(event)

  return laravelFetch(event, '/properties', {
    method: 'POST',
    body: pickPropertyBody(raw)
  })
})
