// Complete item. actual_price opsional; string kosong tidak dikirim agar
// snapshot lama tidak terhapus tanpa sengaja.
import { pickListCompleteBody } from '../../../../../utils/listBody'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const itemId = getRouterParam(event, 'itemId')
  const raw = await readBody<Record<string, unknown>>(event).catch(() => ({}))

  return laravelFetch(
    event,
    `/lists/${encodeURIComponent(String(id))}/items/${encodeURIComponent(String(itemId))}/complete`,
    {
      method: 'POST',
      body: pickListCompleteBody(raw)
    }
  )
})
