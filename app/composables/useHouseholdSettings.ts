import type { AuthHousehold } from '~/composables/useAuth'
import { readError, readFieldErrors } from '~/composables/useApiError'

interface HouseholdContextResponse {
  success: boolean
  data: {
    household: AuthHousehold
    households?: AuthHousehold[]
    onboarding?: { required: boolean }
  }
}

const FALLBACK_RENAME_ERROR = 'Nama rumah tangga belum dapat disimpan.'
const FALLBACK_SWITCH_ERROR = 'Rumah tangga belum dapat diganti.'

export function useHouseholdSettings() {
  const auth = useAuth()
  const householdScope = useHouseholdScope()
  const renaming = useState<boolean>('household-settings-renaming', () => false)
  const renameError = useState<string | null>('household-settings-rename-error', () => null)
  const renameFieldErrors = useState<Record<string, string>>(
    'household-settings-rename-field-errors',
    () => ({})
  )
  const switchingId = useState<string | null>('household-settings-switching-id', () => null)
  const switchError = useState<string | null>('household-settings-switch-error', () => null)

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

  async function rename(name: string): Promise<boolean> {
    const householdId = auth.household.value?.id
    const trimmed = name.trim()

    if (!householdId || renaming.value) {
      return false
    }

    renameError.value = null
    renameFieldErrors.value = {}

    if (trimmed === '') {
      renameFieldErrors.value = { name: 'Nama rumah tangga wajib diisi.' }

      return false
    }

    renaming.value = true

    try {
      const response = await $fetch<HouseholdContextResponse>(
        `/api/households/${encodeURIComponent(householdId)}`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: requestHeaders(),
          body: { name: trimmed }
        }
      )

      auth.applyHouseholdContext(response.data)
      return true
    } catch (caught: unknown) {
      renameError.value = readError(caught, FALLBACK_RENAME_ERROR)
      renameFieldErrors.value = readFieldErrors(caught)

      return false
    } finally {
      renaming.value = false
    }
  }

  async function activate(householdId: string): Promise<boolean> {
    if (!householdId || switchingId.value !== null) {
      return false
    }

    if (auth.household.value?.id === householdId) {
      return true
    }

    switchingId.value = householdId
    switchError.value = null

    try {
      const response = await $fetch<HouseholdContextResponse>(
        `/api/households/${encodeURIComponent(householdId)}/activate`,
        {
          method: 'POST',
          credentials: 'include',
          headers: requestHeaders()
        }
      )

      auth.applyHouseholdContext(response.data)
      // The auth watcher also invalidates, but an explicit call keeps the
      // guarantee even when no other household composable is mounted.
      householdScope.invalidate()

      return true
    } catch (caught) {
      // Keep the old household active: the backend did not confirm a switch.
      switchError.value = readError(caught, FALLBACK_SWITCH_ERROR)

      return false
    } finally {
      switchingId.value = null
    }
  }

  function clearRenameErrors(): void {
    renameError.value = null
    renameFieldErrors.value = {}
  }

  function clearSwitchError(): void {
    switchError.value = null
  }

  return {
    renaming,
    renameError,
    renameFieldErrors,
    switchingId,
    switchError,
    rename,
    activate,
    clearRenameErrors,
    clearSwitchError
  }
}
