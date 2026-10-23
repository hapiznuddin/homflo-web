import { clearNuxtState } from '#app'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import type { VehicleMaintenanceItem } from '~/types/vehicleMaintenance'
import type { VehicleObligationItem } from '~/types/vehicleObligations'
import type { VehicleItem } from '~/types/vehicles'
import { useVehicleOverview } from '~/composables/useVehicleOverview'

const fetchMock = vi.hoisted(() => vi.fn())

vi.mock('#build/fetch.mjs', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>

  return { ...original, $fetch: fetchMock }
})

const vehicleList = ref<VehicleItem[]>([])
let latest: ReturnType<typeof useVehicleOverview> | undefined

const OverviewHarness = defineComponent({
  name: 'OverviewHarness',
  setup() {
    latest = useVehicleOverview(vehicleList)

    return () => null
  }
})

async function mountOverview(): Promise<ReturnType<typeof useVehicleOverview>> {
  await mountSuspended(OverviewHarness, { route: false })

  return latest!
}

function vehicle(id: string, name = `Kendaraan ${id}`): VehicleItem {
  return {
    id,
    household_id: 'h1',
    name,
    brand: null,
    model: null,
    year: null,
    type: null,
    plate_number: null,
    odometer: null,
    created_at: '2026-01-01T00:00:00.000000Z',
    updated_at: '2026-01-01T00:00:00.000000Z'
  }
}

function maintenance(
  id: string,
  vehicleId: string,
  overrides: Partial<VehicleMaintenanceItem> = {}
): VehicleMaintenanceItem {
  return {
    id,
    vehicle_id: vehicleId,
    title: `Servis ${id}`,
    description: null,
    scheduled_date: '2026-06-01',
    completed_at: null,
    odometer: null,
    status: 'scheduled',
    created_at: '2026-01-01T00:00:00.000000Z',
    updated_at: '2026-01-01T00:00:00.000000Z',
    ...overrides
  }
}

function obligation(
  id: string,
  vehicleId: string,
  overrides: Partial<VehicleObligationItem> = {}
): VehicleObligationItem {
  return {
    id,
    vehicle_id: vehicleId,
    obligation_type: {
      id: 'type-1',
      code: 'tax',
      name: 'Pajak Kendaraan',
      is_system: true
    },
    title: `Kewajiban ${id}`,
    description: null,
    issued_date: null,
    due_date: '2026-06-01',
    amount: null,
    status: 'active',
    created_at: '2026-01-01T00:00:00.000000Z',
    updated_at: '2026-01-01T00:00:00.000000Z',
    ...overrides
  }
}

function envelope<T>(data: T[]): { success: true, data: T[] } {
  return { success: true, data }
}

const STATE_KEYS = [
  'vehicle-overview-services',
  'vehicle-overview-obligations'
]

beforeEach(() => {
  clearNuxtState(STATE_KEYS)
  vehicleList.value = []
  latest = undefined
  fetchMock.mockReset()
})

describe('useVehicleOverview', () => {
  it('memuat kedua resource per kendaraan, memfilter status backend, dan mengurutkan tanggal', async () => {
    vehicleList.value = [vehicle('v1', 'Motor Beat'), vehicle('v2', 'Mobil Avanza')]
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/vehicles/v1/maintenance') {
        return envelope([
          maintenance('m2', 'v1', { scheduled_date: '2026-08-01' }),
          maintenance('m3', 'v1', { status: 'completed', completed_at: '2026-02-01' })
        ])
      }

      if (url === '/api/vehicles/v2/maintenance') {
        return envelope([maintenance('m1', 'v2', { scheduled_date: '2026-04-01' })])
      }

      if (url === '/api/vehicles/v1/obligations') {
        return envelope([
          obligation('o2', 'v1', { due_date: '2026-09-01' }),
          obligation('o3', 'v1', { status: 'inactive', due_date: '2020-01-01' })
        ])
      }

      if (url === '/api/vehicles/v2/obligations') {
        return envelope([obligation('o1', 'v2', { due_date: '2026-03-01' })])
      }

      throw new Error(`URL tak terduga: ${url}`)
    })

    const overview = await mountOverview()

    await overview.refresh()

    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(overview.serviceSchedules.value.map(item => item.maintenance.id)).toEqual(['m1', 'm2'])
    expect(overview.activeObligations.value.map(item => item.obligation.id)).toEqual(['o1', 'o2'])
    expect(overview.servicesError.value).toBeNull()
    expect(overview.obligationsError.value).toBeNull()
    expect(overview.serviceSchedules.value[0]?.vehicle.name).toBe('Mobil Avanza')
  })

  it('memakai data segar tanpa request ulang saat load() dipanggil lagi', async () => {
    vehicleList.value = [vehicle('v1')]
    fetchMock.mockImplementation(async () => envelope([]))

    const overview = await mountOverview()

    await overview.load()
    await overview.load()

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('memindai maksimal 20 kendaraan dan menandai ringkasan terpotong', async () => {
    vehicleList.value = Array.from({ length: 25 }, (_, index) => vehicle(`v${index}`))
    fetchMock.mockImplementation(async () => envelope([]))

    const overview = await mountOverview()

    await overview.load()

    const maintenanceCalls = fetchMock.mock.calls
      .map(call => call[0] as string)
      .filter(url => url.endsWith('/maintenance'))
    const obligationCalls = fetchMock.mock.calls
      .map(call => call[0] as string)
      .filter(url => url.endsWith('/obligations'))

    expect(maintenanceCalls).toHaveLength(20)
    expect(obligationCalls).toHaveLength(20)
    expect(maintenanceCalls).not.toContain('/api/vehicles/v20/maintenance')
    expect(overview.scannedVehicleCount.value).toBe(20)
    expect(overview.vehicleCount.value).toBe(25)
    expect(overview.overviewTruncated.value).toBe(true)
  })

  it('mengisolasi kegagalan servis dari kewajiban dan mempertahankan data yang berhasil', async () => {
    vehicleList.value = [vehicle('v1', 'Motor Beat'), vehicle('v2', 'Mobil Avanza')]
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/vehicles/v1/maintenance') {
        throw {
          statusCode: 404,
          data: {
            data: {
              success: false,
              error: { code: 'VEHICLE_NOT_FOUND', message: 'Vehicle not found.' }
            }
          }
        }
      }

      if (url.endsWith('/maintenance')) {
        return envelope([maintenance('m2', 'v2', { scheduled_date: '2026-07-01' })])
      }

      return envelope([obligation(`o-${url.includes('v1') ? '1' : '2'}`, url.includes('v1') ? 'v1' : 'v2')])
    })

    const overview = await mountOverview()

    await overview.load()

    expect(overview.serviceSchedules.value.map(item => item.maintenance.id)).toEqual(['m2'])
    expect(overview.servicesError.value).toBe('Kendaraan tidak ditemukan.')
    expect(overview.servicesFailedVehicleIds.value).toEqual(['v1'])
    expect(overview.activeObligations.value).toHaveLength(2)
    expect(overview.obligationsError.value).toBeNull()
    expect(overview.obligationsFailedVehicleIds.value).toEqual([])
  })

  it('retry hanya memuat ulang kendaraan yang gagal pada section terkait', async () => {
    vehicleList.value = [vehicle('v1'), vehicle('v2')]
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/vehicles/v1/maintenance') {
        throw new Error('gagal sementara')
      }

      if (url.endsWith('/maintenance')) {
        return envelope([maintenance('m2', 'v2')])
      }

      return envelope([])
    })

    const overview = await mountOverview()

    await overview.load()
    fetchMock.mockClear()
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/vehicles/v1/maintenance') {
        return envelope([maintenance('m1', 'v1', { scheduled_date: '2026-04-01' })])
      }

      return envelope([])
    })

    await overview.retryServices()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/vehicles/v1/maintenance')
    expect(overview.serviceSchedules.value.map(item => item.maintenance.id)).toEqual(['m1', 'm2'])
    expect(overview.servicesError.value).toBeNull()
    expect(overview.servicesFailedVehicleIds.value).toEqual([])
  })

  it('respons lama tidak menimpa hasil refresh yang lebih baru', async () => {
    vehicleList.value = [vehicle('v1')]
    let resolveOld!: (value: { success: true, data: VehicleMaintenanceItem[] }) => void
    let maintenanceCalls = 0

    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/vehicles/v1/maintenance') {
        maintenanceCalls += 1

        if (maintenanceCalls === 1) {
          return new Promise((resolve) => {
            resolveOld = resolve
          })
        }

        return Promise.resolve(envelope([
          maintenance('new', 'v1', { title: 'Servis baru' })
        ]))
      }

      return Promise.resolve(envelope([]))
    })

    const overview = await mountOverview()
    const first = overview.load()

    await new Promise(resolve => setTimeout(resolve, 0))

    await overview.refresh()

    resolveOld(envelope([maintenance('old', 'v1', { title: 'Servis lama' })]))
    await first

    expect(overview.serviceSchedules.value.map(item => item.maintenance.title)).toEqual(['Servis baru'])
    expect(overview.servicesPending.value).toBe(false)
  })

  it('daftar kendaraan kosong tidak memicu request dan langsung selesai', async () => {
    const overview = await mountOverview()

    await overview.load()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(overview.servicesStarted.value).toBe(true)
    expect(overview.obligationsStarted.value).toBe(true)
    expect(overview.serviceSchedules.value).toEqual([])
    expect(overview.activeObligations.value).toEqual([])
    expect(overview.servicesError.value).toBeNull()
    expect(overview.obligationsError.value).toBeNull()
  })
})
