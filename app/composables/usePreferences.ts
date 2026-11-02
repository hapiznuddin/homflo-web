import type { ThemePreference } from '~/types/preferences'
import { isThemePreference } from '~/types/preferences'
import { readError } from '~/composables/useApiError'

interface PreferencesResponse {
  success: boolean
  data: { theme: ThemePreference }
}

const THEME_COOKIE = 'homflo-color-mode'
const FALLBACK_ERROR = 'Preferensi tema belum dapat dimuat.'

export function usePreferences() {
  const colorMode = useColorMode()
  const themeCookie = useCookie<ThemePreference | null>(THEME_COOKIE, {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365
  })
  const theme = useState<ThemePreference>('preferences-theme', () => 'system')
  const pending = useState<boolean>('preferences-pending', () => false)
  const submitting = useState<boolean>('preferences-submitting', () => false)
  const error = useState<string | null>('preferences-error', () => null)
  const loaded = useState<boolean>('preferences-loaded', () => false)
  const inflight = useState<boolean>('preferences-inflight', () => false)

  function requestHeaders(): Record<string, string> {
    const headers: Record<string, string> = { Accept: 'application/json' }

    if (import.meta.server) {
      const { cookie } = useRequestHeaders(['cookie'])

      if (cookie) {
        headers.Cookie = cookie
      }
    }

    return headers
  }

  // The cookie is only an SSR paint cache. The backend response always wins
  // and is the only value written by load/update.
  function applyTheme(next: ThemePreference): void {
    theme.value = next
    colorMode.preference = next
    themeCookie.value = next
  }

  async function load(force = false): Promise<void> {
    if (inflight.value) {
      return
    }

    if (!force && loaded.value && !error.value) {
      return
    }

    inflight.value = true
    pending.value = true
    error.value = null

    try {
      const response = await $fetch<PreferencesResponse>('/api/preferences', {
        credentials: 'include',
        headers: requestHeaders()
      })
      const next = isThemePreference(response.data.theme) ? response.data.theme : 'system'

      applyTheme(next)
      loaded.value = true
    } catch (caught: unknown) {
      error.value = readError(caught, FALLBACK_ERROR)
      loaded.value = false
    } finally {
      pending.value = false
      inflight.value = false
    }
  }

  async function update(next: ThemePreference): Promise<boolean> {
    if (submitting.value || !isThemePreference(next)) {
      return false
    }

    submitting.value = true
    error.value = null

    try {
      const response = await $fetch<PreferencesResponse>('/api/preferences', {
        method: 'PATCH',
        credentials: 'include',
        headers: requestHeaders(),
        body: { theme: next }
      })
      const saved = isThemePreference(response.data.theme) ? response.data.theme : next

      applyTheme(saved)
      loaded.value = true
      return true
    } catch (caught: unknown) {
      error.value = readError(caught, 'Preferensi tema belum dapat disimpan.')
      return false
    } finally {
      submitting.value = false
    }
  }

  return { theme, pending, submitting, error, loaded, load, update }
}
