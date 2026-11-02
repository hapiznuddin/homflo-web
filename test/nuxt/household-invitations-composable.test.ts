import { clearNuxtState } from '#app'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, ref, type Ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HouseholdInvitationItem } from '~/types/householdInvitations'
import { useHouseholdInvitations } from '~/composables/useHouseholdInvitations'

// $fetch auto-import Nuxt berasal dari #build/fetch.mjs; mock modulnya
// langsung agar komposable memakai fetch tiruan.
const fetchMock = vi.hoisted(() => vi.fn())

vi.mock('#build/fetch.mjs', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>

  return { ...original, $fetch: fetchMock }
})

// useAuth tiruan: ref household harus reaktif agar guard token bekerja.
interface AuthApiMock {
  household: Ref<{ id: string } | null>
  applyHouseholdContext: (data: unknown) => void
}

const authMock = vi.hoisted(() => ({ api: undefined as unknown as AuthApiMock }))

// Alias pendek untuk dibaca di dalam test.
const auth = authMock

mockNuxtImport('useAuth', () => () => authMock.api)

let latest: ReturnType<typeof useHouseholdInvitations> | undefined

const InvitationsHarness = defineComponent({
  name: 'InvitationsHarness',
  setup() {
    latest = useHouseholdInvitations()

    return latest
  },
  render: () => null
})

async function mountInvitations(): Promise<ReturnType<typeof useHouseholdInvitations>> {
  await mountSuspended(InvitationsHarness, { route: false })

  return latest!
}

function invitation(overrides: Partial<HouseholdInvitationItem> = {}): HouseholdInvitationItem {
  return {
    id: 'inv-1',
    email: 'siti@example.com',
    status: 'pending',
    expires_at: '2026-11-05T10:00:00.000Z',
    created_at: '2026-10-29T10:00:00.000Z',
    accepted_at: null,
    revoked_at: null,
    invited_by: { id: 'u1', name: 'Budi' },
    ...overrides
  }
}

const STATE_KEYS = [
  'household-scope-id',
  'household-scope-epoch',
  'household-pending-invitations-items',
  'household-pending-invitations-pending',
  'household-pending-invitations-submitting',
  'household-pending-invitations-error',
  'household-pending-invitations-inflight',
  'household-pending-invitations-loaded',
  'household-pending-invitations-loaded-for'
]

beforeEach(() => {
  clearNuxtState(STATE_KEYS)
  fetchMock.mockReset()

  authMock.api = {
    household: ref<{ id: string } | null>({ id: 'h1' }),
    applyHouseholdContext: () => {}
  }
})

describe('useHouseholdInvitations', () => {
  it('load() mengambil seluruh status lewat boundary Nuxt dan tidak mengulang', async () => {
    fetchMock.mockResolvedValue({ success: true, data: [invitation()] })

    const api = await mountInvitations()

    await api.load()

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/households/h1/invitations?status=all',
      expect.anything()
    )
    expect(api.items.value).toEqual([invitation()])
    expect(api.loaded.value).toBe(true)
    expect(api.error.value).toBeNull()

    await api.load()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('load() tanpa household aktif tidak memanggil backend', async () => {
    auth.api.household.value = null

    const api = await mountInvitations()

    await api.load()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(api.items.value).toEqual([])
  })

  it('load() gagal menampilkan error dan memungkinkan retry', async () => {
    fetchMock.mockRejectedValueOnce({ statusCode: 500 })
    fetchMock.mockResolvedValueOnce({ success: true, data: [invitation()] })

    const api = await mountInvitations()

    await api.load()
    // Tanpa pesan readable, fallback domain dipakai.
    expect(api.error.value).toBe('Undangan rumah tangga belum dapat dimuat.')
    expect(api.loaded.value).toBe(false)

    await api.load(true)
    expect(api.error.value).toBeNull()
    expect(api.items.value).toEqual([invitation()])
  })

  it('load() yang dimulai sebelum ganti household tidak boleh mengisi cache sesi baru', async () => {
    let resolveFetch: ((value: unknown) => void) | undefined

    fetchMock.mockReturnValueOnce(new Promise(resolve => {
      resolveFetch = resolve
    }))

    const api = await mountInvitations()
    const loading = api.load()

    // Ganti household di tengah request -> token tidak berlaku lagi.
    auth.api.household.value = { id: 'h2' }

    resolveFetch?.({ success: true, data: [invitation()] })
    await loading

    // Respons dibuang: tidak boleh berisi data undangan lama.
    expect(api.items.value?.length ?? 0).toBe(0)
    expect(api.loaded.value ?? false).toBe(false)
  })

  it('revoke() sukses menandai baris menjadi revoked', async () => {
    fetchMock

      .mockResolvedValueOnce({ success: true, data: [invitation()] })
      .mockResolvedValueOnce({
        success: true,
        data: { id: 'inv-1', status: 'revoked', revoked_at: '2026-10-31T10:00:00.000Z' }
      })

    const api = await mountInvitations()
    await api.load()

    const revoked = await api.revoke('inv-1')

    expect(revoked).toBe(true)
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/households/h1/invitations/inv-1/revoke',
      expect.objectContaining({ method: 'POST' })
    )
    expect(api.items.value[0]?.status).toBe('revoked')
    expect(api.items.value[0]?.revoked_at).toBe('2026-10-31T10:00:00.000Z')
  })

  it('revoke() pada undangan yang sudah diterima menandai baris accepted', async () => {
    fetchMock
      .mockResolvedValueOnce({ success: true, data: [invitation()] })
      .mockRejectedValueOnce({
        statusCode: 409,
        data: { error: { code: 'INVITATION_ALREADY_ACCEPTED', message: 'Already accepted.' } }
      })

    const api = await mountInvitations()
    await api.load()

    const revoked = await api.revoke('inv-1')

    expect(revoked).toBe(false)
    // Kode INVITATION_ALREADY_ACCEPTED dipetakan ke pesan domain.
    expect(api.error.value).toBe('Undangan ini sudah diterima sebelumnya.')
    // Baris berhenti memunculkan tombol cabut tanpa menunggu refresh.
    expect(api.items.value[0]?.status).toBe('accepted')
    expect(api.items.value).toHaveLength(1)
  })

  it('revoke() pada undangan yang sudah tidak ada menghapus baris lokal', async () => {
    fetchMock
      .mockResolvedValueOnce({ success: true, data: [invitation()] })
      .mockRejectedValueOnce({
        statusCode: 404,
        data: { error: { code: 'INVITATION_NOT_FOUND', message: 'Not found.' } }
      })

    const api = await mountInvitations()
    await api.load()

    const revoked = await api.revoke('inv-1')

    expect(revoked).toBe(false)
    expect(api.error.value).toBe('Undangan tidak ditemukan.')
    expect(api.items.value).toHaveLength(0)
  })

  it('revoke() tanpa id atau saat masih submitting tidak memanggil backend', async () => {
    let resolveRevoke: ((value: unknown) => void) | undefined

    const api = await mountInvitations()

    expect(await api.revoke('')).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()

    fetchMock.mockReturnValueOnce(new Promise(resolve => {
      resolveRevoke = resolve
    }))

    const first = api.revoke('inv-1')
    const second = await api.revoke('inv-2')

    expect(second).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    resolveRevoke?.({ success: true, data: { id: 'inv-1', status: 'revoked', revoked_at: null } })
    expect(await first).toBe(true)
  })
})
