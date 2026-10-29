import type { HouseholdInvitationSummary } from '~/types/householdInvitations'
import type { HouseholdMemberItem } from '~/types/householdMembers'
import { readError } from '~/composables/useApiError'

interface InvitationsResponse {
  success: boolean
  data: HouseholdInvitationSummary[]
}

interface AcceptInvitationResponse {
  success: boolean
  data: HouseholdMemberItem
}

const FALLBACK_ERROR = 'Undangan belum dapat dimuat.'

export function useInvitations() {
  const items = useState<HouseholdInvitationSummary[]>('household-invitations-items', () => [])
  const pending = useState<boolean>('household-invitations-pending', () => false)
  const submitting = useState<boolean>('household-invitations-submitting', () => false)
  const error = useState<string | null>('household-invitations-error', () => null)
  const inflight = useState<boolean>('household-invitations-inflight', () => false)
  const loaded = useState<boolean>('household-invitations-loaded', () => false)

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
    if (inflight.value) {
      return
    }

    if (!force && loaded.value) {
      return
    }

    inflight.value = true
    pending.value = true
    error.value = null

    try {
      const response = await $fetch<InvitationsResponse>('/api/invitations', {
        credentials: 'include',
        headers: requestHeaders()
      })
      items.value = response.data
      loaded.value = true
    } catch (caught: unknown) {
      error.value = readError(caught, FALLBACK_ERROR)
      loaded.value = false
    } finally {
      pending.value = false
      inflight.value = false
    }
  }

  async function refresh(): Promise<void> {
    await load(true)
  }

  async function accept(invitationId: string, token: string): Promise<HouseholdMemberItem | null> {
    if (!invitationId || !token.trim() || submitting.value) {
      return null
    }

    submitting.value = true
    error.value = null

    try {
      const response = await $fetch<AcceptInvitationResponse>(
        `/api/invitations/${encodeURIComponent(invitationId)}/accept`,
        {
          method: 'POST',
          credentials: 'include',
          headers: requestHeaders(),
          body: { token: token.trim() }
        }
      )

      items.value = items.value.filter(item => item.id !== invitationId)

      return response.data
    } catch (caught: unknown) {
      error.value = readError(caught, 'Undangan belum dapat diterima.')

      return null
    } finally {
      submitting.value = false
    }
  }

  return { items, pending, submitting, error, load, refresh, accept }
}
