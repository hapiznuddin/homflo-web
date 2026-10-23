import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive, ref, type Ref } from 'vue'
import type { VehicleItem } from '~/types/vehicles'
import DetailPage from '~/pages/vehicles/[id].vue'

// Regresi perpindahan route tanpa remount: respons detail kendaraan lama tidak
// boleh menimpa kendaraan yang baru dibuka, dan panel edit harus ditutup.

const VEHICLE_ID = '01J0VEHICLE000000000000001'
const OTHER_ID = '01J0VEHICLE000000000000002'
const THIRD_ID = '01J0VEHICLE000000000000003'

const routeMock = vi.hoisted(() => ({
  current: { params: { id: '' } } as { params: { id: string } }
}))

mockNuxtImport('useRoute', () => () => routeMock.current)

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

const vehicleMaintenanceMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useVehicleMaintenance', () => () => vehicleMaintenanceMock.api)

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

function setupVehiclesState(fetchOne: ReturnType<typeof vi.fn>): MockVehiclesApi {
  vehicleMaintenanceMock.api = {
    items: ref([]),
    pending: ref(false),
    submitting: ref(false),
    error: ref(null),
    errorCode: ref(null),
    fieldErrors: ref({}),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {}),
    fetchOne: vi.fn(),
    create: vi.fn(async () => null),
    update: vi.fn(async () => null),
    remove: vi.fn(async () => false),
    complete: vi.fn(async () => null),
    clearError: vi.fn()
  }

  const api: MockVehiclesApi = {
    items: ref([vehicleItem()]),
    pending: ref(false),
    submitting: ref(false),
    error: ref(null),
    errorCode: ref(null),
    fieldErrors: ref({}),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {}),
    fetchOne,
    create: vi.fn(async () => vehicleItem()),
    update: vi.fn(async () => vehicleItem()),
    remove: vi.fn(async () => true),
    clearError: vi.fn()
  }

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

  vehiclesMock.api = api

  return api
}

async function flush(): Promise<void> {
  for (let index = 0; index < 5; index++) {
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

function bodyText(): string {
  return document.body.textContent ?? ''
}

beforeEach(() => {
  routeMock.current = reactive({ params: { id: VEHICLE_ID } })
  authMock.isHouseholdOwner.value = true
  toastMock.add.mockClear()
  navigateToMock.mockClear()
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('vehicle detail route race', () => {
  it('respons kendaraan lama tidak menimpa kendaraan terbaru setelah route berubah', async () => {
    let releaseOther!: (value: unknown) => void

    const fetchOne = vi.fn()
      .mockImplementationOnce(async () => vehicleItem())
      .mockImplementationOnce(() => new Promise((resolve) => {
        releaseOther = resolve as (value: unknown) => void
      }))
      .mockImplementationOnce(async () => vehicleItem({
        id: THIRD_ID,
        name: 'Mobil Terbaru',
        plate_number: 'B 3333 NEW'
      }))

    setupVehiclesState(fetchOne)

    const wrapper = await mountSuspended(DetailPage, { route: `/vehicles/${VEHICLE_ID}` })

    expect(wrapper.text()).toContain('Motor Beat')

    routeMock.current.params.id = OTHER_ID
    await flush()

    expect(fetchOne).toHaveBeenCalledWith(OTHER_ID)
    expect(wrapper.find('[aria-label="Memuat detail kendaraan"]').exists()).toBe(true)

    routeMock.current.params.id = THIRD_ID
    await flush()

    expect(fetchOne).toHaveBeenCalledWith(THIRD_ID)
    expect(wrapper.text()).toContain('Mobil Terbaru')

    releaseOther(vehicleItem({
      id: OTHER_ID,
      name: 'Mobil Lama',
      plate_number: 'B 2222 OLD'
    }))
    await flush()

    expect(wrapper.text()).toContain('Mobil Terbaru')
    expect(wrapper.text()).not.toContain('Mobil Lama')
    expect(wrapper.text()).not.toContain('B 2222 OLD')
  })

  it('form edit kendaraan ditutup saat route berubah tanpa remount', async () => {
    const fetchOne = vi.fn(async (id: string) => vehicleItem({
      id,
      name: id === OTHER_ID ? 'Mobil Baru' : 'Motor Beat'
    }))

    setupVehiclesState(fetchOne)

    const wrapper = await mountSuspended(DetailPage, { route: `/vehicles/${VEHICLE_ID}` })

    const editButton = wrapper.findAll('button').find(button => button.text() === 'Ubah')

    expect(editButton).toBeDefined()

    await editButton!.trigger('click')
    await flush()

    expect(bodyText()).toContain('Ubah kendaraan')

    routeMock.current.params.id = OTHER_ID
    await flush()

    expect(wrapper.text()).toContain('Mobil Baru')
    expect(bodyText()).not.toContain('Ubah kendaraan')
  })
})
