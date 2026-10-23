import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { DOMWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import type { VehicleItem } from '~/types/vehicles'
import type { VehicleMaintenanceItem } from '~/types/vehicleMaintenance'
import DetailPage from '~/pages/vehicles/[id].vue'

// Halaman detail /vehicles/[id] — Service History: kelompok jadwal vs riwayat
// selesai, filter client-side, loading/empty/error/retry, create/edit dengan
// validasi odometer, Complete hanya untuk scheduled, delete dua langkah, dan
// authz owner-only. Backend tetap otoritas; tidak ada klaim sukses palsu.

const VEHICLE_ID = '01J0VEHICLE000000000000001'
const MAINTENANCE_ID = '01J0MAINT0000000000000001'
const COMPLETED_ID = '01J0MAINT0000000000000002'

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

const navigateToMock = vi.hoisted(() => vi.fn())

mockNuxtImport('navigateTo', () => navigateToMock)

const vehiclesMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useVehicles', () => () => vehiclesMock.api)

interface MockMaintenanceApi {
  items: Ref<VehicleMaintenanceItem[]>
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
  complete: ReturnType<typeof vi.fn>
  clearError: ReturnType<typeof vi.fn>
}

const maintenanceMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useVehicleMaintenance', () => () => maintenanceMock.api)

// Section Kewajiban juga dimuat oleh halaman detail; test ini fokus pada
// Service History sehingga state Kewajiban di-mock kosong tanpa request nyata.
const vehicleObligationsMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useVehicleObligations', () => () => vehicleObligationsMock.api)

const obligationTypesMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useObligationTypes', () => () => obligationTypesMock.api)

function vehicleItem(overrides: Partial<VehicleItem> = {}): VehicleItem {
  return {
    id: VEHICLE_ID,
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

function scheduledItem(overrides: Partial<VehicleMaintenanceItem> = {}): VehicleMaintenanceItem {
  return {
    id: MAINTENANCE_ID,
    vehicle_id: VEHICLE_ID,
    title: 'Ganti oli',
    description: 'Oli mesin dan filter',
    scheduled_date: '2026-11-01',
    completed_at: null,
    odometer: 24000,
    status: 'scheduled',
    created_at: '2026-10-01T00:00:00.000000Z',
    updated_at: '2026-10-01T00:00:00.000000Z',
    ...overrides
  }
}

function completedItem(overrides: Partial<VehicleMaintenanceItem> = {}): VehicleMaintenanceItem {
  return {
    id: COMPLETED_ID,
    vehicle_id: VEHICLE_ID,
    title: 'Servis besar',
    description: null,
    scheduled_date: '2026-09-01',
    completed_at: '2026-09-02',
    odometer: 22000,
    status: 'completed',
    created_at: '2026-08-01T00:00:00.000000Z',
    updated_at: '2026-09-02T00:00:00.000000Z',
    ...overrides
  }
}

function setupState(options: {
  items?: VehicleMaintenanceItem[]
  pending?: boolean
  error?: string | null
  fieldErrors?: Record<string, string>
} = {}): MockMaintenanceApi {
  const vehicles = {
    items: ref([vehicleItem()]),
    pending: ref(false),
    submitting: ref(false),
    error: ref(null),
    errorCode: ref(null),
    fieldErrors: ref({}),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {}),
    fetchOne: vi.fn(async () => vehicleItem()),
    create: vi.fn(async () => vehicleItem()),
    update: vi.fn(async () => vehicleItem()),
    remove: vi.fn(async () => true),
    clearError: vi.fn()
  }

  vehiclesMock.api = vehicles

  const maintenance: MockMaintenanceApi = {
    items: ref(options.items ?? []),
    pending: ref(options.pending ?? false),
    submitting: ref(false),
    error: ref(options.error ?? null),
    errorCode: ref(null),
    fieldErrors: ref(options.fieldErrors ?? {}),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {}),
    fetchOne: vi.fn(),
    create: vi.fn(async () => null),
    update: vi.fn(async () => null),
    remove: vi.fn(async () => false),
    complete: vi.fn(async () => null),
    clearError: vi.fn()
  }

  maintenanceMock.api = maintenance

  vehicleObligationsMock.api = {
    items: ref([]),
    pending: ref(false),
    submitting: ref(false),
    error: ref(null),
    errorCode: ref(null),
    fieldErrors: ref({}),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {}),
    create: vi.fn(async () => null),
    update: vi.fn(async () => null),
    remove: vi.fn(async () => false),
    clearError: vi.fn()
  }

  obligationTypesMock.api = {
    items: ref([]),
    pending: ref(false),
    submitting: ref(false),
    error: ref(null),
    errorCode: ref(null),
    fieldErrors: ref({}),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {}),
    create: vi.fn(async () => null),
    update: vi.fn(async () => null),
    remove: vi.fn(async () => false),
    clearError: vi.fn()
  }

  return maintenance
}

async function mountDetail(vehicleId = VEHICLE_ID) {
  return mountSuspended(DetailPage, { route: `/vehicles/${vehicleId}` })
}

async function flush(): Promise<void> {
  for (let index = 0; index < 5; index++) {
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

function serviceSection(wrapper: Awaited<ReturnType<typeof mountDetail>>) {
  return wrapper.find('[aria-label="Riwayat servis"]')
}

function serviceButtons(wrapper: Awaited<ReturnType<typeof mountDetail>>) {
  return serviceSection(wrapper).findAll('button')
}

function rows(wrapper: Awaited<ReturnType<typeof mountDetail>>) {
  return serviceSection(wrapper).findAll('li')
}

function rowByTitle(
  wrapper: Awaited<ReturnType<typeof mountDetail>>,
  title: string
) {
  return rows(wrapper).find(row => row.text().includes(title))
}

function rowButton(
  wrapper: Awaited<ReturnType<typeof mountDetail>>,
  title: string,
  label: string
) {
  return rowByTitle(wrapper, title)?.findAll('button').find(button => button.text() === label)
}

function filterButton(
  wrapper: Awaited<ReturnType<typeof mountDetail>>,
  label: string
) {
  return wrapper
    .find('[aria-label="Filter status servis"]')
    .findAll('button')
    .find(button => button.text() === label)
}

function text(): string {
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

function bodyInput(selector: string): DOMWrapper<Element> {
  return new DOMWrapper(document.body.querySelector(selector) as Element)
}

beforeEach(() => {
  authMock.isHouseholdOwner.value = true
  toastMock.add.mockClear()
  navigateToMock.mockClear()
})

// UModal me-render via teleport yang tidak selalu ikut ter-unmount bersama
// wrapper; bersihkan sisa modal antar test.
afterEach(() => {
  document.body.innerHTML = ''
})

describe('vehicle detail — service history', () => {
  it('menampilkan jadwal dan riwayat selesai dalam kelompok terpisah tanpa duplikasi', async () => {
    setupState({ items: [scheduledItem(), completedItem()] })

    const wrapper = await mountDetail()
    const sectionText = serviceSection(wrapper).text()

    expect(sectionText).toContain('Jadwal Servis')
    expect(sectionText).toContain('Riwayat Servis Selesai')
    expect(sectionText).toContain('Ganti oli')
    expect(sectionText).toContain('Servis besar')
    expect(sectionText).toContain('Terjadwal')
    expect(sectionText).toContain('Selesai')
    // Setiap judul hanya muncul sekali di daftar (tidak diduplikasi).
    expect(sectionText.split('Ganti oli')).toHaveLength(2)
    expect(sectionText.split('Servis besar')).toHaveLength(2)
  })

  it('empty state jujur ketika belum ada catatan servis', async () => {
    setupState({ items: [] })

    const wrapper = await mountDetail()

    expect(serviceSection(wrapper).text()).toContain('Belum ada catatan servis untuk kendaraan ini.')
    expect(serviceSection(wrapper).text()).not.toContain('Jadwal Servis')
  })

  it('membedakan empty state jadwal dan riwayat selesai', async () => {
    setupState({ items: [scheduledItem()] })

    let wrapper = await mountDetail()

    expect(serviceSection(wrapper).text()).toContain('Belum ada riwayat servis selesai.')

    document.body.innerHTML = ''
    setupState({ items: [completedItem()] })

    wrapper = await mountDetail()

    expect(serviceSection(wrapper).text()).toContain('Belum ada jadwal servis.')
  })

  it('filter status client-side menyembunyikan kelompok yang tidak dipilih', async () => {
    setupState({ items: [scheduledItem(), completedItem()] })

    const wrapper = await mountDetail()

    await filterButton(wrapper, 'Selesai')!.trigger('click')
    await flush()

    expect(serviceSection(wrapper).text()).toContain('Servis besar')
    expect(serviceSection(wrapper).text()).not.toContain('Ganti oli')
    expect(serviceSection(wrapper).text()).not.toContain('Jadwal Servis')

    await filterButton(wrapper, 'Terjadwal')!.trigger('click')
    await flush()

    expect(serviceSection(wrapper).text()).toContain('Ganti oli')
    expect(serviceSection(wrapper).text()).not.toContain('Servis besar')
    expect(serviceSection(wrapper).text()).not.toContain('Riwayat Servis Selesai')
  })

  it('loading state servis tampil selama daftar belum termuat', async () => {
    setupState({ items: [], pending: true })

    const wrapper = await mountDetail()

    expect(serviceSection(wrapper).find('[aria-label="Memuat riwayat servis"]').exists()).toBe(true)
  })

  it('error memuat servis menampilkan alert + Coba lagi memanggil refresh', async () => {
    const state = setupState({ items: [], error: 'Server error.' })

    const wrapper = await mountDetail()

    expect(serviceSection(wrapper).text()).toContain('Riwayat servis belum dapat dimuat.')
    expect(serviceSection(wrapper).text()).toContain('Server error.')

    await serviceButtons(wrapper).find(button => button.text() === 'Coba lagi')!.trigger('click')

    expect(state.refresh).toHaveBeenCalledTimes(1)
  })

  it('owner dapat membuat catatan servis dan daftar diperbarui setelah server sukses', async () => {
    const state = setupState({ items: [scheduledItem()] })
    const created = scheduledItem({
      id: '01J0MAINT0000000000000009',
      title: 'Cek rem',
      scheduled_date: '2026-12-05',
      odometer: 25000
    })

    state.create.mockImplementation(async () => {
      state.items.value = [...state.items.value, created]

      return created
    })

    const wrapper = await mountDetail()

    await serviceButtons(wrapper).find(button => button.text() === 'Tambah Servis')!.trigger('click')
    await flush()

    expect(text()).toContain('Tambah catatan servis')

    await bodyInput('#vehicle-maintenance-title').setValue('Cek rem')
    await bodyInput('#vehicle-maintenance-scheduled-date').setValue('2026-12-05')
    await bodyInput('#vehicle-maintenance-odometer').setValue('25000')
    await bodyButton('Tambah').trigger('click')
    await flush()

    expect(state.create).toHaveBeenCalledWith({
      title: 'Cek rem',
      description: '',
      scheduled_date: '2026-12-05',
      odometer: '25000'
    })
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Catatan servis ditambah' })
    )
    expect(serviceSection(wrapper).text()).toContain('Cek rem')
  })

  it('form edit terisi data record dan mengirim update ke record yang sama', async () => {
    const state = setupState({ items: [scheduledItem()] })
    const updated = scheduledItem({ title: 'Ganti oli dan filter' })

    state.update.mockImplementation(async () => {
      state.items.value = [updated]

      return updated
    })

    const wrapper = await mountDetail()

    await rowButton(wrapper, 'Ganti oli', 'Ubah')!.trigger('click')
    await flush()

    expect(text()).toContain('Ubah catatan servis')
    expect((document.body.querySelector('#vehicle-maintenance-title') as HTMLInputElement).value).toBe('Ganti oli')
    expect((document.body.querySelector('#vehicle-maintenance-scheduled-date') as HTMLInputElement).value).toBe('2026-11-01')
    expect((document.body.querySelector('#vehicle-maintenance-odometer') as HTMLInputElement).value).toBe('24000')

    await bodyInput('#vehicle-maintenance-title').setValue('Ganti oli dan filter')
    await bodyButton('Simpan').trigger('click')
    await flush()

    expect(state.update).toHaveBeenCalledWith(MAINTENANCE_ID, {
      title: 'Ganti oli dan filter',
      description: 'Oli mesin dan filter',
      scheduled_date: '2026-11-01',
      odometer: '24000'
    })
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Catatan servis diubah' })
    )
    expect(serviceSection(wrapper).text()).toContain('Ganti oli dan filter')
  })

  it('validasi klien: judul dan tanggal wajib — tidak memanggil create', async () => {
    const state = setupState({ items: [scheduledItem()] })

    const wrapper = await mountDetail()

    await serviceButtons(wrapper).find(button => button.text() === 'Tambah Servis')!.trigger('click')
    await flush()
    await bodyButton('Tambah').trigger('click')
    await flush()

    expect(state.create).not.toHaveBeenCalled()
    expect(text()).toContain('Judul wajib diisi.')
    expect(text()).toContain('Tanggal jadwal wajib diisi.')
  })

  it('odometer negatif ditolak klien sebelum request', async () => {
    const state = setupState({ items: [scheduledItem()] })

    const wrapper = await mountDetail()

    await serviceButtons(wrapper).find(button => button.text() === 'Tambah Servis')!.trigger('click')
    await flush()

    await bodyInput('#vehicle-maintenance-title').setValue('Servis rem')
    await bodyInput('#vehicle-maintenance-scheduled-date').setValue('2026-12-05')
    await bodyInput('#vehicle-maintenance-odometer').setValue('-1')
    await bodyButton('Tambah').trigger('click')
    await flush()

    expect(state.create).not.toHaveBeenCalled()
    expect(text()).toContain('Odometer harus berupa bilangan bulat 0 atau lebih.')
  })

  it('tombol Selesai hanya tersedia pada record scheduled', async () => {
    setupState({ items: [scheduledItem(), completedItem()] })

    const wrapper = await mountDetail()

    expect(rowButton(wrapper, 'Ganti oli', 'Selesai')).toBeDefined()
    expect(rowButton(wrapper, 'Servis besar', 'Selesai')).toBeUndefined()
  })

  it('Complete memerlukan konfirmasi dan baru memanggil server setelah dikonfirmasi', async () => {
    const state = setupState({ items: [scheduledItem()] })
    const completed = scheduledItem({ status: 'completed', completed_at: '2026-10-23' })

    state.complete.mockImplementation(async () => {
      state.items.value = [completed]

      return completed
    })

    const wrapper = await mountDetail()

    await rowButton(wrapper, 'Ganti oli', 'Selesai')!.trigger('click')
    await flush()

    expect(serviceSection(wrapper).text()).toContain('Tandai servis ini selesai?')
    expect(state.complete).not.toHaveBeenCalled()

    await rowButton(wrapper, 'Ganti oli', 'Ya, selesaikan')!.trigger('click')
    await flush()

    expect(state.complete).toHaveBeenCalledWith(MAINTENANCE_ID)
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Servis selesai' })
    )
    // Status baru ditampilkan setelah server mengonfirmasi: record pindah ke
    // kelompok selesai dan tombol Complete hilang.
    expect(rowButton(wrapper, 'Ganti oli', 'Selesai')).toBeUndefined()
  })

  it('Complete gagal (sudah selesai di server) menampilkan error tanpa sukses palsu', async () => {
    const state = setupState({ items: [scheduledItem()] })

    state.complete.mockImplementation(async () => {
      state.error.value = 'Servis kendaraan ini sudah ditandai selesai.'
      state.errorCode.value = 'VEHICLE_MAINTENANCE_ALREADY_COMPLETED'

      return null
    })

    const wrapper = await mountDetail()

    await rowButton(wrapper, 'Ganti oli', 'Selesai')!.trigger('click')
    await flush()
    await rowButton(wrapper, 'Ganti oli', 'Ya, selesaikan')!.trigger('click')
    await flush()

    expect(state.complete).toHaveBeenCalledWith(MAINTENANCE_ID)
    expect(serviceSection(wrapper).text()).toContain('Aksi terakhir gagal.')
    expect(serviceSection(wrapper).text()).toContain('Servis kendaraan ini sudah ditandai selesai.')
    expect(toastMock.add).not.toHaveBeenCalled()
  })

  it('hapus record memerlukan konfirmasi dan tidak menghapus kendaraan', async () => {
    const state = setupState({ items: [scheduledItem()] })

    state.remove.mockImplementation(async () => {
      state.items.value = []

      return true
    })

    const wrapper = await mountDetail()

    await rowButton(wrapper, 'Ganti oli', 'Hapus')!.trigger('click')
    await flush()

    expect(serviceSection(wrapper).text()).toContain('Hapus catatan servis ini?')
    expect(state.remove).not.toHaveBeenCalled()

    await rowButton(wrapper, 'Ganti oli', 'Ya, hapus')!.trigger('click')
    await flush()

    expect(state.remove).toHaveBeenCalledWith(MAINTENANCE_ID)
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Catatan servis dihapus' })
    )
    // Kendaraan tidak ikut dihapus.
    expect((vehiclesMock.api as { remove: ReturnType<typeof vi.fn> }).remove).not.toHaveBeenCalled()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('hapus gagal menampilkan error tanpa toast sukses', async () => {
    const state = setupState({ items: [scheduledItem()] })

    state.remove.mockImplementation(async () => {
      state.error.value = 'Catatan servis belum dapat dihapus.'

      return false
    })

    const wrapper = await mountDetail()

    await rowButton(wrapper, 'Ganti oli', 'Hapus')!.trigger('click')
    await flush()
    await rowButton(wrapper, 'Ganti oli', 'Ya, hapus')!.trigger('click')
    await flush()

    expect(state.remove).toHaveBeenCalledWith(MAINTENANCE_ID)
    expect(serviceSection(wrapper).text()).toContain('Catatan servis belum dapat dihapus.')
    expect(toastMock.add).not.toHaveBeenCalled()
  })

  it('member hanya membaca riwayat servis (tanpa kontrol tulis)', async () => {
    authMock.isHouseholdOwner.value = false
    setupState({ items: [scheduledItem(), completedItem()] })

    const wrapper = await mountDetail()

    expect(serviceSection(wrapper).text()).toContain('Ganti oli')
    expect(serviceSection(wrapper).text()).toContain('riwayat servis hanya dapat dilihat')
    expect(serviceButtons(wrapper).find(button => button.text() === 'Tambah Servis')).toBeUndefined()
    expect(rowButton(wrapper, 'Ganti oli', 'Selesai')).toBeUndefined()
    expect(rowButton(wrapper, 'Ganti oli', 'Ubah')).toBeUndefined()
    expect(rowButton(wrapper, 'Ganti oli', 'Hapus')).toBeUndefined()
  })
})
