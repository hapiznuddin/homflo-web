import type { CreatedHouseholdInvitation } from '~/types/householdInvitations'
import type { HouseholdMemberItem } from '~/types/householdMembers'
import { readError, readFieldErrors } from '~/composables/useApiError'

interface HouseholdMembersResponse {
  success: boolean
  data: HouseholdMemberItem[]
}

interface CreateInvitationResponse {
  success: boolean
  data: CreatedHouseholdInvitation
}

const FALLBACK_ERROR = 'Data anggota rumah tangga belum dapat dimuat.'

export function useHouseholdMembers() {
  const auth = useAuth()
  const items = useState<HouseholdMemberItem[]>('household-members-items', () => [])
  const pending = useState<boolean>('household-members-pending', () => false)
  const submitting = useState<boolean>('household-members-submitting', () => false)
  const error = useState<string | null>('household-members-error', () => null)
  const inviteFieldErrors = useState<Record<string, string>>(
    'household-members-invite-field-errors',
    () => ({})
  )
  const inflight = useState<boolean>('household-members-inflight', () => false)
  const loaded = useState<boolean>('household-members-loaded', () => false)
  const loadedFor = useState<string | null>('household-members-loaded-for', () => null)

  function requestHeaders(): Record<string, string> {
    // SSR tidak membawa cookie browser secara otomatis. Teruskan cookie
    // request agar Laravel melihat sesi yang sama (pola useCategories).
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

    // Setup halaman berjalan di server dan client. Jangan ulangi request
    // yang sama setelah state SSR ter-hidrasi.
    if (!force && loadedFor.value === householdId) {
      return
    }

    inflight.value = true
    pending.value = true
    error.value = null

    try {
      const response = await $fetch<HouseholdMembersResponse>(
        `/api/households/${encodeURIComponent(householdId)}/members`,
        { credentials: 'include', headers: requestHeaders() }
      )
      items.value = response.data
      loaded.value = true
      loadedFor.value = householdId
    } catch (caught: unknown) {
      error.value = readError(caught, FALLBACK_ERROR)
      loadedFor.value = null
    } finally {
      pending.value = false
      inflight.value = false
    }
  }

  async function refresh(): Promise<void> {
    await load(true)
  }

  async function invite(email: string): Promise<CreatedHouseholdInvitation | null> {
    const householdId = auth.household.value?.id

    if (!householdId || submitting.value) {
      return null
    }

    submitting.value = true
    error.value = null
    inviteFieldErrors.value = {}

    try {
      const response = await $fetch<CreateInvitationResponse>(
        `/api/households/${encodeURIComponent(householdId)}/invitations`,
        {
          method: 'POST',
          credentials: 'include',
          headers: requestHeaders(),
          body: { email: email.trim() }
        }
      )

      return response.data
    } catch (caught: unknown) {
      error.value = readError(caught, 'Undangan belum dapat dibuat.')
      inviteFieldErrors.value = readFieldErrors(caught)

      return null
    } finally {
      submitting.value = false
    }
  }

  async function changeRole(memberId: string, role: HouseholdMemberItem['role']): Promise<boolean> {
    const householdId = auth.household.value?.id

    if (!householdId || submitting.value) {
      return false
    }

    submitting.value = true
    error.value = null

    try {
      const response = await $fetch<{ success: boolean; data: HouseholdMemberItem }>(
        `/api/households/${encodeURIComponent(householdId)}/members/${encodeURIComponent(memberId)}`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: requestHeaders(),
          body: { role }
        }
      )
      items.value = items.value.map(member => member.id === memberId ? response.data : member)

      return true
    } catch (caught: unknown) {
      error.value = readError(caught, 'Peran anggota belum dapat diubah.')

      return false
    } finally {
      submitting.value = false
    }
  }

  async function remove(memberId: string): Promise<boolean> {
    const householdId = auth.household.value?.id

    if (!householdId || submitting.value) {
      return false
    }

    submitting.value = true
    error.value = null

    try {
      await $fetch(`/api/households/${encodeURIComponent(householdId)}/members/${encodeURIComponent(memberId)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: requestHeaders()
      })
      items.value = items.value.filter(member => member.id !== memberId)

      return true
    } catch (caught: unknown) {
      error.value = readError(caught, 'Anggota belum dapat dihapus.')

      return false
    } finally {
      submitting.value = false
    }
  }

  // Bersihkan pesan undangan saat pengguna mengetik ulang email, tanpa
  // menyentuh error daftar anggota yang mungkin masih relevan.
  function clearInviteError(): void {
    inviteFieldErrors.value = {}
    error.value = null
  }

  return {
    items,
    pending,
    submitting,
    error,
    inviteFieldErrors,
    loaded,
    load,
    refresh,
    invite,
    changeRole,
    remove,
    clearInviteError
  }
}
