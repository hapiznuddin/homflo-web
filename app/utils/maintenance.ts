import type { MaintenanceFilter, MaintenanceItem, MaintenancePriority, MaintenanceStatus } from '~/types/maintenance'

// Helper murni domain maintenance (tanpa API Nuxt) agar dapat diuji di
// project unit. Semua fungsi di sini HANYA memformat/memilih label dari
// field backend — status adalah field turunan server, tidak pernah dihitung
// ulang di browser.

const PRIORITY_LABELS: Record<MaintenancePriority, string> = {
  tinggi: 'Tinggi',
  sedang: 'Sedang',
  rutin: 'Rutin'
}

export function maintenancePriorityLabel(priority: MaintenancePriority): string {
  return PRIORITY_LABELS[priority]
}

export const MAINTENANCE_PRIORITY_OPTIONS: Array<{ label: string, value: MaintenancePriority }> = [
  { label: 'Tinggi', value: 'tinggi' },
  { label: 'Sedang', value: 'sedang' },
  { label: 'Rutin', value: 'rutin' }
]

export function maintenancePriorityChipClass(priority: MaintenancePriority): string {
  switch (priority) {
    case 'tinggi':
      return 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
    case 'sedang':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
    default:
      return 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
  }
}

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  scheduled: 'Terjadwal',
  completed: 'Selesai',
  cancelled: 'Dibatalkan'
}

export function maintenanceStatusLabel(status: MaintenanceStatus): string {
  return MAINTENANCE_STATUS_LABELS[status]
}

export function maintenanceStatusChipClass(status: MaintenanceStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
    case 'cancelled':
      return 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
    default:
      return 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
  }
}

export const MAINTENANCE_FILTER_OPTIONS: Array<{ label: string, value: MaintenanceFilter }> = [
  { label: 'Semua', value: 'all' },
  { label: 'Terjadwal', value: 'scheduled' },
  { label: 'Selesai', value: 'completed' },
  { label: 'Dibatalkan', value: 'cancelled' }
]

// Filter client-side: endpoint list mengembalikan seluruh status tanpa query,
// jadi pemilihan status murni menyaring data yang sudah termuat.
export function filterMaintenance(items: MaintenanceItem[], filter: MaintenanceFilter): MaintenanceItem[] {
  if (filter === 'all') {
    return items
  }

  return items.filter(item => item.status === filter)
}
