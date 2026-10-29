// Membuat Expense dari item completed. Body di-whitelist; amount,
// description, source, dan household selalu ditentukan backend.
import { pickListExpenseBody } from '../../../../../utils/listBody'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const itemId = getRouterParam(event, 'itemId')
  const raw = await readBody<Record<string, unknown>>(event).catch(() => ({}))

  return laravelFetch(
    event,
    `/lists/${encodeURIComponent(String(id))}/items/${encodeURIComponent(String(itemId))}/expense`,
    {
      method: 'POST',
      body: pickListExpenseBody(raw)
    }
  )
})
