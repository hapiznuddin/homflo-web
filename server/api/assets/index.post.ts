// Membuat aset. Field di-whitelist sesuai StoreAssetRequest; household
// ditentukan server dari session.
import { pickAssetBody } from '../../utils/assetBody'

export default defineEventHandler(async (event) => {
  const raw = await readBody<Record<string, unknown>>(event)

  return laravelFetch(event, '/assets', {
    method: 'POST',
    body: pickAssetBody(raw)
  })
})
