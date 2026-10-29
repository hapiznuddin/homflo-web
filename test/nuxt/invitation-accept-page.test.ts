import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import type { HouseholdInvitationSummary } from '~/types/householdInvitations'
import AcceptInvitationPage from '~/pages/invitations/[id].vue'

const authMock = vi.hoisted(() => ({
  household: { value: null as { id: string, name: string, role: string } | null },
  onboarding: { value: { required: true } },
  isEmailVerified: { value: true },
  bootstrap: vi.fn(async () => 'authenticated'),
  refresh: vi.fn(async () => 'authenticated'),
  postAuthDestination: vi.fn(() => '/dashboard')
}))

mockNuxtImport('useAuth', () => () => authMock)

const toastMock = vi.hoisted(() => ({ add: vi.fn() }))

mockNuxtImport('useToast', () => () => toastMock)

const navigateToMock = vi.hoisted(() => vi.fn())

mockNuxtImport('navigateTo', () => navigateToMock)

interface MockInvitationsState {
  items: Ref<HouseholdInvitationSummary[]>
  pending: Ref<boolean>
  submitting: Ref<boolean>
  error: Ref<string | null>
  errorCode: Ref<string | null>
  load: ReturnType<typeof vi.fn>
  refresh: ReturnType<typeof vi.fn>
  accept: ReturnType<typeof vi.fn>
}

const invitationsMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useInvitations', () => () => invitationsMock.api)

function sampleInvitation(overrides: Partial<HouseholdInvitationSummary> = {}): HouseholdInvitationSummary {
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

function setupInvitationsState(
  overrides: {
    items?: HouseholdInvitationSummary[]
    pending?: boolean
    error?: string | null
    errorCode?: string | null
  } = {}
): MockInvitationsState {
  const state: MockInvitationsState = {
    items: ref(overrides.items ?? [sampleInvitation()]),
    pending: ref(overrides.pending ?? false),
    submitting: ref(false),
    error: ref(overrides.error ?? null),
    errorCode: ref(overrides.errorCode ?? null),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {}),
    accept: vi.fn(async () => ({
      id: 'm1',
      user_id: 'u1',
      username: 'baru',
      name: 'Baru',
      email: 'baru@example.com',
      role: 'member',
      created_at: '2026-10-29T10:00:00.000Z',
      updated_at: '2026-10-29T10:00:00.000Z'
    }))
  }

  invitationsMock.api = state

  return state
}

async function mountPage(route: string) {
  return mountSuspended(AcceptInvitationPage, { route })
}

function flush(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}

describe('invitation accept page', () => {
  beforeEach(() => {
    authMock.household.value = null
    authMock.refresh.mockClear()
    authMock.postAuthDestination.mockClear()
    toastMock.add.mockClear()
    navigateToMock.mockClear()
  })

  it('menampilkan detail undangan dan menerima token dari query', async () => {
    const state = setupInvitationsState()

    const wrapper = await mountPage('/invitations/inv1?token=token-rahasia')

    expect(wrapper.text()).toContain('Rumah Bersama')
    expect(wrapper.text()).toContain('baru@example.com')

    await wrapper.findAll('button').find(button => button.text().includes('Terima undangan'))!.trigger('click')
    await flush()

    expect(state.accept).toHaveBeenCalledWith('inv1', 'token-rahasia')
    expect(authMock.refresh).toHaveBeenCalledTimes(1)
    expect(navigateToMock).toHaveBeenCalledWith('/dashboard')
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Undangan diterima' })
    )
  })

  it('tautan tanpa token tidak dapat diterima', async () => {
    setupInvitationsState()

    const wrapper = await mountPage('/invitations/inv1')

    expect(wrapper.text()).toContain('Tautan undangan tidak lengkap')
    expect(wrapper.findAll('button').some(button => button.text().includes('Terima undangan'))).toBe(false)
  })

  it('akun yang sudah punya rumah tangga tidak dapat menerima undangan', async () => {
    authMock.household.value = { id: 'h1', name: 'Rumah Lama', role: 'owner' }
    setupInvitationsState()

    const wrapper = await mountPage('/invitations/inv1?token=token-rahasia')

    expect(wrapper.text()).toContain('Akun ini sudah tergabung dalam rumah tangga')
    expect(wrapper.findAll('button').find(button => button.text().includes('Terima undangan'))!.attributes('disabled')).toBeDefined()
  })

  it('menampilkan pesan backend saat undangan gagal diterima', async () => {
    const state = setupInvitationsState()

    state.accept.mockResolvedValueOnce(null)
    state.error.value = 'Undangan sudah kedaluwarsa.'

    const wrapper = await mountPage('/invitations/inv1?token=token-rahasia')

    expect(wrapper.text()).toContain('Undangan sudah kedaluwarsa.')
    expect(wrapper.text()).toContain('Undangan belum dapat diproses')
  })

  it('error terminal menonaktifkan tombol terima dan tidak menawarkan retry', async () => {
    setupInvitationsState({
      error: 'Undangan sudah kedaluwarsa.',
      errorCode: 'INVITATION_EXPIRED'
    })

    const wrapper = await mountPage('/invitations/inv1?token=token-rahasia')
    const acceptButton = wrapper.findAll('button')
      .find(button => button.text().includes('Terima undangan'))!

    expect(acceptButton.attributes('disabled')).toBeDefined()
    expect(wrapper.findAll('button').some(button => button.text() === 'Coba lagi')).toBe(false)
  })

  it('error sementara menampilkan aksi coba lagi yang memuat ulang undangan', async () => {
    const state = setupInvitationsState({ error: 'Koneksi terputus.' })

    const wrapper = await mountPage('/invitations/inv1?token=token-rahasia')
    const retryButton = wrapper.findAll('button').find(button => button.text() === 'Coba lagi')

    expect(retryButton).toBeDefined()

    await retryButton!.trigger('click')

    expect(state.load).toHaveBeenCalledWith(true)
  })
})
