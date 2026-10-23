import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { DOMWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import type { VehicleItem } from '~/types/vehicles'
import VehiclesPage from '~/pages/vehicles/index.vue'

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

interface MockVehiclesState {
  items: Ref<VehicleItem[]>
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
  remove: ReturnType<typeof vi.fn>
  clearError: ReturnType<typeof vi.fn>
}

const vehiclesMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useVehicles', () => () => vehiclesMock.api)

function sampleItem(overrides: Partial<VehicleItem> = {}): VehicleItem {
  return {
    id: '01J0VEHICLE000000000000001',
    household_id: 'h1',
    name: 'Motor Beat',
    brand: 'Honda',
    model: 'Beat FI',
    year: 2019,
    type: 'Sepeda motor',
    plate_number: 'B 1234 XYZ',
    odometer: 24000,
    created_at: '2026-01-15T00:00:00.000000Z',
    updated_at: '2026-01-15T00:00:00.000000Z',
    ...overrides
  }
}

function setupVehiclesState(
  overrides: {
    items?: VehicleItem[]
    pending?: boolean
    error?: string | null
  } = {}
): MockVehiclesState {
  const state: MockVehiclesState = {
    items: ref(overrides.items ?? [sampleItem()]),
    pending: ref(overrides.pending ?? false),
    submitting: ref(false),
    error: ref(overrides.error ?? null),
    errorCode: ref(null),
    fieldErrors: ref({}),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {}),
    fetchOne: vi.fn(async () => sampleItem()),
    create: vi.fn(async () => sampleItem()),
    update: vi.fn(async () => sampleItem()),
    remove: vi.fn(async () => true),
    clearError: vi.fn()
  }

  vehiclesMock.api = state

  return state
}

async function mountPage() {
  return mountSuspended(VehiclesPage, { route: '/vehicles' })
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

describe('vehicles list page', () => {
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

  it('menampilkan kendaraan dari API beserta merek, model, tahun, plat, tipe, dan odometer', async () => {
    setupVehiclesState()

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Kendaraan')
    expect(text).toContain('Motor Beat')
    expect(text).toContain('Honda')
    expect(text).toContain('Beat FI')
    expect(text).toContain('2019')
    expect(text).toContain('B 1234 XYZ')
    expect(text).toContain('Sepeda motor')
    expect(text).toContain('24.000 km')
  })

  it('hanya menampilkan field yang tersedia (tanpa karangan nilai)', async () => {
    setupVehiclesState({
      items: [sampleItem({ brand: null, model: null, year: null, type: null, plate_number: null, odometer: null })]
    })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Motor Beat')
    expect(wrapper.text()).toContain('Tanpa detail tambahan')
    expect(wrapper.text()).not.toContain('km')
  })

  it('setiap kendaraan membuka /vehicles/{id} (list → detail)', async () => {
    setupVehiclesState()

    const wrapper = await mountPage()
    const link = wrapper.find('a[href="/vehicles/01J0VEHICLE000000000000001"]')

    expect(link.exists()).toBe(true)
    expect(link.text()).toContain('Motor Beat')
  })

  it('state loading menampilkan skeleton tanpa konten privat', async () => {
    setupVehiclesState({ items: [], pending: true })

    const wrapper = await mountPage()

    expect(wrapper.find('[aria-label="Memuat kendaraan"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Motor Beat')
  })

  it('state kosong menampilkan pesan jujur + CTA untuk owner', async () => {
    setupVehiclesState({ items: [] })

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Belum ada kendaraan tercatat.')
    expect(text).toContain('Tambah Kendaraan')
  })

  it('state error saat list kosong menampilkan alert + retry tanpa logout', async () => {
    setupVehiclesState({ items: [], error: 'Koneksi terputus' })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Data kendaraan belum dapat dimuat.')
    expect(wrapper.text()).toContain('Koneksi terputus')
    expect(wrapper.text()).toContain('Coba lagi')
    expect(authMock.logout).not.toHaveBeenCalled()
  })

  it('tombol "Coba lagi" memanggil refresh()', async () => {
    const state = setupVehiclesState({ items: [], error: 'Koneksi terputus' })

    const wrapper = await mountPage()
    const retryButton = wrapper.findAll('button').find(button => button.text().includes('Coba lagi'))

    expect(retryButton).toBeDefined()

    await retryButton!.trigger('click')

    expect(state.refresh).toHaveBeenCalledTimes(1)
  })

  it('error aksi dengan list utuh tidak menyembunyikan kendaraan', async () => {
    setupVehiclesState({ error: 'Kendaraan belum dapat dihapus.' })

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Motor Beat')
    expect(text).toContain('Aksi terakhir gagal.')
  })

  it('member tidak memperoleh kontrol write (tombol/CTA tambah tidak ada)', async () => {
    authMock.isHouseholdOwner.value = false
    setupVehiclesState({ items: [] })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Belum ada kendaraan tercatat.')
    expect(wrapper.findAll('button').some(button => button.text().includes('Tambah Kendaraan'))).toBe(false)
  })

  it('form create meneruskan nilai form ke create() dan toast sukses', async () => {
    const state = setupVehiclesState()

    const wrapper = await mountPage()

    await wrapper.findAll('button').find(button => button.text().includes('Tambah Kendaraan'))!.trigger('click')
    await flush()

    expect(bodyText()).toContain('Tambah kendaraan')

    await new DOMWrapper(document.body.querySelector('#vehicle-name') as Element).setValue('Mobil Avanza')
    await new DOMWrapper(document.body.querySelector('#vehicle-brand') as Element).setValue('Toyota')
    await new DOMWrapper(document.body.querySelector('#vehicle-model') as Element).setValue('Avanza G')
    await new DOMWrapper(document.body.querySelector('#vehicle-year') as Element).setValue('2021')
    await new DOMWrapper(document.body.querySelector('#vehicle-plate') as Element).setValue('B 9999 ZZ')
    await new DOMWrapper(document.body.querySelector('#vehicle-type') as Element).setValue('Mobil')
    await new DOMWrapper(document.body.querySelector('#vehicle-odometer') as Element).setValue('15000')

    await bodyButton('Tambah').trigger('click')
    await flush()

    expect(state.create).toHaveBeenCalledTimes(1)
    expect(state.create).toHaveBeenCalledWith({
      name: 'Mobil Avanza',
      brand: 'Toyota',
      model: 'Avanza G',
      year: '2021',
      license_plate: 'B 9999 ZZ',
      type: 'Mobil',
      odometer: '15000'
    })
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Kendaraan ditambah' })
    )
  })

  it('nama kosong ditolak di klien (create tidak dipanggil)', async () => {
    const state = setupVehiclesState()

    const wrapper = await mountPage()

    await wrapper.findAll('button').find(button => button.text().includes('Tambah Kendaraan'))!.trigger('click')
    await flush()

    await bodyButton('Tambah').trigger('click')
    await flush()

    expect(state.create).not.toHaveBeenCalled()
    expect(bodyText()).toContain('Nama kendaraan wajib diisi.')
  })

  it('tahun tidak valid ditolak di klien (create tidak dipanggil)', async () => {
    const state = setupVehiclesState()

    const wrapper = await mountPage()

    await wrapper.findAll('button').find(button => button.text().includes('Tambah Kendaraan'))!.trigger('click')
    await flush()

    await new DOMWrapper(document.body.querySelector('#vehicle-name') as Element).setValue('Mobil')
    await new DOMWrapper(document.body.querySelector('#vehicle-year') as Element).setValue('1800')

    await bodyButton('Tambah').trigger('click')
    await flush()

    expect(state.create).not.toHaveBeenCalled()
  })

  it('halaman tidak memanggil logout atau bootstrap auth', async () => {
    setupVehiclesState()

    await mountPage()

    expect(authMock.logout).not.toHaveBeenCalled()
    expect(authMock.bootstrap.mock.calls.length).toBeLessThanOrEqual(1)
  })
})
