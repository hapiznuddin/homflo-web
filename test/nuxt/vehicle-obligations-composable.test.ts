import { clearNuxtState } from '#app'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  VehicleObligationFormValues,
  VehicleObligationItem
} from '~/types/vehicleObligations'
import {
  sortVehicleObligations,
  useVehicleObligations
} from '~/composables/useVehicleObligations'

// $fetch auto-import Nuxt berasal dari #build/fetch.mjs (bukan global),
// sehingga vi.stubGlobal tidak mempan. Mock modulnya langsung; runtime lain
// di-spread agar mountSuspended tetap utuh.
const fetchMock = vi.hoisted(() => vi.fn())

vi.mock('#build/fetch.mjs', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>

  return { ...original, $fetch: fetchMock }
})

let latest: ReturnType<typeof useVehicleObligations> | undefined

const ObligationsHarness = defineComponent({
  name: 'VehicleObligationsHarness',
  props: {
    vehicleId: { type: String, required: true }
  },
  setup(props) {
    const api = useVehicleObligations(() => props.vehicleId)

    latest = api

    return api
  },
  render: () => null
})

async function mountObligations(
  vehicleId = '01J0VEHICLE000000000000001'
): Promise<ReturnType<typeof useVehicleObligations>> {
  await mountSuspended(ObligationsHarness, { props: { vehicleId }, route: false })

  return latest!
}

const routeVehicleId = ref('')

const RouteObligationsHarness = defineComponent({
  name: 'RouteVehicleObligationsHarness',
  setup() {
    const api = useVehicleObligations(routeVehicleId)

    latest = api

    return api
  },
  render: () => null
})

async function mountRouteObligations(
  vehicleId: string
): Promise<ReturnType<typeof useVehicleObligations>> {
  routeVehicleId.value = vehicleId
  await mountSuspended(RouteObligationsHarness, { route: false })

  return latest!
}

const VEHICLE_ID = '01J0VEHICLE000000000000001'
const OBLIGATION_ID = '01J0OBLIGATION000000000001'
const TYPE_ID = '01J0TYPE0000000000000001'

function obligationItem(overrides: Partial<VehicleObligationItem> = {}): VehicleObligationItem {
  return {
    id: OBLIGATION_ID,
    vehicle_id: VEHICLE_ID,
    obligation_type: {
      id: TYPE_ID,
      code: 'tax',
      name: 'Pajak Kendaraan',
      is_system: true
    },
    title: 'Pajak tahunan',
    description: 'Pajak kendaraan tahunan',
    issued_date: '2026-10-01',
    due_date: '2026-11-30',
    amount: '250000.00',
    status: 'active',
    created_at: '2026-10-01T00:00:00.000000Z',
    updated_at: '2026-10-01T00:00:00.000000Z',
    ...overrides
  }
}

function formValues(overrides: Partial<VehicleObligationFormValues> = {}): VehicleObligationFormValues {
  return {
    obligation_type_id: TYPE_ID,
    title: 'Pajak tahunan',
    description: 'Pajak kendaraan tahunan',
    issued_date: '2026-10-01',
    due_date: '2026-11-30',
    amount: '250000',
    status: 'active',
    ...overrides
  }
}

const STATE_KEYS = ['vehicle-obligations-store']

beforeEach(() => {
  clearNuxtState(STATE_KEYS)
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({ success: true, data: [obligationItem()] })
})

describe('useVehicleObligations', () => {
  it('load() mengambil list per kendaraan tanpa query dan unwrap envelope', async () => {
    const obligations = await mountObligations()

    await obligations.load()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`/api/vehicles/${VEHICLE_ID}/obligations`)
    expect(obligations.items.value).toEqual([obligationItem()])
    expect(obligations.pending.value).toBe(false)
    expect(obligations.error.value).toBeNull()
  })

  it('load() ulang tanpa force memakai data segar (dedup)', async () => {
    const obligations = await mountObligations()

    await obligations.load()
    await obligations.load()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('API 401 tercatat sebagai error tanpa data dan tanpa logout', async () => {
    fetchMock.mockRejectedValueOnce({ statusCode: 401, data: { message: 'Unauthenticated.' } })

    const obligations = await mountObligations()

    await obligations.load()

    expect(obligations.items.value).toEqual([])
    expect(obligations.error.value).toBe('Sesi berakhir. Silakan login kembali.')
    expect(obligations.pending.value).toBe(false)
  })

  it('404 kendaraan asing/hilang tampil sebagai not-found tanpa logout', async () => {
    fetchMock.mockRejectedValueOnce({
      statusCode: 404,
      data: {
        data: {
          success: false,
          error: { code: 'VEHICLE_NOT_FOUND', message: 'Vehicle not found.' }
        }
      }
    })

    const obligations = await mountObligations()

    await obligations.load()

    expect(obligations.items.value).toEqual([])
    expect(obligations.errorCode.value).toBe('VEHICLE_NOT_FOUND')
    expect(obligations.error.value).toBe('Kendaraan tidak ditemukan.')
  })

  it('create() POST hanya field kontrak — tanpa status/vehicle/household/id', async () => {
    const obligations = await mountObligations()

    fetchMock.mockResolvedValueOnce({ success: true, data: obligationItem() })
    fetchMock.mockResolvedValue({ success: true, data: [obligationItem()] })

    const saved = await obligations.create({
      ...formValues(),
      vehicle_id: '01J0VEHICLE000000000000999',
      household_id: 'h-evil',
      id: 'evil'
    } as unknown as VehicleObligationFormValues)

    expect(saved?.title).toBe('Pajak tahunan')

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body: Record<string, unknown> }]

    expect(url).toBe(`/api/vehicles/${VEHICLE_ID}/obligations`)
    expect(options.method).toBe('POST')
    expect(options.body).toEqual({
      obligation_type_id: TYPE_ID,
      title: 'Pajak tahunan',
      description: 'Pajak kendaraan tahunan',
      issued_date: '2026-10-01',
      due_date: '2026-11-30',
      amount: '250000'
    })
    expect(options.body).not.toHaveProperty('status')
    expect(options.body).not.toHaveProperty('vehicle_id')
    expect(options.body).not.toHaveProperty('household_id')
    expect(options.body).not.toHaveProperty('id')
    // POST + refresh GET.
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('create() mengirim field opsional kosong sebagai null dan title di-trim', async () => {
    const obligations = await mountObligations()

    fetchMock.mockResolvedValueOnce({ success: true, data: obligationItem() })
    fetchMock.mockResolvedValue({ success: true, data: [obligationItem()] })

    await obligations.create(formValues({
      title: '  STNK 2026  ',
      description: '   ',
      issued_date: '',
      amount: ''
    }))

    const options = fetchMock.mock.calls[0]?.[1] as { body: Record<string, unknown> }

    expect(options.body).toEqual({
      obligation_type_id: TYPE_ID,
      title: 'STNK 2026',
      description: null,
      issued_date: null,
      due_date: '2026-11-30',
      amount: null
    })
  })

  it('create() menolak nominal negatif/bukan angka tanpa mengirim request', async () => {
    const obligations = await mountObligations()

    const saved = await obligations.create(formValues({ amount: '-1' }))

    expect(saved).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(obligations.fieldErrors.value.amount).toContain('angka 0 atau lebih')
  })

  it('update() PATCH ke record yang sama, menyertakan status administratif', async () => {
    const obligations = await mountObligations()

    fetchMock.mockResolvedValueOnce({ success: true, data: obligationItem({ status: 'inactive' }) })
    fetchMock.mockResolvedValue({ success: true, data: [obligationItem({ status: 'inactive' })] })

    const saved = await obligations.update(OBLIGATION_ID, formValues({
      status: 'inactive',
      title: 'Pajak tahunan diperbarui'
    }))

    expect(saved?.status).toBe('inactive')

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body: Record<string, unknown> }]

    expect(url).toBe(`/api/vehicles/${VEHICLE_ID}/obligations/${OBLIGATION_ID}`)
    expect(options.method).toBe('PATCH')
    expect(options.body).toEqual({
      obligation_type_id: TYPE_ID,
      title: 'Pajak tahunan diperbarui',
      description: 'Pajak kendaraan tahunan',
      issued_date: '2026-10-01',
      due_date: '2026-11-30',
      amount: '250000',
      status: 'inactive'
    })
    expect(options.body).not.toHaveProperty('vehicle_id')
    expect(options.body).not.toHaveProperty('household_id')
  })

  it('update() tidak mengubah status hanya karena due date sudah lewat', async () => {
    const obligations = await mountObligations()

    fetchMock.mockResolvedValueOnce({
      success: true,
      data: obligationItem({ due_date: '2020-01-01', status: 'active' })
    })
    fetchMock.mockResolvedValue({
      success: true,
      data: [obligationItem({ due_date: '2020-01-01', status: 'active' })]
    })

    await obligations.update(OBLIGATION_ID, formValues({ due_date: '2020-01-01', status: 'active' }))

    const options = fetchMock.mock.calls[0]?.[1] as { body: Record<string, unknown> }

    expect(options.body.status).toBe('active')
    expect(options.body.due_date).toBe('2020-01-01')
  })

  it('create() 422 memetakan field error server dan tidak menambah item', async () => {
    const obligations = await mountObligations()

    fetchMock.mockRejectedValueOnce({
      statusCode: 422,
      data: {
        message: 'The due date field is required.',
        errors: { due_date: ['The due date field is required.'] }
      }
    })

    const saved = await obligations.create(formValues({ due_date: '' }))

    expect(saved).toBeNull()
    expect(obligations.fieldErrors.value.due_date).toBe('Kolom tanggal jatuh tempo wajib diisi.')
    expect(obligations.error.value).toBe('Kolom tanggal jatuh tempo wajib diisi.')
    expect(obligations.items.value).toEqual([])
  })

  it('create() 422 OBLIGATION_TYPE_NOT_FOUND tampil jelas', async () => {
    const obligations = await mountObligations()

    fetchMock.mockRejectedValueOnce({
      statusCode: 422,
      data: {
        data: {
          success: false,
          error: { code: 'OBLIGATION_TYPE_NOT_FOUND', message: 'Obligation type not found.' }
        }
      }
    })

    const saved = await obligations.create(formValues())

    expect(saved).toBeNull()
    expect(obligations.errorCode.value).toBe('OBLIGATION_TYPE_NOT_FOUND')
    expect(obligations.error.value).toBe('Jenis kewajiban tidak ditemukan.')
  })

  it('remove() DELETE satu record lalu refresh; record hilang setelah konfirmasi server', async () => {
    const obligations = await mountObligations()

    await obligations.load()

    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce({ success: true, data: { id: OBLIGATION_ID } })
    fetchMock.mockResolvedValue({ success: true, data: [] })

    const ok = await obligations.remove(OBLIGATION_ID)

    expect(ok).toBe(true)
    expect(obligations.items.value).toEqual([])

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string }]

    expect(url).toBe(`/api/vehicles/${VEHICLE_ID}/obligations/${OBLIGATION_ID}`)
    expect(options.method).toBe('DELETE')
  })

  it('remove() gagal mempertahankan record dan menampilkan error', async () => {
    const obligations = await mountObligations()

    await obligations.load()

    fetchMock.mockReset()
    fetchMock.mockRejectedValueOnce({
      statusCode: 404,
      data: {
        data: {
          success: false,
          error: { code: 'VEHICLE_OBLIGATION_NOT_FOUND', message: 'Vehicle obligation not found.' }
        }
      }
    })

    const ok = await obligations.remove(OBLIGATION_ID)

    expect(ok).toBe(false)
    expect(obligations.items.value).toHaveLength(1)
    expect(obligations.errorCode.value).toBe('VEHICLE_OBLIGATION_NOT_FOUND')
    expect(obligations.error.value).toBe('Kewajiban kendaraan tidak ditemukan.')
  })

  it('double submit dicegah saat request berjalan', async () => {
    const obligations = await mountObligations()

    let release!: (value: unknown) => void

    const gate = new Promise((resolve) => {
      release = resolve as (value: unknown) => void
    })

    fetchMock.mockReturnValueOnce(gate)

    const first = obligations.create(formValues())
    const second = await obligations.create(formValues())

    expect(second).toBeNull()

    release({ success: true, data: obligationItem() })
    fetchMock.mockResolvedValue({ success: true, data: [obligationItem()] })

    await first

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('state per vehicle ID tidak mencampur data antar kendaraan', async () => {
    const first = await mountObligations('01J0VEHICLE000000000000001')

    await first.load()

    expect(first.items.value[0]?.title).toBe('Pajak tahunan')

    const second = await mountObligations('01J0VEHICLE000000000000002')

    expect(second.items.value).toEqual([])

    fetchMock.mockResolvedValueOnce({
      success: true,
      data: [
        obligationItem({
          id: 'other',
          vehicle_id: '01J0VEHICLE000000000000002',
          title: 'Kewajiban kendaraan B'
        })
      ]
    })

    await second.load()

    expect(second.items.value[0]?.title).toBe('Kewajiban kendaraan B')
    expect(first.items.value[0]?.title).toBe('Pajak tahunan')
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      '/api/vehicles/01J0VEHICLE000000000000002/obligations'
    )
  })

  it('respons lama tidak menimpa kendaraan yang baru dibuka', async () => {
    const first = await mountObligations('01J0VEHICLE000000000000001')

    let releaseFirst!: (value: unknown) => void

    fetchMock.mockReturnValueOnce(new Promise((resolve) => {
      releaseFirst = resolve as (value: unknown) => void
    }))

    const firstLoad = first.load()

    const second = await mountObligations('01J0VEHICLE000000000000002')

    fetchMock.mockResolvedValueOnce({
      success: true,
      data: [obligationItem({ vehicle_id: '01J0VEHICLE000000000000002', title: 'Kendaraan B' })]
    })
    await second.load()

    releaseFirst({ success: true, data: [obligationItem({ title: 'Kendaraan A' })] })
    await firstLoad

    expect(second.items.value[0]?.title).toBe('Kendaraan B')
    expect(first.items.value[0]?.title).toBe('Kendaraan A')
  })

  it('create() kendaraan A tidak meng-upsert ke state kendaraan B setelah route berubah', async () => {
    const firstId = '01J0VEHICLE000000000000001'
    const secondId = '01J0VEHICLE000000000000002'
    const obligations = await mountRouteObligations(firstId)

    await obligations.load()

    let releaseCreate!: (value: unknown) => void

    fetchMock.mockReset()
    fetchMock.mockReturnValueOnce(new Promise((resolve) => {
      releaseCreate = resolve as (value: unknown) => void
    }))
    fetchMock.mockResolvedValueOnce({
      success: true,
      data: [obligationItem({ id: 'B-1', vehicle_id: secondId, title: 'Kewajiban B' })]
    })
    fetchMock.mockRejectedValue({ statusCode: 500, data: { message: 'Server error.' } })

    const creating = obligations.create(formValues({ title: 'Kewajiban A baru' }))

    routeVehicleId.value = secondId
    await obligations.load()

    expect(obligations.items.value.map(item => item.id)).toEqual(['B-1'])

    releaseCreate({
      success: true,
      data: obligationItem({
        id: 'A-NEW',
        vehicle_id: firstId,
        title: 'Kewajiban A baru'
      })
    })
    await creating

    // State kendaraan B tidak boleh menerima record milik kendaraan A.
    expect(obligations.items.value.map(item => item.id)).toEqual(['B-1'])

    routeVehicleId.value = firstId

    expect(obligations.items.value.map(item => item.id)).toContain('A-NEW')
  })

  it('refresh() memaksa request baru; respons lama tidak menimpa hasil terbaru', async () => {
    const obligations = await mountObligations()

    let releaseFirst!: (value: unknown) => void

    fetchMock.mockReturnValueOnce(new Promise((resolve) => {
      releaseFirst = resolve as (value: unknown) => void
    }))

    const firstLoad = obligations.load()

    fetchMock.mockResolvedValueOnce({
      success: true,
      data: [obligationItem({ title: 'Data terbaru' })]
    })

    const secondLoad = obligations.refresh()
    await secondLoad

    releaseFirst({ success: true, data: [obligationItem({ title: 'Data lama' })] })
    await firstLoad

    expect(obligations.items.value[0]?.title).toBe('Data terbaru')
    expect(obligations.pending.value).toBe(false)
  })
})

describe('sortVehicleObligations', () => {
  it('mengurutkan due_date lalu id seperti backend', () => {
    const items = [
      obligationItem({ id: 'b', due_date: '2026-12-01' }),
      obligationItem({ id: 'c', due_date: '2026-11-01' }),
      obligationItem({ id: 'a', due_date: '2026-12-01' })
    ]

    expect(sortVehicleObligations(items).map(item => item.id)).toEqual(['c', 'a', 'b'])
  })
})
