// Member list selalu diteruskan lewat boundary Nuxt. Laravel menentukan
// household dari route binding dan policy; browser tidak pernah mengirim role.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  return laravelFetch(event, `/households/${encodeURIComponent(String(id))}/members`)
})
