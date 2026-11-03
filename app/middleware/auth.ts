import { safeRedirectPath } from '~/utils/redirect'

export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuth()
  const status = await auth.bootstrap()

  if (status === 'authenticated') {
    return
  }

  const fullPath = to.fullPath || to.path
  const redirect = safeRedirectPath(fullPath)

  if (status === 'error') {
    const query: Record<string, string> = { offline: '1' }
    if (redirect) {
      query.redirect = redirect
    }
    return navigateTo({ path: '/login', query })
  }

  const query: Record<string, string> = {}
  if (redirect) {
    query.redirect = redirect
  }
  return navigateTo({ path: '/login', query })
})
