import type {
  VehicleMaintenanceFilter,
  VehicleMaintenanceItem,
  VehicleMaintenanceStatus
} from '~/types/vehicleMaintenance'

// Helper murni domain Vehicle Maintenance (tanpa API Nuxt) agar dapat diuji di
// project unit. Semua fungsi di sini HANYA memformat/memilih label dari field
// backend — status adalah field turunan server, tidak pernah dihitung ulang
// di browser.

export const VEHICLE_MAINTENANCE_STATUS_LABELS: Record<VehicleMaintenanceStatus, string> = {
  scheduled: 'Terjadwal',
  completed: 'Selesai'
}

export function vehicleMaintenanceStatusLabel(status: VehicleMaintenanceStatus): string {
  return VEHICLE_MAINTENANCE_STATUS_LABELS[status]
}

export function vehicleMaintenanceStatusChipClass(status: VehicleMaintenanceStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
    default:
      return 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
  }
}

export const VEHICLE_MAINTENANCE_FILTER_OPTIONS: Array<{ label: string, value: VehicleMaintenanceFilter }> = [
  { label: 'Semua', value: 'all' },
  { label: 'Terjadwal', value: 'scheduled' },
  { label: 'Selesai', value: 'completed' }
]

// Filter client-side: endpoint list mengembalikan seluruh status tanpa query,
// jadi pemilihan status murni menyaring data yang sudah termuat.
export function filterVehicleMaintenance(
  items: VehicleMaintenanceItem[],
  filter: VehicleMaintenanceFilter
): VehicleMaintenanceItem[] {
  if (filter === 'all') {
    return items
  }

  return items.filter(item => item.status === filter)
}

// Pengelompokan menjaga urutan server (scheduled_date lalu id) dan tidak
// menduplikasi catatan: setiap record berada tepat di satu kelompok menurut
// status backend.
export function groupVehicleMaintenance(items: VehicleMaintenanceItem[]): {
  scheduled: VehicleMaintenanceItem[]
  completed: VehicleMaintenanceItem[]
} {
  return {
    scheduled: items.filter(item => item.status === 'scheduled'),
    completed: items.filter(item => item.status === 'completed')
  }
}
