import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import type { AssetItem } from '~/types/assets'
import type { MaintenanceFormValues, MaintenanceItem } from '~/types/maintenance'
import MaintenanceFormModal from '~/components/maintenance/MaintenanceFormModal.vue'
import MaintenancePage from '~/pages/maintenance/index.vue'
import { formatYmd } from '~/utils/format'

// Halaman daftar /maintenance: semua member membaca; create hanya owner;
// filter status client-side; loading/empty/error jujur; nama aset di-resolve
// dari composable Assets (bukan request asset kedua).

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

interface MockMaintenanceState {
  items: Ref<MaintenanceItem[]>
  pending: Ref<boolean>
  submitting: Ref<boolean>
  error: Ref<string | null>
  fieldErrors: Ref<Record<string, string>>
  load: ReturnType<typeof vi.fn>
  refresh: ReturnType<typeof vi.fn>
  fetchOne: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
  complete: ReturnType<typeof vi.fn>
  cancel: ReturnType<typeof vi.fn>
  clearError: ReturnType<typeof vi.fn>
}

const maintenanceMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useMaintenance', () => () => maintenanceMock.api)

interface MockAssetsState {
  items: Ref<AssetItem[]>
  pending: Ref<boolean>
  error: Ref<string | null>
  load: ReturnType<typeof vi.fn>
  refresh: ReturnType<typeof vi.fn>
  clearError: ReturnType<typeof vi.fn>
}

const assetsMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useAssets', () => () => assetsMock.api)

const ASSET_ID = '01J0ASSET0000000000000001'
const MAINTENANCE_ID = '01J0MAINT0000000000000001'

function maintenanceItem(overrides: Partial<MaintenanceItem> = {}): MaintenanceItem {
  return {
    id: MAINTENANCE_ID,
    household_id: 'h1',
    asset_id: ASSET_ID,
    title: 'Cuci AC kamar',
    description: 'Rutin bulanan',
    location: 'Kamar utama',
    scheduled_date: '2026-11-01',
    completed_at: null,
    cancelled_at: null,
    priority: 'rutin',
    status: 'scheduled',
    created_at: '2026-10-01T00:00:00.000000Z',
    updated_at: '2026-10-01T00:00:00.000000Z',
    ...overrides
  }
}

function assetItem(overrides: Partial<AssetItem> = {}): AssetItem {
  return {
    id: ASSET_ID,
    household_id: 'h1',
    name: 'Mesin cuci dapur',
    description: null,
    location: 'Kamar utama',
    acquired_on: '2026-01-15',
    acquisition_cost: '4500000.00',
    created_at: '2026-01-15T00:00:00.000000Z',
    updated_at: '2026-01-15T00:00:00.000000Z',
    ...overrides
  }
}

function setupMaintenanceState(
  overrides: {
    items?: MaintenanceItem[]
    pending?: boolean
    error?: string | null
  } = {}
): MockMaintenanceState {
  const state: MockMaintenanceState = {
    items: ref(overrides.items ?? [maintenanceItem()]),
    pending: ref(overrides.pending ?? false),
    submitting: ref(false),
    error: ref(overrides.error ?? null),
    fieldErrors: ref({}),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {}),
    fetchOne: vi.fn(async () => maintenanceItem()),
    create: vi.fn(async () => maintenanceItem()),
    update: vi.fn(async () => maintenanceItem()),
    remove: vi.fn(async () => true),
    complete: vi.fn(async () => maintenanceItem({ status: 'completed' })),
    cancel: vi.fn(async () => maintenanceItem({ status: 'cancelled' })),
    clearError: vi.fn()
  }

  maintenanceMock.api = state

  return state
}

function setupAssetsState(
  overrides: { items?: AssetItem[], pending?: boolean, error?: string | null } = {}
): MockAssetsState {
  const state: MockAssetsState = {
    items: ref(overrides.items ?? [assetItem()]),
    pending: ref(overrides.pending ?? false),
    error: ref(overrides.error ?? null),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {}),
    clearError: vi.fn()
  }

  assetsMock.api = state

  return state
}

async function mountPage() {
  return mountSuspended(MaintenancePage, { route: '/maintenance' })
}

async function flush(): Promise<void> {
  for (let index = 0; index < 5; index++) {
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

describe('maintenance list page', () => {
  beforeEach(() => {
    authMock.isHouseholdOwner.value = true
    authMock.logout.mockClear()
    toastMock.add.mockClear()
    setupAssetsState()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('menampilkan judul, aset, lokasi, jadwal, prioritas, dan status', async () => {
    setupMaintenanceState()

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Perawatan Rumah')
    expect(text).toContain('Cuci AC kamar')
    expect(text).toContain('Mesin cuci dapur')
    expect(text).toContain('Kamar utama')
    expect(text).toContain(formatYmd('2026-11-01'))
    expect(text).toContain('Rutin')
    expect(text).toContain('Terjadwal')
  })

  it('baris membuka /maintenance/{id}', async () => {
    setupMaintenanceState()

    const wrapper = await mountPage()
    const link = wrapper.find(`a[href="/maintenance/${MAINTENANCE_ID}"]`)

    expect(link.exists()).toBe(true)
    expect(link.text()).toContain('Cuci AC kamar')
  })

  it('aset yang sudah dihapus (asset_id null) ditampilkan tanpa nama aset', async () => {
    setupMaintenanceState({ items: [maintenanceItem({ asset_id: null })] })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Cuci AC kamar')
    expect(wrapper.text()).not.toContain('Mesin cuci dapur')
  })

  it('filter status client-side menyaring daftar', async () => {
    setupMaintenanceState({
      items: [
        maintenanceItem({ id: 'm1', title: 'Cuci AC kamar', status: 'scheduled' }),
        maintenanceItem({ id: 'm2', title: 'Servis kulkas', status: 'completed', completed_at: '2026-10-20' }),
        maintenanceItem({ id: 'm3', title: 'Ganti filter', status: 'cancelled', cancelled_at: '2026-10-21' })
      ]
    })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Cuci AC kamar')
    expect(wrapper.text()).toContain('Servis kulkas')
    expect(wrapper.text()).toContain('Ganti filter')

    const completedFilter = wrapper.findAll('button').find(button => button.text() === 'Selesai')

    expect(completedFilter).toBeDefined()

    await completedFilter!.trigger('click')

    expect(wrapper.text()).toContain('Servis kulkas')
    expect(wrapper.text()).not.toContain('Cuci AC kamar')
    expect(wrapper.text()).not.toContain('Ganti filter')
  })

  it('filter tanpa hasil menampilkan pesan jujur', async () => {
    setupMaintenanceState({
      items: [maintenanceItem({ status: 'scheduled' })]
    })

    const wrapper = await mountPage()
    const cancelledFilter = wrapper.findAll('button').find(button => button.text() === 'Dibatalkan')

    await cancelledFilter!.trigger('click')

    expect(wrapper.text()).toContain('Tidak ada perawatan dengan status ini.')
  })

  it('state loading menampilkan skeleton tanpa data privat', async () => {
    setupMaintenanceState({ items: [], pending: true })

    const wrapper = await mountPage()

    expect(wrapper.find('[aria-label="Memuat perawatan"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Cuci AC kamar')
  })

  it('state kosong menampilkan pesan jujur + CTA untuk owner', async () => {
    setupMaintenanceState({ items: [] })

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Belum ada catatan perawatan.')
    expect(text).toContain('Tambah Perawatan')
  })

  it('state error saat list kosong menampilkan alert + retry tanpa logout', async () => {
    setupMaintenanceState({ items: [], error: 'Koneksi terputus' })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Data perawatan belum dapat dimuat.')
    expect(wrapper.text()).toContain('Koneksi terputus')
    expect(wrapper.text()).toContain('Coba lagi')
    expect(authMock.logout).not.toHaveBeenCalled()
  })

  it('tombol "Coba lagi" memanggil refresh()', async () => {
    const state = setupMaintenanceState({ items: [], error: 'Koneksi terputus' })

    const wrapper = await mountPage()
    const retryButton = wrapper.findAll('button').find(button => button.text().includes('Coba lagi'))

    expect(retryButton).toBeDefined()

    await retryButton!.trigger('click')

    expect(state.refresh).toHaveBeenCalledTimes(1)
  })

  it('error aksi dengan list utuh tidak menyembunyikan data', async () => {
    setupMaintenanceState({ error: 'Perawatan belum dapat dihapus.' })

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Cuci AC kamar')
    expect(text).toContain('Aksi terakhir gagal.')
  })

  it('member tidak memperoleh kontrol write (CTA tambah tidak ada)', async () => {
    authMock.isHouseholdOwner.value = false
    setupMaintenanceState({ items: [] })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Belum ada catatan perawatan.')
    expect(wrapper.findAll('button').some(button => button.text().includes('Tambah Perawatan'))).toBe(false)
  })

  it('form create meneruskan nilai form ke create() dan toast sukses', async () => {
    const state = setupMaintenanceState()

    const wrapper = await mountPage()

    await wrapper.findAll('button').find(button => button.text().includes('Tambah Perawatan'))!.trigger('click')
    await flush()

    expect(document.body.textContent ?? '').toContain('Tambah perawatan')

    const values: MaintenanceFormValues = {
      asset_id: ASSET_ID,
      title: 'Servis AC',
      description: '',
      location: 'Ruang tamu',
      scheduled_date: '2026-12-01',
      priority: 'tinggi'
    }

    wrapper.findComponent(MaintenanceFormModal).vm.$emit('submit', values)
    await flush()

    expect(state.create).toHaveBeenCalledTimes(1)
    expect(state.create).toHaveBeenCalledWith(values)
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Perawatan ditambah' })
    )
  })

  it('error create tampil di modal tanpa toast sukses palsu', async () => {
    const state = setupMaintenanceState()

    state.create.mockImplementation(async () => {
      state.error.value = 'Kolom judul wajib diisi.'

      return null
    })

    const wrapper = await mountPage()

    await wrapper.findAll('button').find(button => button.text().includes('Tambah Perawatan'))!.trigger('click')
    await flush()

    wrapper.findComponent(MaintenanceFormModal).vm.$emit('submit', {
      asset_id: ASSET_ID,
      title: '',
      description: '',
      location: 'Ruang tamu',
      scheduled_date: '2026-12-01',
      priority: 'rutin'
    })
    await flush()

    expect(document.body.textContent ?? '').toContain('Data belum dapat disimpan.')
    expect(toastMock.add).not.toHaveBeenCalled()
  })

  it('halaman tidak memanggil logout atau bootstrap auth berulang', async () => {
    setupMaintenanceState()

    await mountPage()

    expect(authMock.logout).not.toHaveBeenCalled()
    expect(authMock.bootstrap.mock.calls.length).toBeLessThanOrEqual(1)
  })
})
