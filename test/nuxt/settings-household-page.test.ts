import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref, type ComputedRef, type Ref } from 'vue'
import HouseholdPage from '~/pages/settings/household.vue'

interface MockAuthState {
  household: Ref<{ id: string, name: string, role: string } | null>
  households: Ref<Array<{ id: string, name: string, role: string }>>
  status: Ref<'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error'>
  error: Ref<string | null>
  onboarding: Ref<{ required: boolean }>
  isHouseholdOwner: Ref<boolean>
  pending: ComputedRef<boolean>
  refresh: ReturnType<typeof vi.fn>
  bootstrap: ReturnType<typeof vi.fn>
}

const authMock = vi.hoisted(() => ({ api: undefined as unknown }))
const settingsMock = vi.hoisted(() => ({ api: undefined as unknown as HouseholdSettingsMock }))
const toastMock = vi.hoisted(() => ({ add: vi.fn() }))

mockNuxtImport('useAuth', () => () => authMock.api)
mockNuxtImport('useHouseholdSettings', () => () => settingsMock.api)
mockNuxtImport('useToast', () => () => toastMock)

interface HouseholdSettingsMock {
  renaming: Ref<boolean>
  renameError: Ref<string | null>
  renameFieldErrors: Ref<Record<string, string>>
  switchingId: Ref<string | null>
  switchError: Ref<string | null>
  rename: (name: string) => Promise<boolean>
  activate: (householdId: string) => Promise<boolean>
  clearRenameErrors: () => void
  clearSwitchError: () => void
}

function setupState(
  overrides: {
    household?: { id: string, name: string, role: string } | null
    households?: Array<{ id: string, name: string, role: string }>
    status?: 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error'
    error?: string | null
    owner?: boolean
  } = {}
): { auth: MockAuthState } {
  const status = ref(overrides.status ?? 'authenticated')
  const household = ref(overrides.household === undefined
    ? { id: 'h1', name: 'Rumah Budi', role: 'owner' }
    : overrides.household)
  const state: MockAuthState = {
    household,
    households: ref(overrides.households ?? (household.value ? [household.value] : [])),
    status,
    error: ref(overrides.error ?? null),
    onboarding: ref({ required: false }),
    isHouseholdOwner: ref(overrides.owner ?? household.value?.role === 'owner'),
    pending: computed(() => status.value === 'loading' || status.value === 'idle'),
    refresh: vi.fn(async () => status.value),
    bootstrap: vi.fn(async () => status.value)
  }

  authMock.api = state

  settingsMock.api = {
    renaming: ref(false),
    renameError: ref(null),
    renameFieldErrors: ref({}),
    switchingId: ref(null),
    switchError: ref(null),
    rename: vi.fn(async () => true),
    activate: vi.fn(async () => true),
    clearRenameErrors: vi.fn(),
    clearSwitchError: vi.fn()
  }

  return { auth: state }
}

async function mountPage() {
  return mountSuspended(HouseholdPage, { route: '/settings/household' })
}

function flush(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}

describe('settings household page', () => {
  beforeEach(() => {
    setupState()
    toastMock.add.mockClear()
  })

  it('menampilkan nama dan peran rumah tangga aktif beserta tautan anggota', async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Rumah Budi')
    expect(wrapper.text()).toContain('owner')
    expect(wrapper.text()).toContain('Rumah tangga aktif')

    const links = wrapper.findAll('a').map(link => link.attributes('href'))

    expect(links).toContain('/settings')
    expect(links).toContain('/settings/members')
  })

  it('owner dapat mengubah nama dan error validasi tampil', async () => {
    const { auth } = setupState()

    const wrapper = await mountPage()
    const input = wrapper.find('input[aria-label="Nama rumah tangga"]')

    expect(input.exists()).toBe(true)

    await input.setValue('Rumah Budi Baru')
    await wrapper.findAll('button').find(button => button.text() === 'Simpan nama')!.trigger('submit')
    await flush()

    expect(settingsMock.api.rename).toHaveBeenCalledWith('Rumah Budi Baru')
    expect(toastMock.add).toHaveBeenCalledWith(expect.objectContaining({ title: 'Nama rumah tangga diperbarui' }))

    // Household aktif tetap sumber kebenaran untuk input setelah sukses.
    auth.household.value = { id: 'h1', name: 'Rumah Budi Baru', role: 'owner' }
    await flush()

    expect((wrapper.find('input[aria-label="Nama rumah tangga"]').element as HTMLInputElement).value)
      .toBe('Rumah Budi Baru')
  })

  it('member tidak mendapatkan kontrol ubah nama', async () => {
    setupState({ owner: false })

    const wrapper = await mountPage()

    expect(wrapper.find('input[aria-label="Nama rumah tangga"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Hanya owner yang dapat mengubah nama')
  })

  it('error validasi backend ditampilkan di bawah input', async () => {
    setupState()

    settingsMock.api.renameFieldErrors.value = { name: 'Kolom Nama wajib diisi.' }

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Kolom Nama wajib diisi.')

    // Error umum tampil saat tidak ada error per-field (field error lebih
    // spesifik dan ditampilkan terlebih dahulu).
    settingsMock.api.renameFieldErrors.value = {}
    settingsMock.api.renameError.value = 'Nama rumah tangga belum dapat disimpan.'
    await flush()

    expect(wrapper.text()).toContain('Nama rumah tangga belum dapat disimpan.')
  })

  it('menampilkan semua rumah tangga dan menandai yang aktif', async () => {
    setupState({
      households: [
        { id: 'h1', name: 'Rumah Budi', role: 'owner' },
        { id: 'h2', name: 'Rumah Siti', role: 'member' }
      ]
    })

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Rumah Budi')
    expect(text).toContain('Rumah Siti')
    expect(text).toContain('Aktif')
  })

  it('mengganti rumah tangga aktif lewat endpoint aktivasi', async () => {
    setupState({
      households: [
        { id: 'h1', name: 'Rumah Budi', role: 'owner' },
        { id: 'h2', name: 'Rumah Siti', role: 'member' }
      ]
    })

    const wrapper = await mountPage()
    const button = wrapper.findAll('button').find(button => button.text() === 'Ganti')!

    await button.trigger('click')
    await flush()

    expect(settingsMock.api.activate).toHaveBeenCalledWith('h2')
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Rumah tangga aktif diganti' })
    )
  })

  it('kegagalan switching tidak menandai rumah tangga baru aktif', async () => {
    setupState({
      households: [
        { id: 'h1', name: 'Rumah Budi', role: 'owner' },
        { id: 'h2', name: 'Rumah Siti', role: 'member' }
      ]
    })

    settingsMock.api.switchError.value = 'Rumah tangga belum dapat diganti.'

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Rumah tangga belum dapat diganti.')
    expect(text).toContain('Aktif')

    const labels = wrapper.findAll('[aria-label="Ganti ke Rumah Siti"]')

    expect(labels).toHaveLength(1)
  })

  it('state loading menampilkan skeleton tanpa data rumah tangga', async () => {
    setupState({ household: null, status: 'loading' })

    const wrapper = await mountPage()

    expect(wrapper.find('[aria-label="Memuat rumah tangga"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Rumah Budi')
  })

  it('error pemuatan menampilkan retry tanpa menghapus sesi', async () => {
    const { auth } = setupState({
      household: null,
      status: 'error',
      error: 'Tidak dapat terhubung ke server.'
    })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Data rumah tangga belum dapat dimuat.')

    await wrapper.findAll('button').find(button => button.text() === 'Coba lagi')!.trigger('click')
    await flush()

    expect(auth.refresh).toHaveBeenCalledTimes(1)
  })

  it('rumah tangga kosong menampilkan penjelasan dan aksi coba lagi', async () => {
    const { auth } = setupState({ household: null })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Rumah tangga belum tersedia')

    await wrapper.findAll('button').find(button => button.text() === 'Coba lagi')!.trigger('click')
    await flush()

    expect(auth.refresh).toHaveBeenCalledTimes(1)
  })
})
