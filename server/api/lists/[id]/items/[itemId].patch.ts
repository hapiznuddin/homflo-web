// Mengubah item. actual_price hanya diterima backend saat item completed
// dan belum punya Expense; field lifecycle tetap server-owned.
import { pickListItemUpdateBody } from '../../../../utils/listBody'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const itemId = getRouterParam(event, 'itemId')
  const raw = await readBody<Record<string, unknown>>(event)

  return laravelFetch(
    event,
    `/lists/${encodeURIComponent(String(id))}/items/${encodeURIComponent(String(itemId))}`,
    {
      method: 'PATCH',
      body: pickListItemUpdateBody(raw)
    }
  )
})
