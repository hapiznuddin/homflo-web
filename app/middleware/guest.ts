export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuth()
  const status = await auth.bootstrap()

  if (status === 'authenticated') {
    return navigateTo('/dashboard')
  }
})
