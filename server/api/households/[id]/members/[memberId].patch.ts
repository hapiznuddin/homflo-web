export default defineEventHandler(async (event) => {
  const householdId = getRouterParam(event, 'id')
  const memberId = getRouterParam(event, 'memberId')
  const body = await readBody<Record<string, unknown>>(event)

  return laravelFetch(
    event,
    `/households/${encodeURIComponent(String(householdId))}/members/${encodeURIComponent(String(memberId))}`,
    { method: 'PATCH', body: { role: body?.role } }
  )
})
