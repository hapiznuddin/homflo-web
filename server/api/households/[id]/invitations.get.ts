// Owner-side invitation list. Status filtering stays a Laravel concern; the
// proxy only forwards a scalar status query and never invents one.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const query = getQuery(event)
  const status = typeof query.status === 'string' ? query.status : ''
  const suffix = status === '' ? '' : `?status=${encodeURIComponent(status)}`

  return laravelFetch(
    event,
    `/households/${encodeURIComponent(String(id))}/invitations${suffix}`
  )
})
