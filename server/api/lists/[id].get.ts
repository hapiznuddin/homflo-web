// Detail satu list (termasuk archived untuk restore/deep link). ID
// diteruskan apa adanya; Laravel melakukan household scoping + 404 mask.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  return laravelFetch(event, `/lists/${encodeURIComponent(String(id))}`)
})
