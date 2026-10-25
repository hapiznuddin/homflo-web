import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import USelect from '@nuxt/ui/components/Select.vue'
import { DOMWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import PropertyFormModal from '~/components/properties/PropertyFormModal.vue'
import type { PropertyItem } from '~/types/properties'
import PropertiesPage from '~/pages/properties/index.vue'

const authMock = vi.hoisted(() => ({
  household: { value: { id: 'h1', name: 'Rumah Budi', role: 'owner' } },
  isHouseholdOwner: { value: true },
  isEmailVerified: { value: true },
  onboarding: { value: { required: false } },
  bootstrap: vi.fn(async () => 'authenticated'),
  logout: vi.fn()
}))

mockNuxtImport('useAuth', () => () => authMock)

const toastMock = vi.hoisted(() => ({ add: vi.fn() }))

mockNuxtImport('useToast', () => () => toastMock)

interface MockPropertiesApi {
  items: Ref<PropertyItem[]>
  pending: Ref<boolean>
  submitting: Ref<boolean>
  error: Ref<string | null>
  errorCode: Ref<string | null>
  fieldErrors: Ref<Record<string, string>>
  load: ReturnType<typeof vi.fn>
  refresh: ReturnType<typeof vi.fn>
  fetchOne: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  archive: ReturnType<typeof vi.fn>
  restore: ReturnType<typeof vi.fn>
  clearError: ReturnType<typeof vi.fn>
}

const propertiesMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useProperties', () => () => propertiesMock.api)

function propertyItem(overrides: Partial<PropertyItem> = {}): PropertyItem {
  return {
    id: '01J0PROPERTY00000000000001',
    household_id: 'h1',
    name: 'Rumah utama',
    type: 'house',
    address: 'Jl. Mawar 1',
    description: 'Rumah keluarga',
    ownership_status: 'owned',
    notes: 'Kunci di pos',
    archived_at: null,
    created_at: '2026-10-01T00:00:00.000000Z',
    updated_at: '2026-10-01T00:00:00.000000Z',
    ...overrides
  }
}

function setupPropertiesState(
  overrides: {
    items?: PropertyItem[]
    pending?: boolean
    error?: string | null
  } = {}
): MockPropertiesApi {
  const api: MockPropertiesApi = {
    items: ref(overrides.items ?? [propertyItem()]),
    pending: ref(overrides.pending ?? false),
    submitting: ref(false),
    error: ref(overrides.error ?? null),
    errorCode: ref(null),
    fieldErrors: ref({}),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {}),
    fetchOne: vi.fn(async () => propertyItem()),
    create: vi.fn(async () => propertyItem()),
    update: vi.fn(async () => propertyItem()),
    archive: vi.fn(async () => propertyItem()),
    restore: vi.fn(async () => propertyItem()),
    clearError: vi.fn()
  }

  propertiesMock.api = api

  return api
}

async function mountPage(route = '/properties') {
  return mountSuspended(PropertiesPage, { route })
}

async function flush(): Promise<void> {
  for (let index = 0; index < 5; index++) {
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

function bodyText(): string {
  return document.body.textContent ?? ''
}

function bodyButton(label: string): DOMWrapper<Element> {
  const element = Array.from(document.body.querySelectorAll('button'))
    .find(button => (button.textContent ?? '').trim() === label)

  if (!element) {
    throw new Error(`Tombol "${label}" tidak ditemukan di modal`)
  }

  return new DOMWrapper(element)
}

beforeEach(() => {
  authMock.isHouseholdOwner.value = true
  authMock.logout.mockClear()
  toastMock.add.mockClear()
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('properties list page', () => {
  it('memuat daftar awal lewat Nuxt /api/properties dan menampilkan metadata', async () => {
    const state = setupPropertiesState()

    const wrapper = await mountPage()

    expect(state.load).toHaveBeenCalledWith({ include_archived: false })
    expect(wrapper.text()).toContain('Rumah utama')
    expect(wrapper.text()).toContain('Rumah · Milik sendiri')
    expect(wrapper.text()).toContain('Jl. Mawar 1')
    expect(wrapper.find('a[href="/properties/01J0PROPERTY00000000000001"]').exists()).toBe(true)
    expect(authMock.logout).not.toHaveBeenCalled()
  })

  it('route include_archived=true meminta aktif + arsip dan menandai baris arsip', async () => {
    const state = setupPropertiesState({
      items: [
        propertyItem(),
        propertyItem({ id: '01J0PROPERTY00000000000002', name: 'Rumah lama', archived_at: '2026-10-02T00:00:00Z' })
      ]
    })

    const wrapper = await mountPage('/properties?include_archived=true')

    expect(state.load).toHaveBeenCalledWith({ include_archived: true })
    expect(wrapper.text()).toContain('Tampilkan aktif saja')
    expect(wrapper.text()).toContain('Rumah lama')
    expect(wrapper.text()).toContain('Arsip')
  })

  it('tombol filter memuat ulang dengan include_archived=true', async () => {
    const state = setupPropertiesState()

    const wrapper = await mountPage()
    const toggle = wrapper.findAll('button').find(button => button.text() === 'Tampilkan arsip')

    expect(toggle).toBeDefined()

    await toggle!.trigger('click')
    await flush()

    expect(state.load).toHaveBeenCalledWith({ include_archived: true }, true)
  })

  it('state loading menampilkan skeleton tanpa konten privat', async () => {
    setupPropertiesState({ items: [], pending: true })

    const wrapper = await mountPage()

    expect(wrapper.find('[aria-label="Memuat properti"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Rumah utama')
  })

  it('error list kosong menampilkan alert + retry tanpa logout', async () => {
    const state = setupPropertiesState({ items: [], error: 'Koneksi terputus' })

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Data properti belum dapat dimuat.')
    expect(text).toContain('Koneksi terputus')
    expect(authMock.logout).not.toHaveBeenCalled()

    const retry = wrapper.findAll('button').find(button => button.text().includes('Coba lagi'))

    await retry!.trigger('click')

    expect(state.refresh).toHaveBeenCalledTimes(1)
  })

  it('state kosong menampilkan CTA untuk owner', async () => {
    setupPropertiesState({ items: [] })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Belum ada properti tercatat.')
    expect(wrapper.findAll('button').some(button => button.text().includes('Tambah Properti'))).toBe(true)
  })

  it('member tidak memperoleh kontrol create', async () => {
    authMock.isHouseholdOwner.value = false
    setupPropertiesState({ items: [] })

    const wrapper = await mountPage()

    expect(wrapper.findAll('button').some(button => button.text().includes('Tambah Properti'))).toBe(false)
  })

  it('form create meneruskan nilai ke create() lalu toast sukses', async () => {
    const state = setupPropertiesState()

    const wrapper = await mountPage()

    await wrapper.findAll('button').find(button => button.text().includes('Tambah Properti'))!.trigger('click')
    await flush()

    expect(bodyText()).toContain('Tambah properti')

    const modal = wrapper.findComponent(PropertyFormModal)
    const selects = modal.findAllComponents(USelect)

    selects[0]!.vm.$emit('update:modelValue', 'land')
    selects[1]!.vm.$emit('update:modelValue', 'owned')
    await flush()

    await new DOMWrapper(document.body.querySelector('#property-name') as Element).setValue('Tanah kebun')
    await new DOMWrapper(document.body.querySelector('#property-address') as Element).setValue('Jl. Kebun 3')
    await bodyButton('Tambah').trigger('click')
    await flush()

    expect(state.create).toHaveBeenCalledWith({
      name: 'Tanah kebun',
      type: 'land',
      address: 'Jl. Kebun 3',
      ownership_status: 'owned',
      description: '',
      notes: ''
    })
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Properti ditambah' })
    )
  })
})
