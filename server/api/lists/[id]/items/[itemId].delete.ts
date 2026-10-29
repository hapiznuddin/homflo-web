// Menghapus item tanpa Expense. Item dengan Expense ditolak 409 oleh
// backend dan ledger tidak pernah disentuh dari sini.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const itemId = getRouterParam(event, 'itemId')

  return laravelFetch(
    event,
    `/lists/${encodeURIComponent(String(id))}/items/${encodeURIComponent(String(itemId))}`,
    { method: 'DELETE' }
  )
})
