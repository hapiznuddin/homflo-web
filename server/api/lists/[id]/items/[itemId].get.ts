// Detail satu item. Endpoint ini additive (di luar MVP) dan sudah
// digunakan composable; Laravel memvalidasi pasangan list/item.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const itemId = getRouterParam(event, 'itemId')

  return laravelFetch(
    event,
    `/lists/${encodeURIComponent(String(id))}/items/${encodeURIComponent(String(itemId))}`
  )
})
