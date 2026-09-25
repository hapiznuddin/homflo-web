export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuth()
  const status = await auth.bootstrap()

  if (status !== 'authenticated') {
    return navigateTo('/login')
  }

  if (!auth.isEmailVerified.value) {
    return navigateTo('/verify-email')
  }
})
