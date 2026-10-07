export default defineNuxtRouteMiddleware(async (to) => {
  // OAuth return path renders its own processing modal on the page; let
  // the page resolve bootstrap and redirect itself instead of stealing
  // the navigation here.
  if (to.query.oauth === 'processing') {
    return
  }

  const auth = useAuth()
  const status = await auth.bootstrap()

  if (status === 'authenticated') {
    return navigateTo(auth.postAuthDestination())
  }
})
