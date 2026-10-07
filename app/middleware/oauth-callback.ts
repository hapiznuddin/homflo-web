// Transient OAuth handoff. This middleware redirects before the callback
// page ever renders, so the user never sees a callback screen. The
// originating auth page (login/register, via UI-only sessionStorage intent)
// then shows the processing modal and resolves the session itself.
export default defineNuxtRouteMiddleware(() => {
  const auth = useAuth()
  const intent = auth.takeOAuthIntent()

  return navigateTo({ path: `/${intent}`, query: { oauth: 'processing' } })
})
