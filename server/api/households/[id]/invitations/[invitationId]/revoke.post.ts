// Revoke one invitation in a household. The invitation must belong to the
// route household; Laravel masks foreign ids as 404.
export default defineEventHandler(async (event) => {
  const householdId = getRouterParam(event, 'id')
  const invitationId = getRouterParam(event, 'invitationId')

  return laravelFetch(
    event,
    `/households/${encodeURIComponent(String(householdId))}/invitations/${encodeURIComponent(String(invitationId))}/revoke`,
    { method: 'POST' }
  )
})
