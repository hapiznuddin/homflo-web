import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { DOMWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import type { VehicleMaintenanceItem } from '~/types/vehicleMaintenance'
import type { VehicleObligationItem } from '~/types/vehicleObligations'
import type {
  VehicleActiveObligationItem,
  VehicleServiceScheduleItem
} from '~/types/vehicleOverview'
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

interface MockOverviewState {
  vehicleCount: Ref<number>
  scannedVehicleCount: Ref<number>
  overviewTruncated: Ref<boolean>
  serviceSchedules: Ref<VehicleServiceScheduleItem[]>
  servicesPending: Ref<boolean>
  servicesStarted: Ref<boolean>
  servicesError: Ref<string | null>
  servicesFailedVehicleIds: Ref<string[]>
  activeObligations: Ref<VehicleActiveObligationItem[]>
  obligationsPending: Ref<boolean>
  obligationsStarted: Ref<boolean>
  obligationsError: Ref<string | null>
  obligationsFailedVehicleIds: Ref<string[]>
  refresh: ReturnType<typeof vi.fn>
  retryServices: ReturnType<typeof vi.fn>
  retryObligations: ReturnType<typeof vi.fn>
}

const overviewMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useVehicleOverview', () => () => overviewMock.api)

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

function sampleService(
  overrides: Partial<VehicleServiceScheduleItem['maintenance']> = {},
  vehicleOverrides: Partial<VehicleItem> = {}
): VehicleServiceScheduleItem {
  const maintenance: VehicleMaintenanceItem = {
    id: '01J0MAINTENANCE000000000001',
    vehicle_id: '01J0VEHICLE000000000000001',
    title: 'Servis rutin',
    description: null,
    scheduled_date: '2026-11-05',
    completed_at: null,
    odometer: 25000,
    status: 'scheduled',
    created_at: '2026-10-01T00:00:00.000000Z',
    updated_at: '2026-10-01T00:00:00.000000Z',
    ...overrides
  }

  return {
    vehicle: sampleItem({ id: maintenance.vehicle_id, ...vehicleOverrides }),
    maintenance
  }
}

function sampleObligation(
  overrides: Partial<VehicleObligationItem> = {},
  vehicleOverrides: Partial<VehicleItem> = {}
): VehicleActiveObligationItem {
  const obligation: VehicleObligationItem = {
    id: '01J0OBLIGATION000000000001',
    vehicle_id: '01J0VEHICLE000000000000001',
    obligation_type: {
      id: '01J0TYPE0000000000000001',
      code: 'tax',
      name: 'Pajak Kendaraan',
      is_system: true
    },
    title: 'Pajak tahunan',
    description: null,
    issued_date: '2026-10-01',
    due_date: '2026-12-31',
    amount: '250000.00',
    status: 'active',
    created_at: '2026-10-01T00:00:00.000000Z',
    updated_at: '2026-10-01T00:00:00.000000Z',
    ...overrides
  }

  return {
    vehicle: sampleItem({ id: obligation.vehicle_id, ...vehicleOverrides }),
    obligation
  }
}

function setupOverviewState(
  overrides: Partial<{
    vehicleCount: number
    scannedVehicleCount: number
    overviewTruncated: boolean
    serviceSchedules: VehicleServiceScheduleItem[]
    servicesPending: boolean
    servicesStarted: boolean
    servicesError: string | null
    servicesFailedVehicleIds: string[]
    activeObligations: VehicleActiveObligationItem[]
    obligationsPending: boolean
    obligationsStarted: boolean
    obligationsError: string | null
    obligationsFailedVehicleIds: string[]
  }> = {}
): MockOverviewState {
  const state: MockOverviewState = {
    vehicleCount: ref(overrides.vehicleCount ?? 1),
    scannedVehicleCount: ref(overrides.scannedVehicleCount ?? 1),
    overviewTruncated: ref(overrides.overviewTruncated ?? false),
    serviceSchedules: ref(overrides.serviceSchedules ?? []),
    servicesPending: ref(overrides.servicesPending ?? false),
    servicesStarted: ref(overrides.servicesStarted ?? true),
    servicesError: ref(overrides.servicesError ?? null),
    servicesFailedVehicleIds: ref(overrides.servicesFailedVehicleIds ?? []),
    activeObligations: ref(overrides.activeObligations ?? []),
    obligationsPending: ref(overrides.obligationsPending ?? false),
    obligationsStarted: ref(overrides.obligationsStarted ?? true),
    obligationsError: ref(overrides.obligationsError ?? null),
    obligationsFailedVehicleIds: ref(overrides.obligationsFailedVehicleIds ?? []),
    refresh: vi.fn(async () => {}),
    retryServices: vi.fn(async () => {}),
    retryObligations: vi.fn(async () => {})
  }

  overviewMock.api = state

  return state
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

  // Keep the overview count aligned with the actual list used by each test.
  // Tests that need populated/error overview sections replace this state
  // explicitly after calling setupVehiclesState().
  setupOverviewState({
    vehicleCount: state.items.value.length,
    scannedVehicleCount: state.items.value.length
  })

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

function section(wrapper: Awaited<ReturnType<typeof mountPage>>, label: string) {
  return wrapper.find(`[aria-label="${label}"]`)
}

function sectionButton(
  wrapper: Awaited<ReturnType<typeof mountPage>>,
  label: string,
  buttonLabel: string
) {
  return section(wrapper, label).findAll('button')
    .find(button => button.text() === buttonLabel)
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

  it('menampilkan jumlah kendaraan dari data yang benar-benar termuat', async () => {
    setupVehiclesState({
      items: [sampleItem(), sampleItem({ id: '01J0VEHICLE000000000000002', name: 'Mobil Avanza' })]
    })

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('2 kendaraan tercatat')
    expect(text).toContain('Motor Beat')
    expect(text).toContain('Mobil Avanza')
  })

  it('menampilkan jadwal servis mendatang dengan identitas kendaraan, tanggal, dan odometer', async () => {
    setupVehiclesState()
    setupOverviewState({
      serviceSchedules: [sampleService()],
      scannedVehicleCount: 1
    })

    const wrapper = await mountPage()
    const serviceSection = section(wrapper, 'Jadwal servis mendatang')
    const text = serviceSection.text()

    expect(text).toContain('Motor Beat')
    expect(text).toContain('B 1234 XYZ')
    expect(text).toContain('Servis rutin')
    expect(text).toMatch(/Jadwal .*2026/)
    expect(text).toContain('25.000 km')
    expect(serviceSection.findAll('a').map(link => link.attributes('href'))).toContain(
      '/vehicles/01J0VEHICLE000000000000001'
    )
  })

  it('menampilkan kewajiban aktif, nominal opsional, dan konteks tanggal lewat tanpa status baru', async () => {
    setupVehiclesState()
    setupOverviewState({
      activeObligations: [sampleObligation({ due_date: '2020-01-01' })],
      scannedVehicleCount: 1
    })

    const wrapper = await mountPage()
    const obligationSection = section(wrapper, 'Kewajiban aktif')
    const text = obligationSection.text()

    expect(text).toContain('Pajak Kendaraan')
    expect(text).toContain('Pajak tahunan')
    expect(text).toContain('Motor Beat')
    expect(text).toContain('250.000')
    expect(text).toContain('Tanggal sudah lewat')
    expect(text).not.toContain('Terlambat')
    expect(text).not.toContain('Overdue')
    expect(obligationSection.findAll('a').map(link => link.attributes('href'))).toContain(
      '/vehicles/01J0VEHICLE000000000000001'
    )
  })

  it('menampilkan empty state terpisah untuk servis dan kewajiban', async () => {
    setupVehiclesState({ items: [] })

    const wrapper = await mountPage()

    expect(section(wrapper, 'Jadwal servis mendatang').text()).toContain(
      'Belum ada jadwal servis mendatang.'
    )
    expect(section(wrapper, 'Kewajiban aktif').text()).toContain('Belum ada kewajiban aktif.')
    expect(wrapper.text()).toContain('Belum ada kendaraan tercatat.')
  })

  it('loading servis tidak menyembunyikan kewajiban yang sudah termuat', async () => {
    setupVehiclesState()
    setupOverviewState({
      servicesPending: true,
      servicesStarted: false,
      activeObligations: [sampleObligation()],
      scannedVehicleCount: 1
    })

    const wrapper = await mountPage()

    expect(section(wrapper, 'Jadwal servis mendatang').find(
      '[aria-label="Memuat jadwal servis mendatang"]'
    ).exists()).toBe(true)
    expect(section(wrapper, 'Kewajiban aktif').text()).toContain('Pajak tahunan')
  })

  it('error servis dapat di-retry tanpa memicu retry kewajiban', async () => {
    setupVehiclesState()
    const overview = setupOverviewState({
      servicesError: 'Jadwal gagal dimuat.',
      servicesFailedVehicleIds: ['01J0VEHICLE000000000000001'],
      scannedVehicleCount: 1
    })

    const wrapper = await mountPage()
    const retry = sectionButton(wrapper, 'Jadwal servis mendatang', 'Coba lagi')

    expect(section(wrapper, 'Jadwal servis mendatang').text()).toContain(
      'Jadwal servis mendatang belum dapat dimuat.'
    )
    expect(retry).toBeDefined()

    await retry!.trigger('click')

    expect(overview.retryServices).toHaveBeenCalledTimes(1)
    expect(overview.retryObligations).not.toHaveBeenCalled()
    expect(authMock.logout).not.toHaveBeenCalled()
  })

  it('error kewajiban dapat di-retry tanpa memicu retry servis', async () => {
    setupVehiclesState()
    const overview = setupOverviewState({
      obligationsError: 'Kewajiban gagal dimuat.',
      obligationsFailedVehicleIds: ['01J0VEHICLE000000000000001'],
      scannedVehicleCount: 1
    })

    const wrapper = await mountPage()
    const retry = sectionButton(wrapper, 'Kewajiban aktif', 'Coba lagi')

    expect(section(wrapper, 'Kewajiban aktif').text()).toContain(
      'Kewajiban aktif belum dapat dimuat.'
    )
    expect(retry).toBeDefined()

    await retry!.trigger('click')

    expect(overview.retryObligations).toHaveBeenCalledTimes(1)
    expect(overview.retryServices).not.toHaveBeenCalled()
  })

  it('tidak menampilkan odometer atau nominal yang tidak dicatat', async () => {
    setupVehiclesState()
    setupOverviewState({
      serviceSchedules: [sampleService({ odometer: null })],
      activeObligations: [sampleObligation({ amount: null })],
      scannedVehicleCount: 1
    })

    const wrapper = await mountPage()

    expect(section(wrapper, 'Jadwal servis mendatang').text()).not.toContain('km')
    expect(section(wrapper, 'Kewajiban aktif').text()).not.toContain('Rp')
  })

  it('partial failure mempertahankan jadwal yang berhasil dan menjelaskan cakupan', async () => {
    setupVehiclesState()
    setupOverviewState({
      serviceSchedules: [sampleService()],
      servicesError: 'Kendaraan tidak ditemukan.',
      servicesFailedVehicleIds: ['01J0VEHICLE000000000000002'],
      scannedVehicleCount: 2
    })

    const wrapper = await mountPage()
    const serviceSection = section(wrapper, 'Jadwal servis mendatang')

    expect(serviceSection.text()).toContain('Servis rutin')
    expect(serviceSection.text()).toContain('Sebagian jadwal servis belum dapat dimuat.')
    expect(serviceSection.text()).toContain('1 dari 2 kendaraan gagal dimuat.')
  })

  it('menjelaskan bila ringkasan hanya memindai sebagian daftar kendaraan', async () => {
    setupVehiclesState()
    setupOverviewState({
      vehicleCount: 25,
      scannedVehicleCount: 20,
      overviewTruncated: true
    })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Ringkasan mencakup sebagian kendaraan.')
    expect(wrapper.text()).toContain('20 kendaraan pertama dari 25 kendaraan')
  })

  it('membatasi pratinjau servis menjadi lima item dan menyebutkan sisanya', async () => {
    setupVehiclesState()
    setupOverviewState({
      serviceSchedules: Array.from({ length: 6 }, (_, index) => sampleService({
        id: `01J0MAINTENANCE00000000000${index}`,
        title: `Servis ${index + 1}`,
        scheduled_date: `2026-11-0${index + 1}`
      })),
      scannedVehicleCount: 1
    })

    const wrapper = await mountPage()
    const serviceSection = section(wrapper, 'Jadwal servis mendatang')

    expect(serviceSection.findAll('li')).toHaveLength(5)
    expect(serviceSection.text()).toContain('Menampilkan 5 dari 6 jadwal terdekat.')
  })

  it('create kendaraan menyegarkan ringkasan setelah server mengonfirmasi', async () => {
    setupVehiclesState()
    const overview = setupOverviewState()

    const wrapper = await mountPage()
    overview.refresh.mockClear()

    await wrapper.findAll('button').find(button => button.text().includes('Tambah Kendaraan'))!.trigger('click')
    await flush()

    await new DOMWrapper(document.body.querySelector('#vehicle-name') as Element).setValue('Mobil Avanza')
    await bodyButton('Tambah').trigger('click')
    await flush()

    expect(overview.refresh).toHaveBeenCalledTimes(1)
  })
})
