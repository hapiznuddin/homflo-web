import type { VehicleMaintenanceItem } from '~/types/vehicleMaintenance'
import type { VehicleObligationItem } from '~/types/vehicleObligations'
import type { VehicleItem } from '~/types/vehicles'

// Read-only view models for the Vehicles Overview. They combine a nested
// resource with the vehicle that already owns it in the verified API. No
// relationship is inferred: the vehicle comes from the same nested route used
// to load the record.

export interface VehicleServiceScheduleItem {
  vehicle: VehicleItem
  maintenance: VehicleMaintenanceItem
}

export interface VehicleActiveObligationItem {
  vehicle: VehicleItem
  obligation: VehicleObligationItem
}
