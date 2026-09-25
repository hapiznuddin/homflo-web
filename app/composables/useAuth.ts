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
  onboarding: { required: boolean }
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
      const response = await $fetch<{ success: boolean; data: MeData }>('/api/auth/me', {
        credentials: 'include',
        headers: { Accept: 'application/json' }
      })
      user.value = response.data.user
      household.value = response.data.household
      onboarding.value = response.data.onboarding
      status.value = 'authenticated'
      return status.value
    } catch (err) {
      if (isUnauthorized(err)) {
        user.value = null
        household.value = null
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
    onboarding.value = { required: false }
    error.value = null
    status.value = 'unauthenticated'
  }

  async function logout(): Promise<void> {
    await $fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' }
    })
    markUnauthenticated()
  }

  function loginWithGoogle(): void {
    // Top-level navigation to the backend OAuth entry. The backend sets
    // the session cookie and redirects back to /auth/callback.
    window.location.href = `${useApiBase()}/auth/google/redirect`
  }

  return {
    user,
    household,
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
    markUnauthenticated
  }
}
