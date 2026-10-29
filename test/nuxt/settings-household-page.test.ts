import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref, type ComputedRef, type Ref } from 'vue'
import HouseholdPage from '~/pages/settings/household.vue'

interface MockAuthState {
  household: Ref<{ id: string, name: string, role: string } | null>
  status: Ref<'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error'>
  error: Ref<string | null>
  onboarding: Ref<{ required: boolean }>
  pending: ComputedRef<boolean>
  refresh: ReturnType<typeof vi.fn>
  bootstrap: ReturnType<typeof vi.fn>
}

const authMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useAuth', () => () => authMock.api)

function setupAuth(
  overrides: {
    household?: { id: string, name: string, role: string } | null
    status?: 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error'
    error?: string | null
  } = {}
): MockAuthState {
  const status = ref(overrides.status ?? 'authenticated')
  const state: MockAuthState = {
    household: ref(overrides.household === undefined
      ? { id: 'h1', name: 'Rumah Budi', role: 'owner' }
      : overrides.household),
    status,
    error: ref(overrides.error ?? null),
    onboarding: ref({ required: false }),
    pending: computed(() => status.value === 'loading' || status.value === 'idle'),
    refresh: vi.fn(async () => status.value),
    bootstrap: vi.fn(async () => status.value)
  }

  authMock.api = state

  return state
}

async function mountPage() {
  return mountSuspended(HouseholdPage, { route: '/settings/household' })
}

function flush(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}

describe('settings household page', () => {
  beforeEach(() => {
    setupAuth()
  })

  it('menampilkan nama dan peran rumah tangga aktif', async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Rumah Tangga')
    expect(wrapper.text()).toContain('Rumah Budi')
    expect(wrapper.text()).toContain('owner')
    expect(wrapper.text()).toContain('Perubahan rumah tangga belum tersedia')
  })

  it('menautkan pengelolaan anggota dan kembali ke Settings', async () => {
    const wrapper = await mountPage()
    const links = wrapper.findAll('a').map(link => link.attributes('href'))

    expect(links).toContain('/settings')
    expect(links).toContain('/settings/members')
  })

  it('state loading menampilkan skeleton tanpa data rumah tangga', async () => {
    setupAuth({ household: null, status: 'loading' })

    const wrapper = await mountPage()

    expect(wrapper.find('[aria-label="Memuat rumah tangga"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Rumah Budi')
  })

  it('error pemuatan menampilkan retry tanpa menghapus sesi', async () => {
    const state = setupAuth({
      household: null,
      status: 'error',
      error: 'Tidak dapat terhubung ke server.'
    })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Data rumah tangga belum dapat dimuat.')
    expect(wrapper.text()).toContain('Tidak dapat terhubung ke server.')

    await wrapper.findAll('button').find(button => button.text() === 'Coba lagi')!.trigger('click')
    await flush()

    expect(state.refresh).toHaveBeenCalledTimes(1)
  })

  it('rumah tangga kosong menampilkan penjelasan dan aksi coba lagi', async () => {
    const state = setupAuth({ household: null })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Rumah tangga belum tersedia')

    await wrapper.findAll('button').find(button => button.text() === 'Coba lagi')!.trigger('click')
    await flush()

    expect(state.refresh).toHaveBeenCalledTimes(1)
  })
})
