import { clearNuxtState } from '#app'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HouseholdMemberItem } from '~/types/householdMembers'
import { useHouseholdMembers } from '~/composables/useHouseholdMembers'

// $fetch auto-import Nuxt berasal dari #build/fetch.mjs; mock modulnya
// langsung agar komposable memakai fetch tiruan.
const fetchMock = vi.hoisted(() => vi.fn())

vi.mock('#build/fetch.mjs', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>

  return { ...original, $fetch: fetchMock }
})

const authMock = vi.hoisted(() => ({
  household: { value: { id: 'h1', name: 'Rumah Budi', role: 'owner' } as { id: string } | null }
}))

mockNuxtImport('useAuth', () => () => authMock)

let latest: ReturnType<typeof useHouseholdMembers> | undefined

const MembersHarness = defineComponent({
  name: 'MembersHarness',
  setup() {
    latest = useHouseholdMembers()

    return latest
  },
  render: () => null
})

async function mountMembers(): Promise<ReturnType<typeof useHouseholdMembers>> {
  await mountSuspended(MembersHarness, { route: false })

  return latest!
}

function member(overrides: Partial<HouseholdMemberItem> = {}): HouseholdMemberItem {
  return {
    id: 'm1',
    user_id: 'u1',
    username: 'budi',
    name: 'Budi',
    email: 'budi@example.com',
    role: 'owner',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

const STATE_KEYS = [
  'household-members-items',
  'household-members-pending',
  'household-members-submitting',
  'household-members-error',
  'household-members-inflight',
  'household-members-loaded-for'
]

beforeEach(() => {
  clearNuxtState(STATE_KEYS)
  fetchMock.mockReset()
  authMock.household.value = { id: 'h1' }
})

describe('useHouseholdMembers', () => {
  it('load() mengambil anggota lewat boundary Nuxt dan tidak mengulang setelah sukses', async () => {
    fetchMock.mockResolvedValue({ success: true, data: [member()] })

    const api = await mountMembers()

    await api.load()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/households/h1/members')
    expect(api.items.value).toEqual([member()])

    await api.load()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('invite() mengembalikan token sekali pakai dan mengirim email yang di-trim', async () => {
    fetchMock.mockResolvedValueOnce({
      success: true,
      data: {
        invitation: {
          id: 'inv1',
          household: { id: 'h1', name: 'Rumah Budi' },
          email: 'baru@example.com',
          status: 'pending',
          expires_at: '2026-11-05T00:00:00.000Z',
          created_at: '2026-10-29T00:00:00.000Z'
        },
        token: 'token-rahasia'
      }
    })

    const api = await mountMembers()
    const created = await api.invite('  baru@example.com  ')

    expect(created?.token).toBe('token-rahasia')
    expect(created?.invitation.id).toBe('inv1')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/households/h1/invitations',
      expect.objectContaining({ method: 'POST', body: { email: 'baru@example.com' } })
    )
  })

  it('error validasi undangan diterjemahkan, bukan jatuh ke pesan generik', async () => {
    fetchMock.mockRejectedValueOnce({
      statusCode: 422,
      data: {
        message: 'The email field is required.',
        errors: { email: ['The email field is required.'] }
      }
    })

    const api = await mountMembers()
    const created = await api.invite('')

    expect(created).toBeNull()
    expect(api.error.value).toBe('Kolom Email wajib diisi.')
  })

  it('error last-owner pada perubahan peran dipetakan ke pesan domain', async () => {
    fetchMock.mockRejectedValueOnce({
      statusCode: 422,
      data: {
        error: {
          code: 'HOUSEHOLD_LAST_OWNER',
          message: 'Household must have at least one owner.'
        }
      }
    })

    const api = await mountMembers()
    const changed = await api.changeRole('m1', 'member')

    expect(changed).toBe(false)
    expect(api.error.value).toBe('Rumah tangga harus memiliki setidaknya satu pemilik.')
  })

  it('remove() menghapus baris hanya setelah backend mengonfirmasi', async () => {
    fetchMock.mockResolvedValueOnce({ success: true, data: [member(), member({ id: 'm2', user_id: 'u2', name: 'Siti', email: 'siti@example.com', role: 'member' })] })

    const api = await mountMembers()

    await api.load()
    fetchMock.mockResolvedValueOnce({ success: true, data: { id: 'm2' } })

    const removed = await api.remove('m2')

    expect(removed).toBe(true)
    expect(api.items.value.map(item => item.id)).toEqual(['m1'])
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/households/h1/members/m2',
      expect.objectContaining({ method: 'DELETE' })
    )
  })
})
