import { clearNuxtState } from '#app'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VehicleFormValues, VehicleItem } from '~/types/vehicles'
import { useAuth } from '~/composables/useAuth'
import { useVehicles } from '~/composables/useVehicles'

// $fetch auto-import Nuxt berasal dari #build/fetch.mjs (bukan global),
// sehingga vi.stubGlobal tidak mempan. Mock modulnya langsung; runtime
// lain di-spread agar mountSuspended tetap utuh.
const fetchMock = vi.hoisted(() => vi.fn())

vi.mock('#build/fetch.mjs', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>

  return { ...original, $fetch: fetchMock }
})

// useState hanya valid di dalam konteks app Nuxt, jadi komposable dijalankan
// lewat harness yang di-mount suspended.
let latest: ReturnType<typeof useVehicles> | undefined
let latestAuth: ReturnType<typeof useAuth> | undefined

const VehiclesHarness = defineComponent({
  name: 'VehiclesHarness',
  setup() {
    const api = useVehicles()

    latest = api
    latestAuth = useAuth()

    return api
  },
  render: () => null
})

async function mountVehicles(): Promise<ReturnType<typeof useVehicles>> {
  await mountSuspended(VehiclesHarness, { route: false })

  return latest!
}

function vehicleItem(overrides: Partial<VehicleItem> = {}): VehicleItem {
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

function formValues(overrides: Partial<VehicleFormValues> = {}): VehicleFormValues {
  return {
    name: 'Motor Beat',
    brand: 'Honda',
    model: 'Beat FI',
    year: '2019',
    license_plate: 'B 1234 XYZ',
    type: 'Sepeda motor',
    odometer: '24000',
    ...overrides
  }
}

const STATE_KEYS = [
  'vehicles-items',
  'vehicles-pending',
  'vehicles-submitting',
  'vehicles-error',
  'vehicles-error-code',
  'vehicles-field-errors',
  'vehicles-inflight',
  'vehicles-request-seq',
  'vehicles-scope',
  'vehicles-scope-epoch'
]

beforeEach(() => {
  clearNuxtState(STATE_KEYS)
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({ success: true, data: [vehicleItem()] })
})

describe('useVehicles', () => {
  it('load() mengambil /api/vehicles dan unwrap envelope', async () => {
    const vehicles = await mountVehicles()

    await vehicles.load()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/vehicles')
    expect(vehicles.items.value).toEqual([vehicleItem()])
    expect(vehicles.pending.value).toBe(false)
    expect(vehicles.error.value).toBeNull()
  })

  it('load() ulang tanpa force memakai data segar (dedup)', async () => {
    const vehicles = await mountVehicles()

    await vehicles.load()
    await vehicles.load()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('API 401 tercatat sebagai error tanpa data dan tanpa logout', async () => {
    fetchMock.mockRejectedValueOnce({ statusCode: 401, data: { message: 'Unauthenticated.' } })

    const vehicles = await mountVehicles()

    await vehicles.load()

    expect(vehicles.items.value).toEqual([])
    expect(vehicles.error.value).toBe('Sesi berakhir. Silakan login kembali.')
    expect(vehicles.pending.value).toBe(false)
  })

  it('fetchOne() GET detail berdasarkan ID dan unwrap envelope', async () => {
    const vehicles = await mountVehicles()

    fetchMock.mockResolvedValueOnce({ success: true, data: vehicleItem({ name: 'Mobil Avanza' }) })

    const detail = await vehicles.fetchOne('01J0VEHICLE000000000000002')

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/vehicles/01J0VEHICLE000000000000002')
    expect(detail.name).toBe('Mobil Avanza')
  })

  it('create() POST kontrak dengan license_plate dipetakan ke plate_number (tanpa household_id)', async () => {
    const vehicles = await mountVehicles()

    fetchMock.mockResolvedValueOnce({ success: true, data: vehicleItem() })
    fetchMock.mockResolvedValue({ success: true, data: [vehicleItem()] })

    // household_id/license_plate sengaja diselipkan: UI tidak boleh
    // meneruskan identifier internal, dan label UI harus dipetakan.
    const saved = await vehicles.create({
      ...formValues(),
      household_id: 'h-evil',
      id: 'evil'
    } as unknown as VehicleFormValues)

    expect(saved?.name).toBe('Motor Beat')

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body: Record<string, unknown> }]

    expect(url).toBe('/api/vehicles')
    expect(options.method).toBe('POST')
    expect(options.body).toEqual({
      name: 'Motor Beat',
      brand: 'Honda',
      model: 'Beat FI',
      year: 2019,
      type: 'Sepeda motor',
      plate_number: 'B 1234 XYZ',
      odometer: 24000
    })
    expect(options.body).not.toHaveProperty('household_id')
    expect(options.body).not.toHaveProperty('license_plate')
    expect(options.body).not.toHaveProperty('id')
    // POST + refresh GET.
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('create() mengirim field opsional kosong sebagai null', async () => {
    const vehicles = await mountVehicles()

    fetchMock.mockResolvedValueOnce({ success: true, data: vehicleItem() })
    fetchMock.mockResolvedValue({ success: true, data: [vehicleItem()] })

    await vehicles.create(formValues({
      name: '  Motor  ',
      brand: '   ',
      model: '',
      year: '',
      license_plate: '',
      type: '',
      odometer: ''
    }))

    const options = fetchMock.mock.calls[0]?.[1] as { body: Record<string, unknown> }

    expect(options.body).toEqual({
      name: 'Motor',
      brand: null,
      model: null,
      year: null,
      type: null,
      plate_number: null,
      odometer: null
    })
  })

  it('create() menolak tahun/odometer tidak valid tanpa mengirim request', async () => {
    const vehicles = await mountVehicles()

    const saved = await vehicles.create(formValues({ year: '1800', odometer: '12.5' }))

    expect(saved).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(vehicles.fieldErrors.value.year).toContain('1900')
    expect(vehicles.fieldErrors.value.odometer).toContain('bilangan bulat')
  })

  it('create() 422 memetakan field error server dan tidak menambah item', async () => {
    const vehicles = await mountVehicles()

    fetchMock.mockRejectedValueOnce({
      statusCode: 422,
      data: {
        message: 'The name field is required.',
        errors: { name: ['The name field is required.'] }
      }
    })

    const saved = await vehicles.create(formValues({ name: '' }))

    expect(saved).toBeNull()
    expect(vehicles.fieldErrors.value.name).toBe('Kolom nama wajib diisi.')
    expect(vehicles.error.value).toBe('Kolom nama wajib diisi.')
    expect(vehicles.items.value).toEqual([])
  })

  it('create() VEHICLE_PLATE_ALREADY_EXISTS tampil sebagai pesan yang jelas', async () => {
    const vehicles = await mountVehicles()

    fetchMock.mockRejectedValueOnce({
      statusCode: 422,
      data: {
        data: {
          success: false,
          error: { code: 'VEHICLE_PLATE_ALREADY_EXISTS', message: 'Plate already exists.' }
        }
      }
    })

    const saved = await vehicles.create(formValues())

    expect(saved).toBeNull()
    expect(vehicles.error.value).toBe('Plat nomor tersebut sudah dipakai kendaraan lain di rumah tangga ini.')
    expect(vehicles.errorCode.value).toBe('VEHICLE_PLATE_ALREADY_EXISTS')
  })

  it('EMAIL_NOT_VERIFIED tampil sebagai pesan yang jelas', async () => {
    const vehicles = await mountVehicles()

    fetchMock.mockRejectedValueOnce({
      statusCode: 403,
      data: {
        data: {
          success: false,
          error: { code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email address before continuing.' }
        }
      }
    })

    const saved = await vehicles.create(formValues())

    expect(saved).toBeNull()
    expect(vehicles.error.value).toBe('Email Anda belum terverifikasi. Silakan verifikasi terlebih dahulu.')
  })

  it('update() PATCH ke item dengan payload kontrak lalu refresh', async () => {
    const vehicles = await mountVehicles()

    fetchMock.mockResolvedValueOnce({ success: true, data: vehicleItem({ name: 'Motor baru' }) })
    fetchMock.mockResolvedValue({ success: true, data: [vehicleItem({ name: 'Motor baru' })] })

    const saved = await vehicles.update('01J0VEHICLE000000000000001', formValues({ name: 'Motor baru' }))

    expect(saved?.name).toBe('Motor baru')

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body: Record<string, unknown> }]

    expect(url).toBe('/api/vehicles/01J0VEHICLE000000000000001')
    expect(options.method).toBe('PATCH')
    expect(options.body).toEqual({
      name: 'Motor baru',
      brand: 'Honda',
      model: 'Beat FI',
      year: 2019,
      type: 'Sepeda motor',
      plate_number: 'B 1234 XYZ',
      odometer: 24000
    })
    expect(options.body).not.toHaveProperty('household_id')
    expect(options.body).not.toHaveProperty('license_plate')
  })

  it('update() VEHICLE_ODOMETER_BELOW_RECORDED mencatat kode konflik dan mempertahankan list', async () => {
    const vehicles = await mountVehicles()

    await vehicles.load()

    fetchMock.mockReset()
    fetchMock.mockRejectedValueOnce({
      statusCode: 422,
      data: {
        data: {
          success: false,
          error: { code: 'VEHICLE_ODOMETER_BELOW_RECORDED', message: 'Odometer below recorded.' }
        }
      }
    })

    const saved = await vehicles.update('01J0VEHICLE000000000000001', formValues({ odometer: '1000' }))

    expect(saved).toBeNull()
    expect(vehicles.error.value).toBe('Odometer tidak boleh lebih rendah dari catatan servis terakhir.')
    expect(vehicles.errorCode.value).toBe('VEHICLE_ODOMETER_BELOW_RECORDED')
    expect(vehicles.items.value).toHaveLength(1)
  })

  it('remove() DELETE lalu refresh; respons gagal tidak menghapus item', async () => {
    const vehicles = await mountVehicles()

    await vehicles.load()

    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce({ success: true, data: { id: '01J0VEHICLE000000000000001' } })
    fetchMock.mockResolvedValue({ success: true, data: [] })

    const ok = await vehicles.remove('01J0VEHICLE000000000000001')

    expect(ok).toBe(true)
    expect(vehicles.items.value).toEqual([])

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string }]

    expect(url).toBe('/api/vehicles/01J0VEHICLE000000000000001')
    expect(options.method).toBe('DELETE')
  })

  it('remove() 409 VEHICLE_HAS_MAINTENANCE_HISTORY mengembalikan false dan mempertahankan data', async () => {
    const vehicles = await mountVehicles()

    await vehicles.load()

    fetchMock.mockReset()
    fetchMock.mockRejectedValueOnce({
      statusCode: 409,
      data: {
        data: {
          success: false,
          error: { code: 'VEHICLE_HAS_MAINTENANCE_HISTORY', message: 'Vehicle has maintenance history.' }
        }
      }
    })

    const ok = await vehicles.remove('01J0VEHICLE000000000000001')

    expect(ok).toBe(false)
    expect(vehicles.errorCode.value).toBe('VEHICLE_HAS_MAINTENANCE_HISTORY')
    expect(vehicles.error.value).toBe('Kendaraan tidak dapat dihapus karena masih memiliki riwayat servis.')
    expect(vehicles.items.value).toHaveLength(1)
    // Tidak ada refresh setelah penolakan (hanya DELETE yang dikirim).
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('cache dibuang saat household berganti, lalu memuat katalog household baru', async () => {
    const vehicles = await mountVehicles()

    latestAuth!.household.value = { id: 'h1', name: 'Rumah A', role: 'owner' }
    await vehicles.load()

    expect(vehicles.items.value).toHaveLength(1)

    latestAuth!.household.value = { id: 'h2', name: 'Rumah B', role: 'owner' }

    expect(vehicles.items.value).toEqual([])
    expect(vehicles.pending.value).toBe(false)

    fetchMock.mockResolvedValueOnce({
      success: true,
      data: [vehicleItem({ id: '01J0VEHICLE000000000000099', household_id: 'h2', name: 'Mobil B' })]
    })

    await vehicles.load()

    expect(vehicles.items.value.map(item => item.name)).toEqual(['Mobil B'])
  })

  it('refresh() memaksa request baru; respons lama tidak menimpa hasil terbaru', async () => {
    const vehicles = await mountVehicles()

    let releaseFirst!: (value: unknown) => void

    fetchMock.mockReturnValueOnce(new Promise((resolve) => {
      releaseFirst = resolve as (value: unknown) => void
    }))

    const firstLoad = vehicles.load()

    fetchMock.mockResolvedValueOnce({ success: true, data: [vehicleItem({ name: 'Data terbaru' })] })

    await vehicles.refresh()

    releaseFirst({ success: true, data: [vehicleItem({ name: 'Data lama' })] })
    await firstLoad

    expect(vehicles.items.value[0]?.name).toBe('Data terbaru')
    expect(vehicles.pending.value).toBe(false)
  })

  it('create() tetap menampilkan record walau refresh lanjutan gagal', async () => {
    const vehicles = await mountVehicles()
    const created = vehicleItem({ id: '01J0VEHICLE000000000000010', name: 'Motor Baru' })

    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce({ success: true, data: created })
    fetchMock.mockRejectedValueOnce({ statusCode: 500, data: { message: 'Server error.' } })

    const saved = await vehicles.create(formValues({ name: 'Motor Baru' }))

    expect(saved?.id).toBe(created.id)
    expect(vehicles.items.value.map(item => item.id)).toContain(created.id)
  })

  it('update() tetap menampilkan record terbaru walau refresh lanjutan gagal', async () => {
    const vehicles = await mountVehicles()

    await vehicles.load()

    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce({
      success: true,
      data: vehicleItem({ name: 'Motor diperbarui' })
    })
    fetchMock.mockRejectedValueOnce({ statusCode: 500, data: { message: 'Server error.' } })

    const saved = await vehicles.update(vehicleItem().id, formValues({ name: 'Motor diperbarui' }))

    expect(saved?.name).toBe('Motor diperbarui')
    expect(vehicles.items.value[0]?.name).toBe('Motor diperbarui')
  })

  it('remove() tetap membuang record walau refresh lanjutan gagal', async () => {
    const vehicles = await mountVehicles()

    await vehicles.load()

    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce({ success: true, data: { id: vehicleItem().id } })
    fetchMock.mockRejectedValueOnce({ statusCode: 500, data: { message: 'Server error.' } })

    const ok = await vehicles.remove(vehicleItem().id)

    expect(ok).toBe(true)
    expect(vehicles.items.value).toEqual([])
  })

  it('double submit dicegah saat request berjalan', async () => {
    const vehicles = await mountVehicles()

    let release!: (value: unknown) => void

    const gate = new Promise((resolve) => {
      release = resolve as (value: unknown) => void
    })

    fetchMock.mockReturnValueOnce(gate)

    const first = vehicles.create(formValues())
    const second = await vehicles.create(formValues())

    expect(second).toBeNull()

    release({ success: true, data: vehicleItem() })
    fetchMock.mockResolvedValue({ success: true, data: [vehicleItem()] })

    await first

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
