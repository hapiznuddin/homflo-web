export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error'

export interface AuthUser {
  id: string
  username: string
  name: string
  email: string
  email_verified_at: string | null
}

export interface AuthHousehold {
  id: string
  name: string
  role: string
}

export interface MeData {
  user: AuthUser
  household: AuthHousehold | null
  households: AuthHousehold[]
  onboarding: { required: boolean }
}

export interface AuthHouseholdContext {
  household: AuthHousehold | null
  households?: AuthHousehold[]
  onboarding?: { required: boolean }
}

export type AuthorizableAction =
  | 'household.create'
  | 'household.invite'
  | 'member.list'
  | 'member.update'
  | 'member.remove'
  | 'invitation.accept'

function useApiBase(): string {
  const config = useRuntimeConfig()

  return (config.public.apiBase as string).replace(/\/+$/, '')
}

function isUnauthorized(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    (error as { statusCode?: number }).statusCode === 401
  )
}

export function useAuth() {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const household = useState<AuthHousehold | null>('auth-household', () => null)
  const households = useState<AuthHousehold[]>('auth-households', () => [])
  const onboarding = useState<{ required: boolean }>('auth-onboarding', () => ({ required: false }))
  const status = useState<AuthStatus>('auth-status', () => 'idle')
  const error = useState<string | null>('auth-error', () => null)
  const inflight = useState<boolean>('auth-inflight', () => false)

  const isAuthenticated = computed(() => status.value === 'authenticated')
  const isGuest = computed(() => status.value === 'unauthenticated')
  const isEmailVerified = computed(
    () => user.value?.email_verified_at !== null && user.value !== null
  )
  const hasHousehold = computed(() => household.value !== null)
  const isHouseholdOwner = computed(() => household.value?.role === 'owner')
  const isHouseholdMember = computed(() => household.value !== null)

  // UX-only helper. The Laravel backend (HouseholdPolicy) remains the
  // final authority; this only decides what the UI shows or hides.
  function can(action: AuthorizableAction): boolean {
    if (!isAuthenticated.value) {
      return false
    }

    switch (action) {
      case 'household.invite':
      case 'member.update':
      case 'member.remove':
        return isHouseholdOwner.value
      case 'household.create':
      case 'member.list':
      case 'invitation.accept':
        return true
    }
  }

  // Single shared bootstrap through the Nuxt server boundary
  // (/api/auth/me), never directly against Laravel /api/me.
  // 401 → unauthenticated. Network/5xx → error state that keeps the
  // last-known user instead of logging out (offline-safe).
  async function bootstrap(): Promise<AuthStatus> {
    if (inflight.value) {
      return status.value
    }

    // Already resolved in this client session; pages and middleware reuse it.
    if (status.value === 'authenticated' || status.value === 'unauthenticated') {
      return status.value
    }

    inflight.value = true
    status.value = 'loading'
    error.value = null

    try {
      // Server-side rendering has no browser cookies of its own: forward
      // them explicitly so SSR resolves the real session instead of always
      // looking like a guest.
      const headers: Record<string, string> = { Accept: 'application/json' }

      if (import.meta.server) {
        const { cookie } = useRequestHeaders(['cookie'])

        if (cookie) {
          headers.Cookie = cookie
        }
      }

      const response = await $fetch<{ success: boolean; data: MeData }>('/api/auth/me', {
        credentials: 'include',
        headers
      })
      user.value = response.data.user
      household.value = response.data.household
      households.value = response.data.households ?? []
      onboarding.value = response.data.onboarding
      status.value = 'authenticated'

      // Backend preference is the authority. Loading it here also lets SSR
      // emit the theme cookie before the document paints, so the first frame
      // already matches the user's preference. Failures never affect auth.
      await usePreferences().load()

      return status.value
    } catch (err) {
      if (isUnauthorized(err)) {
        user.value = null
        household.value = null
        households.value = []
        status.value = 'unauthenticated'
      } else {
        error.value = 'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.'
        status.value = 'error'
      }
      return status.value
    } finally {
      inflight.value = false
    }
  }

  // Force a fresh bootstrap (e.g. right after login/logout).
  async function refresh(): Promise<AuthStatus> {
    status.value = 'idle'
    return bootstrap()
  }

  // Back-compat alias used by the OAuth callback page.
  const fetchMe = bootstrap
  const pending = computed(() => status.value === 'loading' || status.value === 'idle')

  function markUnauthenticated(): void {
    user.value = null
    household.value = null
    households.value = []
    onboarding.value = { required: false }
    error.value = null
    status.value = 'unauthenticated'
  }

  // Apply a server-confirmed household context. Only server responses call
  // this; the client never guesses the active household or its role.
  function applyHouseholdContext(context: AuthHouseholdContext): void {
    if (context.households) {
      households.value = context.households
    }

    household.value = context.household

    if (!context.households && context.household) {
      const index = households.value.findIndex(item => item.id === context.household!.id)

      if (index === -1) {
        households.value = [...households.value, context.household]
      } else {
        households.value = households.value.map(item =>
          item.id === context.household!.id ? context.household! : item
        )
      }
    }

    if (context.onboarding) {
      onboarding.value = context.onboarding
    }
  }

  async function logout(): Promise<void> {
    await $fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' }
    })
    markUnauthenticated()
  }

  // Shared Google OAuth entry for Login and Register. Real browser
  // navigation (not fetch): Laravel redirects to Google, then back with
  // a fresh session cookie.
  const oauthRedirecting = useState<boolean>('auth-oauth-redirecting', () => false)
  const oauthProcessing = useState<boolean>('auth-oauth-processing', () => false)

  // UI-only intent remembering which page started OAuth. It is never an
  // authentication authority; the backend session decides everything.
  function setOAuthIntent(page: 'login' | 'register'): void {
    try {
      sessionStorage.setItem('homflo-oauth-intent', page)
    } catch {
      // Storage unavailable: callback falls back to login.
    }
  }

  function takeOAuthIntent(): 'login' | 'register' {
    try {
      const intent = sessionStorage.getItem('homflo-oauth-intent')
      sessionStorage.removeItem('homflo-oauth-intent')

      return intent === 'register' ? 'register' : 'login'
    } catch {
      return 'login'
    }
  }

  function startGoogleOAuth(page: 'login' | 'register'): void {
    if (oauthRedirecting.value) {
      return
    }

    setOAuthIntent(page)
    oauthRedirecting.value = true
    window.location.href = `${useApiBase()}/auth/google/redirect`
  }

  // Back-compat alias.
  const loginWithGoogle = () => startGoogleOAuth('login')

  // Post-auth destination from backend onboarding state. Backend is the
  // authority; the client never guesses household state.
  function postAuthDestination(): string {
    return onboarding.value.required ? '/onboarding' : '/dashboard'
  }

  return {
    user,
    household,
    households,
    onboarding,
    status,
    pending,
    error,
    isAuthenticated,
    isGuest,
    isEmailVerified,
    hasHousehold,
    isHouseholdOwner,
    isHouseholdMember,
    can,
    bootstrap,
    refresh,
    fetchMe,
    logout,
    loginWithGoogle,
    startGoogleOAuth,
    oauthRedirecting,
    oauthProcessing,
    setOAuthIntent,
    takeOAuthIntent,
    postAuthDestination,
    markUnauthenticated,
    applyHouseholdContext
  }
}
