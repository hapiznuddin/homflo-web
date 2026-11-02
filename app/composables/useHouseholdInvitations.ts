import type {
  HouseholdInvitationItem,
  RevokedHouseholdInvitation
} from '~/types/householdInvitations'
import { readError, readErrorCode } from '~/composables/useApiError'

interface InvitationsResponse {
  success: boolean
  data: HouseholdInvitationItem[]
}

interface RevokeResponse {
  success: boolean
  data: RevokedHouseholdInvitation
}

const FALLBACK_LOAD_ERROR = 'Undangan rumah tangga belum dapat dimuat.'
const FALLBACK_REVOKE_ERROR = 'Undangan belum dapat dicabut.'

export function useHouseholdInvitations() {
  const auth = useAuth()
  const householdScope = useHouseholdScope()
  const items = useState<HouseholdInvitationItem[]>('household-pending-invitations-items', () => [])
  const pending = useState<boolean>('household-pending-invitations-pending', () => false)
  const submitting = useState<boolean>('household-pending-invitations-submitting', () => false)
  const error = useState<string | null>('household-pending-invitations-error', () => null)
  const inflight = useState<boolean>('household-pending-invitations-inflight', () => false)
  const loaded = useState<boolean>('household-pending-invitations-loaded', () => false)
  const loadedFor = useState<string | null>('household-pending-invitations-loaded-for', () => null)

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

  async function load(force = false): Promise<void> {
    const householdId = auth.household.value?.id

    if (!householdId || inflight.value) {
      return
    }

    if (!force && loadedFor.value === householdId && loaded.value && !error.value) {
      return
    }

    const requestToken = householdScope.token()

    inflight.value = true
    pending.value = true
    error.value = null

    try {
      // `all` lets the owner see pending and terminal rows (expired,
      // accepted, revoked) without inventing client-side status.
      const response = await $fetch<InvitationsResponse>(
        `/api/households/${encodeURIComponent(householdId)}/invitations?status=all`,
        { credentials: 'include', headers: requestHeaders() }
      )

      if (!householdScope.isCurrent(requestToken)) {
        return
      }

      items.value = response.data
      loaded.value = true
      loadedFor.value = householdId
    } catch (caught: unknown) {
      if (!householdScope.isCurrent(requestToken)) {
        return
      }

      error.value = readError(caught, FALLBACK_LOAD_ERROR)
      loadedFor.value = null
    } finally {
      if (householdScope.isCurrent(requestToken)) {
        pending.value = false
        inflight.value = false
      }
    }
  }

  async function refresh(): Promise<void> {
    await load(true)
  }

  async function revoke(invitationId: string): Promise<boolean> {
    const householdId = auth.household.value?.id

    if (!householdId || !invitationId || submitting.value) {
      return false
    }

    submitting.value = true
    error.value = null

    try {
      const response = await $fetch<RevokeResponse>(
        `/api/households/${encodeURIComponent(householdId)}/invitations/${encodeURIComponent(invitationId)}/revoke`,
        {
          method: 'POST',
          credentials: 'include',
          headers: requestHeaders()
        }
      )

      items.value = items.value.map(item =>
        item.id === invitationId
          ? { ...item, status: response.data.status, revoked_at: response.data.revoked_at }
          : item
      )

      return true
    } catch (caught: unknown) {
      error.value = readError(caught, FALLBACK_REVOKE_ERROR)

      // A terminal row (for example accepted elsewhere) must stop offering
      // revoke even before the next refresh.
      const code = readErrorCode(caught)

      if (code === 'INVITATION_ALREADY_ACCEPTED') {
        items.value = items.value.map(item =>
          item.id === invitationId ? { ...item, status: 'accepted' } : item
        )
      } else if (code === 'INVITATION_NOT_FOUND') {
        items.value = items.value.filter(item => item.id !== invitationId)
      }

      return false
    } finally {
      submitting.value = false
    }
  }

  function clearError(): void {
    error.value = null
  }

  return { items, pending, submitting, error, loaded, load, refresh, revoke, clearError }
}
