import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { DOMWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import type { AssetItem } from '~/types/assets'
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
    ...overrides
  }
}

function setupAssetsState(
  overrides: {
    items?: AssetItem[]
    pending?: boolean
    error?: string | null
  } = {}
): MockAssetsState {
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
      acquisition_cost: '2500000,50'
    })
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Aset ditambah' })
    )
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
