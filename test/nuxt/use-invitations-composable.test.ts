import { clearNuxtState } from '#app'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HouseholdInvitationSummary } from '~/types/householdInvitations'
import { useInvitations } from '~/composables/useInvitations'

const fetchMock = vi.hoisted(() => vi.fn())

vi.mock('#build/fetch.mjs', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>

  return { ...original, $fetch: fetchMock }
})

let latest: ReturnType<typeof useInvitations> | undefined

const InvitationsHarness = defineComponent({
  name: 'InvitationsHarness',
  setup() {
    latest = useInvitations()

    return latest
  },
  render: () => null
})

async function mountInvitations(): Promise<ReturnType<typeof useInvitations>> {
  await mountSuspended(InvitationsHarness, { route: false })

  return latest!
}

function invitation(overrides: Partial<HouseholdInvitationSummary> = {}): HouseholdInvitationSummary {
  return {
    id: 'inv1',
    household: { id: 'h2', name: 'Rumah Bersama' },
    email: 'baru@example.com',
    status: 'pending',
    expires_at: '2026-11-05T10:00:00.000Z',
    created_at: '2026-10-29T10:00:00.000Z',
    ...overrides
  }
}

const STATE_KEYS = [
  'household-invitations-items',
  'household-invitations-pending',
  'household-invitations-submitting',
  'household-invitations-error',
  'household-invitations-error-code',
  'household-invitations-inflight',
  'household-invitations-loaded'
]

beforeEach(() => {
  clearNuxtState(STATE_KEYS)
  fetchMock.mockReset()
})

describe('useInvitations', () => {
  it('load() mengambil undangan pengguna dan tidak mengulang setelah sukses', async () => {
    fetchMock.mockResolvedValue({ success: true, data: [invitation()] })

    const api = await mountInvitations()

    await api.load()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/invitations')
    expect(api.items.value).toEqual([invitation()])

    await api.load()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('accept() hanya mengirim token dan menghapus undangan dari daftar', async () => {
    fetchMock.mockResolvedValueOnce({ success: true, data: [invitation()] })

    const api = await mountInvitations()

    await api.load()
    fetchMock.mockResolvedValueOnce({
      success: true,
      data: {
        id: 'm1',
        user_id: 'u1',
        username: 'baru',
        name: 'Baru',
        email: 'baru@example.com',
        role: 'member',
        created_at: '2026-10-29T10:00:00.000Z',
        updated_at: '2026-10-29T10:00:00.000Z'
      }
    })

    const member = await api.accept('inv1', '  token-rahasia  ')

    expect(member?.role).toBe('member')
    expect(api.items.value).toEqual([])
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/invitations/inv1/accept',
      expect.objectContaining({ method: 'POST', body: { token: 'token-rahasia' } })
    )
  })

  it('accept() tanpa token tidak memanggil backend', async () => {
    const api = await mountInvitations()

    const member = await api.accept('inv1', '   ')

    expect(member).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('error undangan kedaluwarsa dipetakan ke pesan domain', async () => {
    fetchMock.mockRejectedValueOnce({
      statusCode: 422,
      data: {
        error: {
          code: 'INVITATION_EXPIRED',
          message: 'Invitation expired.'
        }
      }
    })

    const api = await mountInvitations()
    const member = await api.accept('inv1', 'token-rahasia')

    expect(member).toBeNull()
    expect(api.error.value).toBe('Undangan sudah kedaluwarsa.')
    expect(api.errorCode.value).toBe('INVITATION_EXPIRED')
  })

  it('errorCode dibersihkan kembali setelah pemuatan berhasil', async () => {
    fetchMock.mockRejectedValueOnce({})

    const api = await mountInvitations()

    await api.load()

    expect(api.error.value).toBe('Undangan belum dapat dimuat.')
    expect(api.errorCode.value).toBeNull()

    fetchMock.mockResolvedValueOnce({ success: true, data: [invitation()] })

    await api.load(true)

    expect(api.error.value).toBeNull()
    expect(api.errorCode.value).toBeNull()
  })
})
