import { safeRedirectPath } from '~/utils/redirect'

export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuth()
  const status = await auth.bootstrap()

  if (status !== 'authenticated') {
    const fullPath = to.fullPath || to.path
    const redirect = safeRedirectPath(fullPath)
    const query: Record<string, string> = {}
    if (redirect) {
      query.redirect = redirect
    }
    return navigateTo({ path: '/login', query })
  }

  if (!auth.isEmailVerified.value) {
    return navigateTo('/verify-email')
  }
})
