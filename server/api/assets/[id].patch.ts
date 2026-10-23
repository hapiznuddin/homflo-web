// Mengubah aset. Field di-whitelist sesuai UpdateAssetRequest; ownership
// tidak pernah dapat diubah dari sini.
import { pickAssetBody } from '../../utils/assetBody'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const raw = await readBody<Record<string, unknown>>(event)

  return laravelFetch(event, `/assets/${encodeURIComponent(String(id))}`, {
    method: 'PATCH',
    body: pickAssetBody(raw)
  })
})
