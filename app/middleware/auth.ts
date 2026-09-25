export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuth()
  const status = await auth.bootstrap()

  if (status === 'authenticated') {
    return
  }

  if (status === 'error') {
    return navigateTo({ path: '/login', query: { offline: '1' } })
  }

  return navigateTo('/login')
})
