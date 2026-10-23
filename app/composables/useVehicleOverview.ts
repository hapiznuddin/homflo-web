import type { MaybeRefOrGetter, Ref } from 'vue'
import type { VehicleMaintenanceItem } from '~/types/vehicleMaintenance'
import type { VehicleObligationItem } from '~/types/vehicleObligations'
import type { VehicleItem } from '~/types/vehicles'
import {
  VEHICLE_OVERVIEW_CONCURRENCY,
  mapWithConcurrency,
  selectActiveObligations,
  selectUpcomingServiceSchedules,
  vehiclesForOverview
} from '~/utils/vehicleOverview'
import { readError } from '~/composables/useApiError'

// ---------------------------------------------------------------------------
// Vehicles Overview: Browser -> Nuxt /api/vehicles -> Laravel, then one
// nested read per vehicle for the verified maintenance and obligation
// resources. There is no household-wide aggregation or status filter endpoint,
// so the browser performs the smallest safe aggregation:
//
// - only the first VEHICLE_OVERVIEW_VEHICLE_LIMIT vehicles are scanned;
// - at most VEHICLE_OVERVIEW_CONCURRENCY vehicles are fetched at once;
// - maintenance and obligations have independent state and failures;
// - records are filtered by the backend status, never by a derived date.
//
// The overview is read-only. Vehicle CRUD and the detail-page resource CRUD
// remain owned by their existing composables.
// ---------------------------------------------------------------------------

interface OverviewSectionState<T> {
  recordsByVehicle: Record<string, T[]>
  pending: boolean
  error: string | null
  failedVehicleIds: string[]
  loadedVehicleIds: string[]
  targetKey: string
  started: boolean
  requestSeq: number
  inflight: boolean
}

type LoadMode = 'replace' | 'retry'

function emptySection<T>(): OverviewSectionState<T> {
  return {
    recordsByVehicle: {},
    pending: false,
    error: null,
    failedVehicleIds: [],
    loadedVehicleIds: [],
    targetKey: '',
    started: false,
    requestSeq: 0,
    inflight: false
  }
}

export function useVehicleOverview(vehicles: MaybeRefOrGetter<VehicleItem[]>) {
  const currentVehicles = computed(() => toValue(vehicles))
  const overviewVehicles = computed(() => vehiclesForOverview(currentVehicles.value))
  const overviewKey = computed(() => overviewVehicles.value.map(vehicle => vehicle.id).join('|'))

  const servicesState = useState<OverviewSectionState<VehicleMaintenanceItem>>(
    'vehicle-overview-services',
    () => emptySection<VehicleMaintenanceItem>()
  )
  const obligationsState = useState<OverviewSectionState<VehicleObligationItem>>(
    'vehicle-overview-obligations',
    () => emptySection<VehicleObligationItem>()
  )

  function requestHeaders(): Record<string, string> {
    // SSR has no browser cookies of its own; forward them so the nested
    // endpoints resolve the real session (same pattern as useVehicles).
    const headers: Record<string, string> = { Accept: 'application/json' }

    if (import.meta.server) {
      const { cookie } = useRequestHeaders(['cookie'])

      if (cookie) {
        headers.Cookie = cookie
      }
    }

    return headers
  }

  async function fetchRecords<T>(path: string): Promise<T[]> {
    const envelope = await $fetch<{ success: boolean, data: T[] }>(path, {
      credentials: 'include',
      headers: requestHeaders()
    })

    return envelope.data
  }

  async function loadSection<T>(
    stateRef: Ref<OverviewSectionState<T>>,
    pathForVehicle: (vehicleId: string) => string,
    fallback: string,
    mode: LoadMode,
    force: boolean
  ): Promise<void> {
    const state = stateRef.value
    const targetKey = overviewKey.value
    const targets = mode === 'replace'
      ? overviewVehicles.value
      : overviewVehicles.value.filter(vehicle => state.failedVehicleIds.includes(vehicle.id))

    if (mode === 'retry' && targets.length === 0) {
      return
    }

    if (
      mode === 'replace'
      && !force
      && state.started
      && state.targetKey === targetKey
      && state.error === null
      && state.failedVehicleIds.length === 0
    ) {
      return
    }

    if (state.inflight) {
      // A retry is never started on top of an active section load. A forced
      // refresh supersedes the older request so its late response cannot
      // overwrite newer data.
      if (mode === 'retry' || !force) {
        return
      }

      state.requestSeq += 1
      state.inflight = false
    }

    if (mode === 'replace' && state.targetKey !== targetKey) {
      // The scanned vehicle set changed: never mix records from the previous
      // set into the new one.
      state.recordsByVehicle = {}
      state.loadedVehicleIds = []
      state.failedVehicleIds = []
    }

    state.targetKey = targetKey
    state.pending = true
    state.error = null

    if (targets.length === 0) {
      state.pending = false
      state.started = true
      state.inflight = false

      if (mode === 'replace') {
        state.recordsByVehicle = {}
        state.loadedVehicleIds = []
        state.failedVehicleIds = []
      }

      return
    }

    const requestId = ++state.requestSeq
    state.inflight = true

    let settled: Array<PromiseSettledResult<T[]>>

    try {
      settled = await mapWithConcurrency(
        targets,
        VEHICLE_OVERVIEW_CONCURRENCY,
        vehicle => fetchRecords<T>(pathForVehicle(vehicle.id))
      )
    } catch (err) {
      if (requestId !== state.requestSeq) {
        return
      }

      state.error = readError(err, fallback)
      state.failedVehicleIds = targets.map(vehicle => vehicle.id)
      state.started = true
      state.pending = false
      state.inflight = false

      return
    }

    // A newer load has superseded this response. Leave all state to it.
    if (requestId !== state.requestSeq) {
      return
    }

    const nextRecords: Record<string, T[]> = mode === 'replace'
      ? {}
      : { ...state.recordsByVehicle }
    const loadedIds: string[] = []
    const failedIds: string[] = []
    let firstFailure: unknown

    settled.forEach((result, index) => {
      const vehicle = targets[index]!

      if (result.status === 'fulfilled') {
        nextRecords[vehicle.id] = result.value
        loadedIds.push(vehicle.id)

        return
      }

      failedIds.push(vehicle.id)

      if (firstFailure === undefined) {
        firstFailure = result.reason
      }
    })

    state.recordsByVehicle = nextRecords
    state.failedVehicleIds = failedIds
    state.loadedVehicleIds = mode === 'replace'
      ? loadedIds
      : [...new Set([...state.loadedVehicleIds, ...loadedIds])]
    state.error = failedIds.length > 0
      ? readError(firstFailure, fallback)
      : null
    state.started = true
    state.pending = false
    state.inflight = false
  }

  async function loadServices(force: boolean): Promise<void> {
    await loadSection<VehicleMaintenanceItem>(
      servicesState,
      vehicleId => `/api/vehicles/${encodeURIComponent(vehicleId)}/maintenance`,
      'Jadwal servis mendatang belum dapat dimuat.',
      'replace',
      force
    )
  }

  async function loadObligations(force: boolean): Promise<void> {
    await loadSection<VehicleObligationItem>(
      obligationsState,
      vehicleId => `/api/vehicles/${encodeURIComponent(vehicleId)}/obligations`,
      'Kewajiban aktif belum dapat dimuat.',
      'replace',
      force
    )
  }

  async function load(force = false): Promise<void> {
    await Promise.allSettled([
      loadServices(force),
      loadObligations(force)
    ])
  }

  async function refresh(): Promise<void> {
    await load(true)
  }

  async function retryServices(): Promise<void> {
    if (servicesState.value.targetKey !== overviewKey.value) {
      await loadServices(true)

      return
    }

    await loadSection<VehicleMaintenanceItem>(
      servicesState,
      vehicleId => `/api/vehicles/${encodeURIComponent(vehicleId)}/maintenance`,
      'Jadwal servis mendatang belum dapat dimuat.',
      'retry',
      false
    )
  }

  async function retryObligations(): Promise<void> {
    if (obligationsState.value.targetKey !== overviewKey.value) {
      await loadObligations(true)

      return
    }

    await loadSection<VehicleObligationItem>(
      obligationsState,
      vehicleId => `/api/vehicles/${encodeURIComponent(vehicleId)}/obligations`,
      'Kewajiban aktif belum dapat dimuat.',
      'retry',
      false
    )
  }

  const serviceSchedules = computed(() => selectUpcomingServiceSchedules(
    overviewVehicles.value,
    servicesState.value.recordsByVehicle
  ))
  const activeObligations = computed(() => selectActiveObligations(
    overviewVehicles.value,
    obligationsState.value.recordsByVehicle
  ))

  return {
    vehicleCount: computed(() => currentVehicles.value.length),
    scannedVehicles: overviewVehicles,
    scannedVehicleCount: computed(() => overviewVehicles.value.length),
    overviewTruncated: computed(
      () => currentVehicles.value.length > overviewVehicles.value.length
    ),
    serviceSchedules,
    servicesPending: computed(() => servicesState.value.pending),
    servicesStarted: computed(() => servicesState.value.started),
    servicesError: computed(() => servicesState.value.error),
    servicesFailedVehicleIds: computed(() => servicesState.value.failedVehicleIds),
    activeObligations,
    obligationsPending: computed(() => obligationsState.value.pending),
    obligationsStarted: computed(() => obligationsState.value.started),
    obligationsError: computed(() => obligationsState.value.error),
    obligationsFailedVehicleIds: computed(() => obligationsState.value.failedVehicleIds),
    load,
    refresh,
    retryServices,
    retryObligations
  }
}
