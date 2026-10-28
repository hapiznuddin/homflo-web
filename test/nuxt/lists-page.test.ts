import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { DOMWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import type { ListSummary } from '~/types/lists'
import ListsPage from '~/pages/lists/index.vue'

const authMock = vi.hoisted(() => ({
  user: {
    value: {
      id: 'u1',
      username: 'budi',
      name: 'Budi Santoso',
      email: 'budi@example.com',
      email_verified_at: '2026-01-01T00:00:00.000Z'
    }
  },
  household: { value: { id: 'h1', name: 'Rumah Budi', role: 'owner' } },
  onboarding: { value: { required: false } },
  bootstrap: vi.fn(async () => 'authenticated'),
  logout: vi.fn()
}))

mockNuxtImport('useAuth', () => () => authMock)

const toastMock = vi.hoisted(() => ({ add: vi.fn() }))

mockNuxtImport('useToast', () => () => toastMock)

const listsMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useLists', () => () => listsMock.api)

interface MockListsState {
  lists: Ref<ListSummary[]>
  pending: Ref<boolean>
  submitting: Ref<boolean>
  error: Ref<string | null>
  fieldErrors: Ref<Record<string, string>>
  load: ReturnType<typeof vi.fn>
  refresh: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  archive: ReturnType<typeof vi.fn>
  restore: ReturnType<typeof vi.fn>
}

const listsState: MockListsState = {
  lists: ref([]),
  pending: ref(false),
  submitting: ref(false),
  error: ref(null),
  fieldErrors: ref({}),
  load: vi.fn(async () => {}),
  refresh: vi.fn(async () => {}),
  create: vi.fn(async () => listSummary()),
  update: vi.fn(async () => listSummary()),
  archive: vi.fn(async () => true),
  restore: vi.fn(async () => true)
}

function setupListsState(
  overrides: {
    lists?: ListSummary[]
    pending?: boolean
    error?: string | null
  } = {}
): void {
  listsMock.api = {
    lists: ref(overrides.lists ?? [listSummary()]),
    pending: ref(overrides.pending ?? false),
    submitting: ref(false),
    error: ref(overrides.error ?? null),
    fieldErrors: ref({}),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {}),
    create: vi.fn(async () => listSummary()),
    update: vi.fn(async () => listSummary()),
    archive: vi.fn(async () => true),
    restore: vi.fn(async () => true)
  }
}

function sampleList(overrides: Partial<ListSummary> = {}): ListSummary {
  return {
    id: '01J0LIST00000000000000001',
    household_id: 'h1',
    name: 'Shopping List',
    type: 'shopping',
    is_default: true,
    archived_at: null,
    counts: {
      active: 3,
      completed: 1
    },
    created_by: {
      id: 'u1',
      name: 'Budi Santoso'
    },
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...overrides
  }
}

function setupAuth(overrides: {
  isHouseholdOwner?: boolean
  userId?: string
  householdId?: string
} = {}) {
  authMock.isHouseholdOwner.value = overrides.isHouseholdOwner ?? true
  authMock.user.value.id = overrides.userId ?? 'u1'
  authMock.household.value.id = overrides.householdId ?? 'h1'
}

function bodyText(): string {
  return document.body.textContent ?? ''
}

async function mountPage() {
  return mountSuspended(ListsPage, { route: '/lists' })
}

function tabButton(wrapper: Awaited<ReturnType<typeof mountPage>>, label: string) {
  return wrapper.findAll('button').find(button => button.text() === label)
}

beforeEach(() => {
  setupAuth()
  toastMock.add.mockClear()
  setupListsState()
})

afterEach(() => {
  document.body.innerHTML = ''
})

// UModal me-render via teleport yang tidak selalu ikut ter-unmount bersama
// wrapper; bersihkan sisa modal antar test agar query document.body tidak
// mengenai modal basi dari test sebelumnya.
function bodyText(): string {
  return document.body.textContent ?? ''
}

async function flush(): Promise<void> {
  for (let index = 0; index < 5; index++) {
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

  it('state loading menampilkan skeleton tanpa konten privat', async () => {
    setupListsState({ lists: [], pending: true })

    const wrapper = await mountPage()

    expect(wrapper.find('[aria-label="Memuat daftar list"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Belum ada list')
  })

  it('state kosong menampilkan CTA tambah', async () => {
    setupListsState({ lists: [] })

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Belum ada list yang akan datang.')
    expect(text).toContain('Tambah List')
  })

  it('state error saat list kosong menampilkan alert + retry tanpa logout', async () => {
    setupListsState({ lists: [], error: 'Koneksi terputus' })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Data daftar list belum dapat dimuat.')
    expect(wrapper.text()).toContain('Koneksi terputus')
    expect(authMock.logout).not.toHaveBeenCalled()
  })

  it('tombol "Coba lagi" memanggil refresh()', async () => {
    const state = setupListsState({ lists: [], error: 'Koneksi terputus' })

    const wrapper = await mountPage()
    const retryButton = wrapper.findAll('button').find(button => button.text().includes('Coba lagi'))

    expect(retryButton).toBeDefined()

    await retryButton!.trigger('click')

    expect(state.refresh).toHaveBeenCalledTimes(1)
  })

  it('error aksi dengan list utuh tidak menyembunyikan list', async () => {
    setupListsState({ error: 'List masih dipakai' })

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Shopping List')
    expect(text).toContain('Aksi terakhir gagal.')
  })

  it('tombol Tambah membuka form dan submit memanggil create()', async () => {
    const state = setupListsState()

    const wrapper = await mountPage()
    const addButton = wrapper.findAll('button').find(button => button.text().includes('Tambah'))

    await addButton!.trigger('click')
    await flush()

    expect(bodyText()).toContain('Tambah List')

    // Form Lists hanya menawarkan type shopping (kontrak backend).
    await new DOMWrapper(document.body.querySelector('#list-type') as Element).trigger('click')
    await flush()

    const optionLabels = Array.from(document.body.querySelectorAll('[data-test="option"]')
      .map(element => element.textContent?.trim())

    expect(optionLabels).toContain('Shopping')
    expect(optionLabels).toContain('Tanpa tipe')
    expect(optionLabels).not.toContain('Bills')

    await new DOMWrapper(document.body.querySelector('#list-name') as Element).setValue('List Baru')

    const submitButton = Array.from(document.body.querySelectorAll('button'))
      .find(button => (button.textContent ?? '').trim() === 'Simpan')

    await new DOMWrapper(submitButton!).trigger('click')

    expect(state.create).toHaveBeenCalledTimes(1)

    const values = state.create.mock.calls[0]?.[0] as Record<string, unknown>

    expect(values.name).toBe('List Baru')
    expect(values.type).toBe('shopping')
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'List ditambah' })
    )
  })

  it('non-owner: CTA tambah disembunyikan; baris tetap terbuka sebagai anchor (render-only)', async () => {
    setupListsState()
    authMock.isHouseholdOwner.value = false

    const wrapper = await mountPage()

    expect(wrapper.text()).not.toContain('Tambah List')
    expect(wrapper.find('ul a[href="/lists/01J0LIST00000000000000001"]').exists()).toBe(true)
  })

  it('halaman tidak memanggil logout', async () => {
    setupListsState()

    await mountPage()

    expect(authMock.logout).not.toHaveBeenCalled()
  })
