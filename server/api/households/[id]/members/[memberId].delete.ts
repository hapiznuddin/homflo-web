export default defineEventHandler(async (event) => {
  const householdId = getRouterParam(event, 'id')
  const memberId = getRouterParam(event, 'memberId')

  return laravelFetch(
    event,
    `/households/${encodeURIComponent(String(householdId))}/members/${encodeURIComponent(String(memberId))}`,
    { method: 'DELETE' }
  )
})
