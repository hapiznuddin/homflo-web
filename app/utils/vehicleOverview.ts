import type { VehicleMaintenanceItem } from '~/types/vehicleMaintenance'
import type { VehicleObligationItem } from '~/types/vehicleObligations'
import type { VehicleItem } from '~/types/vehicles'
import type {
  VehicleActiveObligationItem,
  VehicleServiceScheduleItem
} from '~/types/vehicleOverview'

// Vehicles Overview loads the latest resources through the existing nested
// endpoints. Both lists are unpaginated, but the household can still own many
// vehicles, so the overview deliberately scans only the first N vehicles
// (backend order: name then id). The full vehicle list remains on the page.
export const VEHICLE_OVERVIEW_VEHICLE_LIMIT = 20

// Each overview section is a compact preview, not a second full history page.
export const VEHICLE_OVERVIEW_ITEM_LIMIT = 5

// At most this many vehicles are fetched concurrently. Each vehicle may issue
// one maintenance and one obligation request in parallel, so the effective
// request cap is twice this number.
export const VEHICLE_OVERVIEW_CONCURRENCY = 4

function compareText(left: string, right: string): number {
  return left.localeCompare(right)
}

function compareDate(left: string | null, right: string | null): number {
  if (left === right) {
    return 0
  }

  // A scheduled service may have no date in the backend schema. It stays
  // visible but is placed after dated schedules without inventing a date.
  if (left === null) {
    return 1
  }

  if (right === null) {
    return -1
  }

  return left < right ? -1 : 1
}

function sortServiceSchedules(
  items: VehicleServiceScheduleItem[]
): VehicleServiceScheduleItem[] {
  return [...items].sort((left, right) => {
    const byDate = compareDate(
      left.maintenance.scheduled_date,
      right.maintenance.scheduled_date
    )

    if (byDate !== 0) {
      return byDate
    }

    const byVehicle = compareText(left.vehicle.name, right.vehicle.name)

    if (byVehicle !== 0) {
      return byVehicle
    }

    const byVehicleId = compareText(left.vehicle.id, right.vehicle.id)

    if (byVehicleId !== 0) {
      return byVehicleId
    }

    return compareText(left.maintenance.id, right.maintenance.id)
  })
}

function sortActiveObligations(
  items: VehicleActiveObligationItem[]
): VehicleActiveObligationItem[] {
  return [...items].sort((left, right) => {
    const byDate = compareDate(left.obligation.due_date, right.obligation.due_date)

    if (byDate !== 0) {
      return byDate
    }

    const byVehicle = compareText(left.vehicle.name, right.vehicle.name)

    if (byVehicle !== 0) {
      return byVehicle
    }

    const byVehicleId = compareText(left.vehicle.id, right.vehicle.id)

    if (byVehicleId !== 0) {
      return byVehicleId
    }

    return compareText(left.obligation.id, right.obligation.id)
  })
}

/** The bounded subset of the authoritative vehicle list used by the overview. */
export function vehiclesForOverview(vehicles: VehicleItem[]): VehicleItem[] {
  return vehicles.slice(0, VEHICLE_OVERVIEW_VEHICLE_LIMIT)
}

/**
 * Select scheduled services only. The backend-derived `status` is the sole
 * lifecycle truth; completed records are never treated as upcoming.
 */
export function selectUpcomingServiceSchedules(
  vehicles: VehicleItem[],
  recordsByVehicle: Record<string, VehicleMaintenanceItem[]>
): VehicleServiceScheduleItem[] {
  const selected: VehicleServiceScheduleItem[] = []

  for (const vehicle of vehicles) {
    for (const maintenance of recordsByVehicle[vehicle.id] ?? []) {
      if (maintenance.status === 'scheduled') {
        selected.push({ vehicle, maintenance })
      }
    }
  }

  return sortServiceSchedules(selected)
}

/**
 * Select active obligations only. A due date in the past is presentation
 * context, never a replacement for the server's administrative status.
 */
export function selectActiveObligations(
  vehicles: VehicleItem[],
  recordsByVehicle: Record<string, VehicleObligationItem[]>
): VehicleActiveObligationItem[] {
  const selected: VehicleActiveObligationItem[] = []

  for (const vehicle of vehicles) {
    for (const obligation of recordsByVehicle[vehicle.id] ?? []) {
      if (obligation.status === 'active') {
        selected.push({ vehicle, obligation })
      }
    }
  }

  return sortActiveObligations(selected)
}

/**
 * Run independent async work with a fixed upper bound on in-flight tasks.
 * Settled results preserve input order so callers can report exactly which
 * vehicles succeeded or failed.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<Array<PromiseSettledResult<R>>> {
  const results = new Array<PromiseSettledResult<R>>(items.length)
  const workerCount = Math.max(1, Math.min(Math.floor(limit) || 1, items.length))
  let nextIndex = 0

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex
      nextIndex += 1

      if (index >= items.length) {
        return
      }

      try {
        results[index] = {
          status: 'fulfilled',
          value: await mapper(items[index]!, index)
        }
      } catch (reason) {
        results[index] = { status: 'rejected', reason }
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()))

  return results
}
