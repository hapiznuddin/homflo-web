import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import type { HouseholdInvitationItem } from '~/types/householdInvitations'
import type { HouseholdMemberItem } from '~/types/householdMembers'
import MembersPage from '~/pages/settings/members.vue'

const authMock = vi.hoisted(() => ({
  household: { value: { id: 'h1', name: 'Rumah Budi', role: 'owner' } },
  isHouseholdOwner: { value: true },
  onboarding: { value: { required: false } },
  bootstrap: vi.fn(async () => 'authenticated')
}))

mockNuxtImport('useAuth', () => () => authMock)

const toastMock = vi.hoisted(() => ({ add: vi.fn() }))

mockNuxtImport('useToast', () => () => toastMock)

interface MockMembersState {
  items: Ref<HouseholdMemberItem[]>
  pending: Ref<boolean>
  submitting: Ref<boolean>
  error: Ref<string | null>
  inviteFieldErrors: Ref<Record<string, string>>
  loaded: Ref<boolean>
  load: ReturnType<typeof vi.fn>
  refresh: ReturnType<typeof vi.fn>
  invite: ReturnType<typeof vi.fn>
  changeRole: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
  clearInviteError: ReturnType<typeof vi.fn>
}

const membersMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useHouseholdMembers', () => () => membersMock.api)

const invitationsMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useHouseholdInvitations', () => () => invitationsMock.api)

function sampleMember(overrides: Partial<HouseholdMemberItem> = {}): HouseholdMemberItem {
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

function setupMembersState(
  overrides: {
    items?: HouseholdMemberItem[]
    pending?: boolean
    error?: string | null
    loaded?: boolean
  } = {}
): MockMembersState {
  const items = overrides.items ?? [sampleMember()]
  const state: MockMembersState = {
    items: ref(items),
    pending: ref(overrides.pending ?? false),
    submitting: ref(false),
    error: ref(overrides.error ?? null),
    inviteFieldErrors: ref({}),
    loaded: ref(overrides.loaded ?? (items.length > 0 || (!overrides.pending && !overrides.error))),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {}),
    invite: vi.fn(async () => null),
    changeRole: vi.fn(async () => true),
    remove: vi.fn(async () => true),
    clearInviteError: vi.fn(() => {})
  }

  membersMock.api = state

  return state
}

function sampleInvitation(overrides: Partial<HouseholdInvitationItem> = {}): HouseholdInvitationItem {
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

function setupInvitationsState(
  overrides: {
    items?: HouseholdInvitationItem[]
    pending?: boolean
    submitting?: boolean
    error?: string | null
    loaded?: boolean
    revokeResult?: boolean
  } = {}
) {
  const state = {
    items: ref(overrides.items ?? [sampleInvitation()]),
    pending: ref(overrides.pending ?? false),
    submitting: ref(overrides.submitting ?? false),
    error: ref(overrides.error ?? null),
    loaded: ref(overrides.loaded ?? true),
    load: vi.fn(async () => {}),
    revoke: vi.fn(async () => overrides.revokeResult ?? true)
  }

  invitationsMock.api = state

  return state
}

async function mountPage() {
  return mountSuspended(MembersPage, { route: '/settings/members' })
}

function flush(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}

describe('settings members page', () => {
  beforeEach(() => {
    authMock.isHouseholdOwner.value = true
    setupInvitationsState()
    toastMock.add.mockClear()
  })

  it('owner melihat form undangan dan daftar anggota', async () => {
    setupMembersState()

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Anggota')
    expect(wrapper.text()).toContain('Budi')
    expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    expect(wrapper.findAll('button').some(button => button.text() === 'Undang')).toBe(true)
  })

  it('member hanya melihat peran tanpa kontrol owner', async () => {
    authMock.isHouseholdOwner.value = false
    setupMembersState()

    const wrapper = await mountPage()

    expect(wrapper.find('input[type="email"]').exists()).toBe(false)
    expect(wrapper.findAll('button').some(button => button.text() === 'Undang')).toBe(false)
    expect(wrapper.text()).toContain('Owner')
    // Bagian undangan owner-only tidak dirender untuk member.
    expect(wrapper.text()).not.toContain('Undangan')
  })

  it('email kosong ditolak di klien tanpa memanggil backend', async () => {
    const state = setupMembersState()

    const wrapper = await mountPage()

    await wrapper.find('form').trigger('submit')
    await flush()

    expect(state.invite).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Email wajib diisi.')
  })

  it('format email tidak valid ditolak di klien tanpa memanggil backend', async () => {
    const state = setupMembersState()

    const wrapper = await mountPage()

    await wrapper.find('input[type="email"]').setValue('bukan-email')
    await wrapper.find('form').trigger('submit')
    await flush()

    expect(state.invite).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Format email tidak valid.')
  })

  it('error validasi email dari backend tampil di bawah input dan hilang saat mengetik', async () => {
    const state = setupMembersState()

    const wrapper = await mountPage()

    state.inviteFieldErrors.value = { email: 'Kolom Email harus berupa email yang valid.' }
    await flush()

    expect(wrapper.text()).toContain('Kolom Email harus berupa email yang valid.')

    await wrapper.find('input[type="email"]').setValue('baru@example.com')

    expect(state.clearInviteError).toHaveBeenCalled()
  })

  it('undangan sukses menampilkan tautan token yang dapat dibagikan', async () => {
    const state = setupMembersState()

    state.invite.mockResolvedValueOnce({
      invitation: {
        id: 'inv1',
        household: { id: 'h1', name: 'Rumah Budi' },
        email: 'baru@example.com',
        status: 'pending',
        expires_at: '2026-11-05T10:00:00.000Z',
        created_at: '2026-10-29T10:00:00.000Z'
      },
      token: 'token-rahasia'
    })

    const wrapper = await mountPage()

    await wrapper.find('input[type="email"]').setValue('baru@example.com')
    await wrapper.find('form').trigger('submit')
    await flush()

    expect(state.invite).toHaveBeenCalledWith('baru@example.com')
    expect(wrapper.text()).toContain('Tautan undangan untuk baru@example.com')
    expect(wrapper.text()).toContain('konfigurasi email server tersedia')

    const linkInput = wrapper.find('input[readonly]')

    expect((linkInput.element as HTMLInputElement).value).toContain('/invitations/inv1?token=token-rahasia')
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Undangan dibuat' })
    )
  })

  it('tanpa Clipboard API, Salin memberi arahan untuk menyalin manual', async () => {
    const state = setupMembersState()

    state.invite.mockResolvedValueOnce({
      invitation: {
        id: 'inv1',
        household: { id: 'h1', name: 'Rumah Budi' },
        email: 'baru@example.com',
        status: 'pending',
        expires_at: '2026-11-05T10:00:00.000Z',
        created_at: '2026-10-29T10:00:00.000Z'
      },
      token: 'token-rahasia'
    })

    const wrapper = await mountPage()

    await wrapper.find('input[type="email"]').setValue('baru@example.com')
    await wrapper.find('form').trigger('submit')
    await flush()

    const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })

    try {
      await wrapper.findAll('button').find(button => button.text() === 'Salin')!.trigger('click')
      await flush()
    } finally {
      if (clipboardDescriptor) {
        Object.defineProperty(navigator, 'clipboard', clipboardDescriptor)
      } else {
        Reflect.deleteProperty(navigator, 'clipboard')
      }
    }

    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Salin tautan secara manual', color: 'warning' })
    )
  })

  it('perubahan peran yang gagal mengembalikan select ke peran tersimpan', async () => {
    const state = setupMembersState()

    state.changeRole.mockResolvedValueOnce(false)

    const wrapper = await mountPage()
    const select = wrapper.find('select[aria-label="Peran Budi"]')

    await select.setValue('member')
    await flush()

    expect(state.changeRole).toHaveBeenCalledWith('m1', 'member')
    expect((select.element as HTMLSelectElement).value).toBe('owner')
    expect(toastMock.add).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Peran anggota diubah' })
    )
  })

  it('error aksi tetap menampilkan daftar anggota dan pesan yang diterjemahkan', async () => {
    setupMembersState({ error: 'Kolom Email wajib diisi.' })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Budi')
    expect(wrapper.text()).toContain('Aksi terakhir gagal.')
    expect(wrapper.text()).toContain('Kolom Email wajib diisi.')
  })

  it('daftar kosong menampilkan empty state dan aksi muat ulang', async () => {
    const state = setupMembersState({ items: [], loaded: true })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Belum ada anggota yang dapat ditampilkan.')
    expect(wrapper.findAll('button').some(button => button.text() === 'Muat ulang')).toBe(true)

    state.load.mockClear()
    await wrapper.findAll('button').find(button => button.text() === 'Muat ulang')!.trigger('click')

    expect(state.load).toHaveBeenCalledWith(true)
  })

  it('gagal muat awal menampilkan retry tanpa menampilkan form owner', async () => {
    const state = setupMembersState({ items: [], error: 'Koneksi terputus', loaded: false })

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Data anggota belum dapat dimuat.')
    expect(text).toContain('Koneksi terputus')
    expect(text).toContain('Coba lagi')
    expect(wrapper.find('input[type="email"]').exists()).toBe(false)

    state.load.mockClear()
    await wrapper.findAll('button').find(button => button.text() === 'Coba lagi')!.trigger('click')

    expect(state.load).toHaveBeenCalledWith(true)
  })

  it('error aksi pada daftar kosong tetap menampilkan empty state, bukan error muat', async () => {
    setupMembersState({ items: [], error: 'Undangan belum dapat dibuat.', loaded: true })

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Belum ada anggota yang dapat ditampilkan.')
    expect(text).toContain('Aksi terakhir gagal.')
    expect(text).not.toContain('Data anggota belum dapat dimuat.')
  })

  it('owner melihat undangan beserta status dan siapa pengundangnya', async () => {
    setupInvitationsState({
      items: [
        sampleInvitation(),
        sampleInvitation({
          id: 'inv-2',
          email: 'anton@example.com',
          status: 'accepted',
          accepted_at: '2026-10-30T10:00:00.000Z'
        }),
        sampleInvitation({ id: 'inv-3', email: 'lina@example.com', status: 'expired' }),
        sampleInvitation({
          id: 'inv-4',
          email: 'rani@example.com',
          status: 'revoked',
          revoked_at: '2026-10-31T10:00:00.000Z'
        })
      ]
    })

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Undangan')
    expect(text).toContain('siti@example.com')
    expect(text).toContain('Diundang oleh Budi')
    expect(text).toContain('Menunggu')
    expect(text).toContain('Diterima')
    expect(text).toContain('Kedaluwarsa')
    expect(text).toContain('Dicabut')

    // Hanya undangan pending yang dapat dicabut.
    const revokeButtons = wrapper.findAll('button').filter(button => button.text() === 'Cabut')

    expect(revokeButtons).toHaveLength(1)
  })

  it('mencabut undangan butuh konfirmasi dua langkah', async () => {
    const invitations = setupInvitationsState()

    const wrapper = await mountPage()
    const revokeButton = wrapper.findAll('button').find(button => button.text() === 'Cabut')!

    await revokeButton.trigger('click')
    await flush()

    expect(invitations.revoke).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Cabut undangan ini?')

    await wrapper.findAll('button').find(button => button.text() === 'Batal')!.trigger('click')
    await flush()

    expect(wrapper.text()).not.toContain('Cabut undangan ini?')
    expect(invitations.revoke).not.toHaveBeenCalled()
  })

  it('konfirmasi cabut memanggil backend dan menampilkan toast sukses', async () => {
    const invitations = setupInvitationsState()

    const wrapper = await mountPage()
    const revokeButton = wrapper.findAll('button').find(button => button.text() === 'Cabut')!

    await revokeButton.trigger('click')
    await flush()
    await wrapper.findAll('button').find(button => button.text() === 'Ya, cabut')!.trigger('click')
    await flush()

    expect(invitations.revoke).toHaveBeenCalledWith('inv-1')
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Undangan dicabut' })
    )
  })

  it('kegagalan cabut menampilkan alert aksi tanpa toast sukses', async () => {
    const invitations = setupInvitationsState({ revokeResult: false, error: 'Undangan belum dapat dicabut.' })

    const wrapper = await mountPage()

    await wrapper.findAll('button').find(button => button.text() === 'Cabut')!.trigger('click')
    await flush()
    await wrapper.findAll('button').find(button => button.text() === 'Ya, cabut')!.trigger('click')
    await flush()

    expect(invitations.revoke).toHaveBeenCalled()
    expect(toastMock.add).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Undangan dicabut' })
    )
    expect(wrapper.text()).toContain('Aksi undangan terakhir gagal.')
    expect(wrapper.text()).toContain('Undangan belum dapat dicabut.')
  })

  it('daftar undangan kosong menampilkan empty state dan aksi muat ulang', async () => {
    const invitations = setupInvitationsState({ items: [], loaded: true })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Belum ada undangan.')

    invitations.load.mockClear()
    await wrapper.findAll('button').find(button => button.text() === 'Muat ulang')!.trigger('click')

    expect(invitations.load).toHaveBeenCalledWith(true)
  })

  it('gagal memuat undangan menampilkan retry khusus undangan', async () => {
    const invitations = setupInvitationsState({ items: [], error: 'Koneksi terputus', loaded: false })

    const wrapper = await mountPage()
    const section = wrapper.find('section')

    expect(section.text()).toContain('Undangan belum dapat dimuat.')
    expect(section.text()).toContain('Koneksi terputus')

    invitations.load.mockClear()
    await wrapper.findAll('button').find(button => button.text() === 'Coba lagi')!.trigger('click')

    expect(invitations.load).toHaveBeenCalledWith(true)
  })

  it('memuat undangan saat pemuatan awal menampilkan skeleton', async () => {
    const invitations = setupInvitationsState({ items: [], pending: true, loaded: false })

    const wrapper = await mountPage()

    expect(wrapper.find('[aria-label="Memuat undangan"]').exists()).toBe(true)

    void invitations
  })
})
