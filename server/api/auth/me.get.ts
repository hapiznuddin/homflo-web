export default defineEventHandler(async (event) => {
  return $fetch(`${laravelBase()}/me`, {
    headers: {
      Accept: 'application/json',
      ...forwardAuthHeaders(event)
    }
  })
})
