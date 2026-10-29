// Uncomplete item. Tanpa body; backend mempertahankan actual_price dan
// tidak menyentuh Expense.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const itemId = getRouterParam(event, 'itemId')

  return laravelFetch(
    event,
    `/lists/${encodeURIComponent(String(id))}/items/${encodeURIComponent(String(itemId))}/uncomplete`,
    { method: 'POST' }
  )
})
