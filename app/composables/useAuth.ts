export interface AuthUser {
  id: string
  username: string
  name: string
  email: string
  email_verified_at: string | null
}

export interface MeData {
  user: AuthUser
  household: { id: string, name: string, role: string } | null
  onboarding: { required: boolean }
}

function useApiBase(): string {
  const config = useRuntimeConfig()

  return (config.public.apiBase as string).replace(/\/+$/, '')
}

export function useAuth() {
  const user = useState<AuthUser | null>('auth-user', () => null)
  // Loading-first: the initial render must show the loading state, never
  // the error state, so SSR/hydration cannot flash a failure.
  const pending = useState<boolean>('auth-pending', () => true)
  const error = useState<string | null>('auth-error', () => null)
  const inflight = useState<boolean>('auth-inflight', () => false)

  // Bootstrap through the Nuxt server boundary (/api/auth/me), never
  // directly against Laravel /api/me from the browser.
  async function fetchMe(): Promise<AuthUser | null> {
    // A bootstrap request is already running; the in-flight request will
    // resolve the shared state. Never fire a duplicate request.
    if (inflight.value) {
      return user.value
    }

    inflight.value = true
    pending.value = true
    error.value = null
    user.value = null

    try {
      const response = await $fetch<{ success: boolean, data: MeData }>('/api/auth/me', {
        credentials: 'include',
        headers: { Accept: 'application/json' }
      })
      user.value = response.data.user
      return user.value
    } catch {
      user.value = null
      error.value = 'Sesi tidak ditemukan. Silakan login kembali.'
      return null
    } finally {
      pending.value = false
      inflight.value = false
    }
  }

  async function logout(): Promise<void> {
    await $fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' }
    })
    user.value = null
  }

  function loginWithGoogle(): void {
    // Top-level navigation to the backend OAuth entry. The backend sets
    // the session cookie and redirects back to /auth/callback.
    window.location.href = `${useApiBase()}/auth/google/redirect`
  }

  return { user, pending, error, fetchMe, logout, loginWithGoogle }
}
