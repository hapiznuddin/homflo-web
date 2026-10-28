import type { HouseholdMemberItem } from '~/types/householdMembers'

interface HouseholdMembersResponse {
  success: boolean
  data: HouseholdMemberItem[]
}

function errorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: unknown }).data

    if (typeof data === 'object' && data !== null && 'error' in data) {
      const apiError = (data as { error?: { message?: unknown } }).error

      if (typeof apiError?.message === 'string') {
        return apiError.message
      }
    }
  }

  return 'Data anggota rumah tangga belum dapat dimuat.'
}

export function useHouseholdMembers() {
  const auth = useAuth()
  const items = useState<HouseholdMemberItem[]>('household-members-items', () => [])
  const pending = useState<boolean>('household-members-pending', () => false)
  const submitting = useState<boolean>('household-members-submitting', () => false)
  const error = useState<string | null>('household-members-error', () => null)

  async function load(): Promise<void> {
    const householdId = auth.household.value?.id

    if (!householdId || pending.value) {
      return
    }

    pending.value = true
    error.value = null

    try {
      const response = await $fetch<HouseholdMembersResponse>(
        `/api/households/${encodeURIComponent(householdId)}/members`,
        { credentials: 'include' }
      )
      items.value = response.data
    } catch (caught: unknown) {
      error.value = errorMessage(caught)
    } finally {
      pending.value = false
    }
  }

  async function invite(email: string): Promise<boolean> {
    const householdId = auth.household.value?.id

    if (!householdId || submitting.value) {
      return false
    }

    submitting.value = true
    error.value = null

    try {
      await $fetch(`/api/households/${encodeURIComponent(householdId)}/invitations`, {
        method: 'POST',
        credentials: 'include',
        body: { email: email.trim() }
      })

      return true
    } catch (caught: unknown) {
      error.value = errorMessage(caught)

      return false
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
        { method: 'PATCH', credentials: 'include', body: { role } }
      )
      items.value = items.value.map(member => member.id === memberId ? response.data : member)

      return true
    } catch (caught: unknown) {
      error.value = errorMessage(caught)

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
        credentials: 'include'
      })
      items.value = items.value.filter(member => member.id !== memberId)

      return true
    } catch (caught: unknown) {
      error.value = errorMessage(caught)

      return false
    } finally {
      submitting.value = false
    }
  }

  return { items, pending, submitting, error, load, invite, changeRole, remove }
}
