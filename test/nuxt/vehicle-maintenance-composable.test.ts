import { clearNuxtState } from '#app'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VehicleMaintenanceFormValues, VehicleMaintenanceItem } from '~/types/vehicleMaintenance'
import { useVehicleMaintenance } from '~/composables/useVehicleMaintenance'

// $fetch auto-import Nuxt berasal dari #build/fetch.mjs (bukan global),
// sehingga vi.stubGlobal tidak mempan. Mock modulnya langsung; runtime lain
// di-spread agar mountSuspended tetap utuh.
const fetchMock = vi.hoisted(() => vi.fn())

vi.mock('#build/fetch.mjs', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>

  return { ...original, $fetch: fetchMock }
})

// useState hanya valid di dalam konteks app Nuxt, jadi komposable dijalankan
// lewat harness yang di-mount suspended.
let latest: ReturnType<typeof useVehicleMaintenance> | undefined

const VehicleMaintenanceHarness = defineComponent({
  name: 'VehicleMaintenanceHarness',
  props: {
    vehicleId: { type: String, required: true }
  },
  setup(props) {
    const api = useVehicleMaintenance(() => props.vehicleId)

    latest = api

    return api
  },
  render: () => null
})

async function mountMaintenance(
  vehicleId = '01J0VEHICLE000000000000001'
): Promise<ReturnType<typeof useVehicleMaintenance>> {
  await mountSuspended(VehicleMaintenanceHarness, { props: { vehicleId }, route: false })

  return latest!
}

const VEHICLE_ID = '01J0VEHICLE000000000000001'
const MAINTENANCE_ID = '01J0MAINT0000000000000001'

function maintenanceItem(overrides: Partial<VehicleMaintenanceItem> = {}): VehicleMaintenanceItem {
  return {
    id: MAINTENANCE_ID,
    vehicle_id: VEHICLE_ID,
    title: 'Servis rutin 50.000 km',
    description: 'Ganti oli dan filter',
    scheduled_date: '2026-12-01',
    completed_at: null,
    odometer: 50000,
    status: 'scheduled',
    created_at: '2026-10-01T00:00:00.000000Z',
    updated_at: '2026-10-01T00:00:00.000000Z',
    ...overrides
  }
}

function formValues(overrides: Partial<VehicleMaintenanceFormValues> = {}): VehicleMaintenanceFormValues {
  return {
    title: 'Servis rutin 50.000 km',
    description: 'Ganti oli dan filter',
    scheduled_date: '2026-12-01',
    odometer: '50000',
    ...overrides
  }
}

const STATE_KEYS = ['vehicle-maintenance-store']

beforeEach(() => {
  clearNuxtState(STATE_KEYS)
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({ success: true, data: [maintenanceItem()] })
})

describe('useVehicleMaintenance', () => {
  it('load() mengambil list per kendaraan tanpa query dan unwrap envelope', async () => {
    const maintenance = await mountMaintenance()

    await maintenance.load()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`/api/vehicles/${VEHICLE_ID}/maintenance`)
    expect(maintenance.items.value).toEqual([maintenanceItem()])
    expect(maintenance.pending.value).toBe(false)
    expect(maintenance.error.value).toBeNull()
  })

  it('load() ulang tanpa force memakai data segar (dedup)', async () => {
    const maintenance = await mountMaintenance()

    await maintenance.load()
    await maintenance.load()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('API 401 tercatat sebagai error tanpa data dan tanpa logout', async () => {
    fetchMock.mockRejectedValueOnce({ statusCode: 401, data: { message: 'Unauthenticated.' } })

    const maintenance = await mountMaintenance()

    await maintenance.load()

    expect(maintenance.items.value).toEqual([])
    expect(maintenance.error.value).toBe('Sesi berakhir. Silakan login kembali.')
    expect(maintenance.pending.value).toBe(false)
  })

  it('fetchOne() GET detail dengan vehicle ID + maintenance ID yang benar', async () => {
    const maintenance = await mountMaintenance()

    fetchMock.mockResolvedValueOnce({ success: true, data: maintenanceItem({ title: 'Ganti ban' }) })

    const detail = await maintenance.fetchOne(MAINTENANCE_ID)

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `/api/vehicles/${VEHICLE_ID}/maintenance/${MAINTENANCE_ID}`
    )
    expect(detail.title).toBe('Ganti ban')
  })

  it('create() POST hanya field kontrak — tanpa vehicle_id/status/completed_at', async () => {
    const maintenance = await mountMaintenance()

    fetchMock.mockResolvedValueOnce({ success: true, data: maintenanceItem() })
    fetchMock.mockResolvedValue({ success: true, data: [maintenanceItem()] })

    // Field terlarang sengaja diselipkan: UI tidak boleh meneruskannya.
    const saved = await maintenance.create({
      ...formValues(),
      vehicle_id: '01J0VEHICLE000000000000999',
      household_id: 'h-evil',
      status: 'completed',
      completed_at: '2020-01-01',
      id: 'evil'
    } as unknown as VehicleMaintenanceFormValues)

    expect(saved?.title).toBe('Servis rutin 50.000 km')

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body: Record<string, unknown> }]

    expect(url).toBe(`/api/vehicles/${VEHICLE_ID}/maintenance`)
    expect(options.method).toBe('POST')
    expect(options.body).toEqual({
      title: 'Servis rutin 50.000 km',
      description: 'Ganti oli dan filter',
      scheduled_date: '2026-12-01',
      odometer: 50000
    })
    expect(options.body).not.toHaveProperty('vehicle_id')
    expect(options.body).not.toHaveProperty('household_id')
    expect(options.body).not.toHaveProperty('status')
    expect(options.body).not.toHaveProperty('completed_at')
    expect(options.body).not.toHaveProperty('id')
    // POST + refresh GET.
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('create() mengirim description/odometer kosong sebagai null', async () => {
    const maintenance = await mountMaintenance()

    fetchMock.mockResolvedValueOnce({ success: true, data: maintenanceItem() })
    fetchMock.mockResolvedValue({ success: true, data: [maintenanceItem()] })

    await maintenance.create(formValues({ title: '  Cek rem  ', description: '   ', odometer: '' }))

    const options = fetchMock.mock.calls[0]?.[1] as { body: Record<string, unknown> }

    expect(options.body).toEqual({
      title: 'Cek rem',
      description: null,
      scheduled_date: '2026-12-01',
      odometer: null
    })
  })

  it('create() menolak odometer negatif/bukan bilangan bulat tanpa mengirim request', async () => {
    const maintenance = await mountMaintenance()

    const saved = await maintenance.create(formValues({ odometer: '-1' }))

    expect(saved).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(maintenance.fieldErrors.value.odometer).toContain('bilangan bulat 0 atau lebih')
  })

  it('create() 422 memetakan field error server dan tidak menambah item', async () => {
    const maintenance = await mountMaintenance()

    fetchMock.mockRejectedValueOnce({
      statusCode: 422,
      data: {
        message: 'The title field is required.',
        errors: { title: ['The title field is required.'] }
      }
    })

    const saved = await maintenance.create(formValues({ title: '' }))

    expect(saved).toBeNull()
    expect(maintenance.fieldErrors.value.title).toBe('Kolom judul wajib diisi.')
    expect(maintenance.error.value).toBe('Kolom judul wajib diisi.')
    expect(maintenance.items.value).toEqual([])
  })

  it('EMAIL_NOT_VERIFIED tampil sebagai pesan yang jelas', async () => {
    const maintenance = await mountMaintenance()

    fetchMock.mockRejectedValueOnce({
      statusCode: 403,
      data: {
        data: {
          success: false,
          error: { code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email address before continuing.' }
        }
      }
    })

    const saved = await maintenance.create(formValues())

    expect(saved).toBeNull()
    expect(maintenance.error.value).toBe('Email Anda belum terverifikasi. Silakan verifikasi terlebih dahulu.')
    expect(maintenance.errorCode.value).toBe('EMAIL_NOT_VERIFIED')
  })

  it('update() PATCH ke catatan pada kendaraan yang benar lalu refresh', async () => {
    const maintenance = await mountMaintenance()

    fetchMock.mockResolvedValueOnce({ success: true, data: maintenanceItem({ title: 'Servis baru' }) })
    fetchMock.mockResolvedValue({ success: true, data: [maintenanceItem({ title: 'Servis baru' })] })

    const saved = await maintenance.update(MAINTENANCE_ID, formValues({ title: 'Servis baru' }))

    expect(saved?.title).toBe('Servis baru')

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body: Record<string, unknown> }]

    expect(url).toBe(`/api/vehicles/${VEHICLE_ID}/maintenance/${MAINTENANCE_ID}`)
    expect(options.method).toBe('PATCH')
    expect(options.body).toEqual({
      title: 'Servis baru',
      description: 'Ganti oli dan filter',
      scheduled_date: '2026-12-01',
      odometer: 50000
    })
    expect(options.body).not.toHaveProperty('vehicle_id')
    expect(options.body).not.toHaveProperty('completed_at')
  })

  it('remove() DELETE satu catatan lalu refresh', async () => {
    const maintenance = await mountMaintenance()

    await maintenance.load()

    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce({ success: true, data: { id: MAINTENANCE_ID } })
    fetchMock.mockResolvedValue({ success: true, data: [] })

    const ok = await maintenance.remove(MAINTENANCE_ID)

    expect(ok).toBe(true)
    expect(maintenance.items.value).toEqual([])

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string }]

    expect(url).toBe(`/api/vehicles/${VEHICLE_ID}/maintenance/${MAINTENANCE_ID}`)
    expect(options.method).toBe('DELETE')
  })

  it('complete() POST tanpa body ke endpoint Complete lalu refresh', async () => {
    const maintenance = await mountMaintenance()

    await maintenance.load()

    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce({
      success: true,
      data: maintenanceItem({ status: 'completed', completed_at: '2026-10-23' })
    })
    fetchMock.mockResolvedValue({
      success: true,
      data: [maintenanceItem({ status: 'completed', completed_at: '2026-10-23' })]
    })

    const completed = await maintenance.complete(MAINTENANCE_ID)

    expect(completed?.status).toBe('completed')

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body?: unknown }]

    expect(url).toBe(`/api/vehicles/${VEHICLE_ID}/maintenance/${MAINTENANCE_ID}/complete`)
    expect(options.method).toBe('POST')
    expect(options.body).toBeUndefined()
    // POST + refresh GET.
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('complete() 422 ALREADY_COMPLETED tidak menghasilkan sukses dan mempertahankan data', async () => {
    const maintenance = await mountMaintenance()

    await maintenance.load()

    fetchMock.mockReset()
    fetchMock.mockRejectedValueOnce({
      statusCode: 422,
      data: {
        data: {
          success: false,
          error: {
            code: 'VEHICLE_MAINTENANCE_ALREADY_COMPLETED',
            message: 'Vehicle maintenance already completed.'
          }
        }
      }
    })

    const completed = await maintenance.complete(MAINTENANCE_ID)

    expect(completed).toBeNull()
    expect(maintenance.errorCode.value).toBe('VEHICLE_MAINTENANCE_ALREADY_COMPLETED')
    expect(maintenance.error.value).toBe('Servis kendaraan ini sudah ditandai selesai.')
    expect(maintenance.items.value).toHaveLength(1)

    // Tidak ada refresh setelah penolakan (hanya POST yang dikirim).
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('complete() 404 VEHICLE_MAINTENANCE_NOT_FOUND tampil jelas', async () => {
    const maintenance = await mountMaintenance()

    fetchMock.mockRejectedValueOnce({
      statusCode: 404,
      data: {
        data: {
          success: false,
          error: { code: 'VEHICLE_MAINTENANCE_NOT_FOUND', message: 'Vehicle maintenance not found.' }
        }
      }
    })

    const completed = await maintenance.complete(MAINTENANCE_ID)

    expect(completed).toBeNull()
    expect(maintenance.errorCode.value).toBe('VEHICLE_MAINTENANCE_NOT_FOUND')
    expect(maintenance.error.value).toBe('Catatan servis kendaraan tidak ditemukan.')
  })

  it('complete() menerapkan status dari respons server walau refresh daftar gagal', async () => {
    const maintenance = await mountMaintenance()

    await maintenance.load()

    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce({
      success: true,
      data: maintenanceItem({ status: 'completed', completed_at: '2026-10-23' })
    })
    fetchMock.mockRejectedValueOnce({ statusCode: 500, data: { message: 'Server error.' } })

    const completed = await maintenance.complete(MAINTENANCE_ID)

    expect(completed?.status).toBe('completed')
    expect(maintenance.items.value[0]?.status).toBe('completed')
    expect(maintenance.items.value[0]?.completed_at).toBe('2026-10-23')
  })

  it('remove() menghapus record dari daftar segera setelah server sukses', async () => {
    const maintenance = await mountMaintenance()

    fetchMock.mockResolvedValueOnce({
      success: true,
      data: [maintenanceItem(), maintenanceItem({ id: '01J0MAINT0000000000000002', title: 'Cek rem' })]
    })
    await maintenance.load()

    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce({ success: true, data: { id: MAINTENANCE_ID } })
    fetchMock.mockRejectedValueOnce({ statusCode: 500, data: { message: 'Server error.' } })

    const ok = await maintenance.remove(MAINTENANCE_ID)

    expect(ok).toBe(true)
    expect(maintenance.items.value.map(item => item.id)).toEqual(['01J0MAINT0000000000000002'])
  })

  it('double submit dicegah saat request berjalan', async () => {
    const maintenance = await mountMaintenance()

    let release!: (value: unknown) => void

    const gate = new Promise((resolve) => {
      release = resolve as (value: unknown) => void
    })

    fetchMock.mockReturnValueOnce(gate)

    const first = maintenance.create(formValues())
    const second = await maintenance.create(formValues())

    expect(second).toBeNull()

    release({ success: true, data: maintenanceItem() })
    fetchMock.mockResolvedValue({ success: true, data: [maintenanceItem()] })

    await first

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('state per vehicle ID tidak mencampur data antar kendaraan', async () => {
    const first = await mountMaintenance('01J0VEHICLE000000000000001')

    await first.load()

    expect(first.items.value[0]?.title).toBe('Servis rutin 50.000 km')

    const second = await mountMaintenance('01J0VEHICLE000000000000002')

    expect(second.items.value).toEqual([])

    fetchMock.mockResolvedValueOnce({
      success: true,
      data: [maintenanceItem({ id: 'other', vehicle_id: '01J0VEHICLE000000000000002', title: 'Servis kendaraan B' })]
    })

    await second.load()

    expect(second.items.value[0]?.title).toBe('Servis kendaraan B')
    // Data kendaraan pertama tetap utuh di state-nya sendiri.
    expect(first.items.value[0]?.title).toBe('Servis rutin 50.000 km')
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      '/api/vehicles/01J0VEHICLE000000000000002/maintenance'
    )
  })
})
