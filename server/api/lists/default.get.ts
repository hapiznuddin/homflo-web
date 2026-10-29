// Default list household aktif. Backend memetakan pointer null/archived/
// non-shopping ke error envelope; proxy meneruskan status aslinya.
export default defineEventHandler(async (event) => {
  return laravelFetch(event, '/lists/default')
})
