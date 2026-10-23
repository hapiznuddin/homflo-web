import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { DOMWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import type { VehicleItem } from '~/types/vehicles'
import DetailPage from '~/pages/vehicles/[id].vue'

// Halaman detail /vehicles/[id]: deep-linkable lewat GET /api/vehicles/{id},
// states loading/error/not-found, Vehicle Information, aksi tulis hanya owner
// (backend tetap otoritas), delete dua langkah, penanganan konflik riwayat
// servis (409), dan tidak ada klaim sukses palsu.

const VEHICLE_ID = '01J0VEHICLE000000000000001'

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

interface MockVehiclesApi {
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

function setupVehiclesState(
  overrides: {
    fetchOne?: ReturnType<typeof vi.fn>
    update?: ReturnType<typeof vi.fn>
    remove?: ReturnType<typeof vi.fn>
  } = {}
): MockVehiclesApi {
  const api: MockVehiclesApi = {
    items: ref([vehicleItem()]),
    pending: ref(false),
    submitting: ref(false),
    error: ref(null),
    errorCode: ref(null),
    fieldErrors: ref({}),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {}),
    fetchOne: overrides.fetchOne ?? vi.fn(async () => vehicleItem()),
    create: vi.fn(async () => vehicleItem()),
    update: overrides.update ?? vi.fn(async () => vehicleItem()),
    remove: overrides.remove ?? vi.fn(async () => true),
    clearError: vi.fn()
  }

  vehiclesMock.api = api

  return api
}

async function mountDetail() {
  return mountSuspended(DetailPage, { route: `/vehicles/${VEHICLE_ID}` })
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

function actionButton(wrapper: Awaited<ReturnType<typeof mountDetail>>, label: string) {
  return wrapper.findAll('button').find(button => button.text() === label)
}

beforeEach(() => {
  authMock.isHouseholdOwner.value = true
  authMock.logout.mockClear()
  toastMock.add.mockClear()
  navigateToMock.mockClear()
})

// UModal me-render via teleport yang tidak selalu ikut ter-unmount bersama
// wrapper; bersihkan sisa modal antar test.
afterEach(() => {
  document.body.innerHTML = ''
})

describe('vehicle detail page', () => {
  it('direct navigation memuat kendaraan sesuai ID route + Vehicle Information', async () => {
    const state = setupVehiclesState()

    const wrapper = await mountDetail()

    expect(state.fetchOne).toHaveBeenCalledWith(VEHICLE_ID)

    const text = wrapper.text()

    expect(text).toContain('Motor Beat')
    expect(text).toContain('Informasi Kendaraan')
    expect(text).toContain('Honda')
    expect(text).toContain('Beat FI')
    expect(text).toContain('2019')
    expect(text).toContain('B 1234 XYZ')
    expect(text).toContain('Sepeda motor')
    expect(text).toContain('24.000 km')
    expect(wrapper.find('a[href="/vehicles"]').exists()).toBe(true)
    expect(authMock.logout).not.toHaveBeenCalled()
  })

  it('field kosong ditampilkan apa adanya sebagai "Tidak dicatat" tanpa mengarang', async () => {
    setupVehiclesState({
      fetchOne: vi.fn(async () => vehicleItem({
        brand: null,
        model: null,
        year: null,
        type: null,
        plate_number: null,
        odometer: null
      }))
    })

    const wrapper = await mountDetail()

    expect(wrapper.text()).toContain('Tidak dicatat')
  })

  it('VEHICLE_NOT_FOUND / 404 menampilkan state not-found jujur tanpa retry', async () => {
    setupVehiclesState({
      fetchOne: vi.fn(async () => {
        throw {
          statusCode: 404,
          data: {
            data: {
              message: 'Vehicle not found.',
              error: { code: 'VEHICLE_NOT_FOUND', message: 'Vehicle not found.' }
            }
          }
        }
      })
    })

    const wrapper = await mountDetail()
    const text = wrapper.text()

    expect(text).toContain('Kendaraan tidak ditemukan.')
    expect(text).not.toContain('Coba lagi')
    expect(wrapper.find('a[href="/vehicles"]').exists()).toBe(true)
    expect(authMock.logout).not.toHaveBeenCalled()
  })

  it('error memuat menampilkan alert + Coba lagi; retry memuat ulang lewat loading skeleton', async () => {
    const fetchOne = vi.fn()
      .mockRejectedValueOnce({ statusCode: 500, data: { message: 'Server error.' } })

    setupVehiclesState({ fetchOne })

    const wrapper = await mountDetail()

    expect(wrapper.text()).toContain('Detail belum dapat dimuat.')
    expect(wrapper.text()).toContain('Server error.')

    let release!: (value: unknown) => void

    const gate = new Promise((resolve) => {
      release = resolve as (value: unknown) => void
    })

    fetchOne.mockReturnValueOnce(gate)

    const retryButton = wrapper.findAll('button').find(button => button.text().includes('Coba lagi'))

    expect(retryButton).toBeDefined()

    await retryButton!.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[aria-label="Memuat detail kendaraan"]').exists()).toBe(true)

    release(vehicleItem())
    await flush()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Motor Beat')
    expect(fetchOne.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('owner memperoleh kontrol Ubah/Hapus', async () => {
    setupVehiclesState()

    const wrapper = await mountDetail()

    expect(actionButton(wrapper, 'Ubah')).toBeDefined()
    expect(actionButton(wrapper, 'Hapus')).toBeDefined()
  })

  it('member tidak memperoleh kontrol write (render-only, bukan pengganti authz)', async () => {
    authMock.isHouseholdOwner.value = false
    setupVehiclesState()

    const wrapper = await mountDetail()

    expect(wrapper.text()).toContain('hanya dapat dilihat')
    expect(actionButton(wrapper, 'Ubah')).toBeUndefined()
    expect(actionButton(wrapper, 'Hapus')).toBeUndefined()
  })

  it('form edit terisi data detail dan mengirim PATCH dengan plate_number dari label plat nomor', async () => {
    const state = setupVehiclesState()

    const wrapper = await mountDetail()

    await actionButton(wrapper, 'Ubah')!.trigger('click')
    await flush()

    expect(bodyText()).toContain('Ubah kendaraan')

    expect((document.body.querySelector('#vehicle-name') as HTMLInputElement).value).toBe('Motor Beat')
    expect((document.body.querySelector('#vehicle-brand') as HTMLInputElement).value).toBe('Honda')
    expect((document.body.querySelector('#vehicle-model') as HTMLInputElement).value).toBe('Beat FI')
    expect((document.body.querySelector('#vehicle-year') as HTMLInputElement).value).toBe('2019')
    expect((document.body.querySelector('#vehicle-plate') as HTMLInputElement).value).toBe('B 1234 XYZ')
    expect((document.body.querySelector('#vehicle-type') as HTMLInputElement).value).toBe('Sepeda motor')
    expect((document.body.querySelector('#vehicle-odometer') as HTMLInputElement).value).toBe('24000')

    await new DOMWrapper(document.body.querySelector('#vehicle-name') as Element).setValue('Motor baru')
    await bodyButton('Simpan').trigger('click')
    await flush()

    expect(state.update).toHaveBeenCalledWith(VEHICLE_ID, {
      name: 'Motor baru',
      brand: 'Honda',
      model: 'Beat FI',
      year: '2019',
      license_plate: 'B 1234 XYZ',
      type: 'Sepeda motor',
      odometer: '24000'
    })
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Kendaraan diubah' })
    )
    // Detail dimuat ulang setelah simpan.
    expect(state.fetchOne.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('error update tampil di modal tanpa toast sukses palsu', async () => {
    const state = setupVehiclesState()

    state.update.mockImplementation(async () => {
      state.error.value = 'Plat nomor tersebut sudah dipakai kendaraan lain di rumah tangga ini.'
      state.errorCode.value = 'VEHICLE_PLATE_ALREADY_EXISTS'

      return null
    })

    const wrapper = await mountDetail()

    await actionButton(wrapper, 'Ubah')!.trigger('click')
    await flush()

    await bodyButton('Simpan').trigger('click')
    await flush()

    expect(bodyText()).toContain('Data belum dapat disimpan.')
    expect(bodyText()).toContain('Plat nomor tersebut sudah dipakai')
    expect(toastMock.add).not.toHaveBeenCalled()
  })

  it('hapus memerlukan konfirmasi lalu menavigasi ke /vehicles setelah sukses', async () => {
    const state = setupVehiclesState()

    const wrapper = await mountDetail()

    await actionButton(wrapper, 'Hapus')!.trigger('click')
    await flush()

    expect(wrapper.text()).toContain('Hapus kendaraan ini?')
    expect(state.remove).not.toHaveBeenCalled()

    await actionButton(wrapper, 'Ya, hapus')!.trigger('click')
    await flush()

    expect(state.remove).toHaveBeenCalledWith(VEHICLE_ID)
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Kendaraan dihapus' })
    )
    expect(navigateToMock).toHaveBeenCalledWith('/vehicles')
  })

  it('hapus gagal tidak memberi toast sukses dan tidak menavigasi', async () => {
    const state = setupVehiclesState()

    state.remove.mockImplementation(async () => {
      state.error.value = 'Kendaraan belum dapat dihapus.'

      return false
    })

    const wrapper = await mountDetail()

    await actionButton(wrapper, 'Hapus')!.trigger('click')
    await flush()
    await actionButton(wrapper, 'Ya, hapus')!.trigger('click')
    await flush()

    expect(state.remove).toHaveBeenCalledWith(VEHICLE_ID)
    expect(wrapper.text()).toContain('Aksi terakhir gagal.')
    expect(wrapper.text()).toContain('Kendaraan belum dapat dihapus.')
    expect(toastMock.add).not.toHaveBeenCalled()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('409 VEHICLE_HAS_MAINTENANCE_HISTORY: pesan eksplisit, halaman & data dipertahankan, tanpa sukses palsu', async () => {
    const state = setupVehiclesState()

    state.remove.mockImplementation(async () => {
      state.error.value = 'Kendaraan tidak dapat dihapus karena masih memiliki riwayat servis.'
      state.errorCode.value = 'VEHICLE_HAS_MAINTENANCE_HISTORY'

      return false
    })

    const wrapper = await mountDetail()

    await actionButton(wrapper, 'Hapus')!.trigger('click')
    await flush()
    await actionButton(wrapper, 'Ya, hapus')!.trigger('click')
    await flush()

    expect(state.remove).toHaveBeenCalledWith(VEHICLE_ID)
    expect(wrapper.text()).toContain('Kendaraan tidak dapat dihapus.')
    expect(wrapper.text()).toContain('riwayat servis')
    // Data kendaraan tetap tampil; tidak ada navigasi atau toast sukses.
    expect(wrapper.text()).toContain('Motor Beat')
    expect(toastMock.add).not.toHaveBeenCalled()
    expect(navigateToMock).not.toHaveBeenCalled()
    // Konfirmasi ditutup kembali setelah penolakan.
    expect(wrapper.text()).toContain('Ubah')
  })
})
