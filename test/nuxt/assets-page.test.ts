import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import USelect from '@nuxt/ui/components/Select.vue'
import { DOMWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import type { AssetItem } from '~/types/assets'
import type { PropertyItem } from '~/types/properties'
import AssetFormModal from '~/components/assets/AssetFormModal.vue'
import AssetsPage from '~/pages/assets/index.vue'

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
  isHouseholdOwner: { value: true },
  bootstrap: vi.fn(async () => 'authenticated'),
  logout: vi.fn()
}))

mockNuxtImport('useAuth', () => () => authMock)

const toastMock = vi.hoisted(() => ({ add: vi.fn() }))

mockNuxtImport('useToast', () => () => toastMock)

interface MockAssetsState {
  items: Ref<AssetItem[]>
  pending: Ref<boolean>
  submitting: Ref<boolean>
  error: Ref<string | null>
  fieldErrors: Ref<Record<string, string>>
  load: ReturnType<typeof vi.fn>
  refresh: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
  clearError: ReturnType<typeof vi.fn>
}

const assetsMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useAssets', () => () => assetsMock.api)

const propertiesMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useProperties', () => () => propertiesMock.api)

const PROPERTY_ID = '01J0PROPERTY00000000000001'
const ARCHIVED_PROPERTY_ID = '01J0PROPERTY00000000000002'

function sampleItem(overrides: Partial<AssetItem> = {}): AssetItem {
  return {
    id: '01J0ASSET0000000000000001',
    household_id: 'h1',
    name: 'Kulkas dapur',
    description: 'Dua pintu',
    location: 'Dapur',
    acquired_on: '2026-01-15',
    acquisition_cost: '4500000.00',
    created_at: '2026-01-15T00:00:00.000000Z',
    updated_at: '2026-01-15T00:00:00.000000Z',
    property_id: null,
    property: null,
    ...overrides
  }
}

function propertyItem(overrides: Partial<PropertyItem> = {}): PropertyItem {
  return {
    id: PROPERTY_ID,
    household_id: 'h1',
    name: 'Rumah utama',
    type: 'house',
    address: 'Jl. Mawar 1',
    description: null,
    ownership_status: 'owned',
    notes: null,
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
): { items: Ref<PropertyItem[]>, pending: Ref<boolean>, error: Ref<string | null>, load: ReturnType<typeof vi.fn>, clearError: ReturnType<typeof vi.fn> } {
  const state = {
    items: ref(overrides.items ?? [propertyItem()]),
    pending: ref(overrides.pending ?? false),
    error: ref(overrides.error ?? null),
    load: vi.fn(async () => {}),
    clearError: vi.fn()
  }

  propertiesMock.api = state

  return state
}

function setupAssetsState(
  overrides: {
    items?: AssetItem[]
    pending?: boolean
    error?: string | null
  } = {}
): MockAssetsState {
  setupPropertiesState()

  const state: MockAssetsState = {
    items: ref(overrides.items ?? [sampleItem()]),
    pending: ref(overrides.pending ?? false),
    submitting: ref(false),
    error: ref(overrides.error ?? null),
    fieldErrors: ref({}),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {}),
    create: vi.fn(async () => sampleItem()),
    update: vi.fn(async () => sampleItem()),
    remove: vi.fn(async () => true),
    clearError: vi.fn()
  }

  assetsMock.api = state

  return state
}

async function mountPage() {
  return mountSuspended(AssetsPage, { route: '/assets' })
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

describe('assets list page', () => {
  beforeEach(() => {
    authMock.isHouseholdOwner.value = true
    authMock.logout.mockClear()
    toastMock.add.mockClear()
  })

  // UModal me-render via teleport yang tidak selalu ikut ter-unmount
  // bersama wrapper; bersihkan sisa modal antar test.
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('menampilkan aset dari API beserta lokasi, tanggal, dan biaya', async () => {
    setupAssetsState()

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Aset Rumah')
    expect(text).toContain('Kulkas dapur')
    expect(text).toContain('Dapur')
    expect(text).toContain('15 Jan 2026')
    expect(text).toContain('4.500.000')
  })

  it('menampilkan nama Property aktif, relasi archived + badge, dan Tanpa properti', async () => {
    setupAssetsState({
      items: [
        sampleItem({
          property_id: PROPERTY_ID,
          property: { id: PROPERTY_ID, name: 'Rumah utama', archived_at: null }
        }),
        sampleItem({
          id: '01J0ASSET0000000000000002',
          name: 'Lemari lama',
          property_id: ARCHIVED_PROPERTY_ID,
          property: {
            id: ARCHIVED_PROPERTY_ID,
            name: 'Rumah lama',
            archived_at: '2026-10-01T00:00:00Z'
          }
        }),
        sampleItem({ id: '01J0ASSET0000000000000003', name: 'Sofa tanpa properti' })
      ]
    })

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Rumah utama')
    expect(text).toContain('Rumah lama')
    expect(text).toContain('Diarsipkan')
    expect(text).toContain('Tanpa properti')
  })

  it('setiap aset membuka /assets/{id} (list → detail)', async () => {
    setupAssetsState()

    const wrapper = await mountPage()
    const link = wrapper.find('a[href="/assets/01J0ASSET0000000000000001"]')

    expect(link.exists()).toBe(true)
    expect(link.text()).toContain('Kulkas dapur')
  })

  it('state loading menampilkan skeleton tanpa konten privat', async () => {
    setupAssetsState({ items: [], pending: true })

    const wrapper = await mountPage()

    expect(wrapper.find('[aria-label="Memuat aset"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Kulkas dapur')
  })

  it('state kosong menampilkan pesan jujur + CTA untuk owner', async () => {
    setupAssetsState({ items: [] })

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Belum ada aset tercatat.')
    expect(text).toContain('Tambah Aset')
  })

  it('state error saat list kosong menampilkan alert + retry tanpa logout', async () => {
    setupAssetsState({ items: [], error: 'Koneksi terputus' })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Data aset belum dapat dimuat.')
    expect(wrapper.text()).toContain('Koneksi terputus')
    expect(wrapper.text()).toContain('Coba lagi')
    expect(authMock.logout).not.toHaveBeenCalled()
  })

  it('tombol "Coba lagi" memanggil refresh()', async () => {
    const state = setupAssetsState({ items: [], error: 'Koneksi terputus' })

    const wrapper = await mountPage()
    const retryButton = wrapper.findAll('button').find(button => button.text().includes('Coba lagi'))

    expect(retryButton).toBeDefined()

    await retryButton!.trigger('click')

    expect(state.refresh).toHaveBeenCalledTimes(1)
  })

  it('error aksi dengan list utuh tidak menyembunyikan aset', async () => {
    setupAssetsState({ error: 'Aset belum dapat dihapus.' })

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Kulkas dapur')
    expect(text).toContain('Aksi terakhir gagal.')
  })

  it('member tidak memperoleh kontrol write (tombol/CTA tambah tidak ada)', async () => {
    authMock.isHouseholdOwner.value = false
    setupAssetsState({ items: [] })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Belum ada aset tercatat.')
    expect(wrapper.findAll('button').some(button => button.text().includes('Tambah Aset'))).toBe(false)
  })

  it('form create meneruskan nilai form ke create() dan toast sukses', async () => {
    const state = setupAssetsState()

    const wrapper = await mountPage()

    await wrapper.findAll('button').find(button => button.text().includes('Tambah Aset'))!.trigger('click')
    await flush()

    expect(bodyText()).toContain('Tambah aset')

    await new DOMWrapper(document.body.querySelector('#asset-name') as Element).setValue('Sofa ruang tamu')
    await new DOMWrapper(document.body.querySelector('#asset-description') as Element).setValue('Tiga dudukan')
    await new DOMWrapper(document.body.querySelector('#asset-location') as Element).setValue('Ruang tamu')
    await new DOMWrapper(document.body.querySelector('#asset-acquired-on') as Element).setValue('2026-02-01')
    await new DOMWrapper(document.body.querySelector('#asset-acquisition-cost') as Element).setValue('2500000,50')

    await bodyButton('Tambah').trigger('click')
    await flush()

    expect(state.create).toHaveBeenCalledTimes(1)
    expect(state.create).toHaveBeenCalledWith({
      name: 'Sofa ruang tamu',
      description: 'Tiga dudukan',
      location: 'Ruang tamu',
      acquired_on: '2026-02-01',
      acquisition_cost: '2500000,50',
      property_id: 'none'
    })
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Aset ditambah' })
    )
  })

  it('membuka create meminta Property aktif eksplisit dan menampilkan opsinya', async () => {
    setupAssetsState()
    const properties = setupPropertiesState()

    const wrapper = await mountPage()

    await wrapper.findAll('button').find(button => button.text().includes('Tambah Aset'))!.trigger('click')
    await flush()

    expect(properties.load).toHaveBeenCalledWith({ include_archived: false }, true)
    expect(properties.clearError).toHaveBeenCalled()

    const select = wrapper.findComponent(AssetFormModal).findAllComponents(USelect)[0] as unknown as {
      props: (name: string) => unknown
    }
    const items = select.props('items') as Array<{ label: string, value: string }>

    expect(items).toContainEqual({ label: 'Tanpa properti', value: 'none' })
    expect(items).toContainEqual({ label: 'Rumah utama', value: PROPERTY_ID })
  })

  it('create dengan Property memilih ID dan mengirimkannya ke create()', async () => {
    const state = setupAssetsState()

    const wrapper = await mountPage()

    await wrapper.findAll('button').find(button => button.text().includes('Tambah Aset'))!.trigger('click')
    await flush()

    const select = wrapper.findComponent(AssetFormModal).findAllComponents(USelect)[0]!

    select.vm.$emit('update:modelValue', PROPERTY_ID)
    await flush()
    await new DOMWrapper(document.body.querySelector('#asset-name') as Element).setValue('Kulkas baru')
    await bodyButton('Tambah').trigger('click')
    await flush()

    expect(state.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Kulkas baru',
      property_id: PROPERTY_ID
    }))
  })

  it('error daftar Property menampilkan retry tanpa menutup form', async () => {
    setupAssetsState()
    const properties = setupPropertiesState({ items: [], error: 'Koneksi properti terputus' })

    const wrapper = await mountPage()

    await wrapper.findAll('button').find(button => button.text().includes('Tambah Aset'))!.trigger('click')
    await flush()

    expect(bodyText()).toContain('Daftar properti belum dapat dimuat.')
    expect(bodyText()).toContain('Koneksi properti terputus')
    expect(bodyText()).toContain('Tambah aset')

    properties.load.mockClear()
    await bodyButton('Coba lagi').trigger('click')

    expect(properties.load).toHaveBeenCalledWith({ include_archived: false }, true)
  })

  it('409 PROPERTY_ARCHIVED menampilkan error dan tidak menutup form atau toast sukses', async () => {
    const state = setupAssetsState()

    const wrapper = await mountPage()

    await wrapper.findAll('button').find(button => button.text().includes('Tambah Aset'))!.trigger('click')
    await flush()

    state.create.mockImplementation(async () => {
      state.error.value = 'Properti sudah diarsipkan. Pulihkan terlebih dahulu sebelum mengubahnya.'

      return null
    })

    await new DOMWrapper(document.body.querySelector('#asset-name') as Element).setValue('Kulkas baru')
    await bodyButton('Tambah').trigger('click')
    await flush()

    expect(bodyText()).toContain('Data belum dapat disimpan.')
    expect(bodyText()).toContain('Properti sudah diarsipkan.')
    expect(bodyText()).toContain('Tambah aset')
    expect(toastMock.add).not.toHaveBeenCalled()
  })

  it('nama kosong ditolak di klien (create tidak dipanggil)', async () => {
    const state = setupAssetsState()

    const wrapper = await mountPage()

    await wrapper.findAll('button').find(button => button.text().includes('Tambah Aset'))!.trigger('click')
    await flush()

    await bodyButton('Tambah').trigger('click')
    await flush()

    expect(state.create).not.toHaveBeenCalled()
    expect(bodyText()).toContain('Nama aset wajib diisi.')
  })

  it('halaman tidak memanggil logout atau bootstrap auth', async () => {
    setupAssetsState()

    await mountPage()

    expect(authMock.logout).not.toHaveBeenCalled()
    expect(authMock.bootstrap.mock.calls.length).toBeLessThanOrEqual(1)
  })
})
