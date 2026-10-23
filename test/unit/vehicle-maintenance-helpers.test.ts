import { describe, expect, it } from 'vitest'
import type { VehicleMaintenanceItem } from '~/types/vehicleMaintenance'
import {
  filterVehicleMaintenance,
  groupVehicleMaintenance,
  vehicleMaintenanceStatusChipClass,
  vehicleMaintenanceStatusLabel
} from '~/utils/vehicleMaintenance'

function item(overrides: Partial<VehicleMaintenanceItem> = {}): VehicleMaintenanceItem {
  return {
    id: '01J0MAINT0000000000000001',
    vehicle_id: '01J0VEHICLE000000000000001',
    title: 'Ganti oli',
    description: null,
    scheduled_date: '2026-11-01',
    completed_at: null,
    odometer: null,
    status: 'scheduled',
    created_at: '2026-10-01T00:00:00.000000Z',
    updated_at: '2026-10-01T00:00:00.000000Z',
    ...overrides
  }
}

describe('label & chip status servis kendaraan', () => {
  it('hanya memetakan dua status lifecycle MVP', () => {
    expect(vehicleMaintenanceStatusLabel('scheduled')).toBe('Terjadwal')
    expect(vehicleMaintenanceStatusLabel('completed')).toBe('Selesai')
  })

  it('memberi kelas chip berbeda untuk scheduled dan completed', () => {
    expect(vehicleMaintenanceStatusChipClass('scheduled')).not.toBe(vehicleMaintenanceStatusChipClass('completed'))
  })
})

describe('filterVehicleMaintenance', () => {
  const scheduled = item({ id: 'a', status: 'scheduled' })
  const completed = item({ id: 'b', status: 'completed', completed_at: '2026-11-02' })

  it('all mengembalikan seluruh data tanpa mengubah urutan', () => {
    expect(filterVehicleMaintenance([scheduled, completed], 'all')).toEqual([scheduled, completed])
  })

  it('menyaring hanya status yang dipilih', () => {
    expect(filterVehicleMaintenance([scheduled, completed], 'scheduled')).toEqual([scheduled])
    expect(filterVehicleMaintenance([scheduled, completed], 'completed')).toEqual([completed])
  })
})

describe('groupVehicleMaintenance', () => {
  it('membagi record tepat satu kelompok tanpa duplikasi dan menjaga urutan server', () => {
    const first = item({ id: 'a', status: 'scheduled', scheduled_date: '2026-11-01' })
    const second = item({ id: 'b', status: 'completed', completed_at: '2026-10-01' })
    const third = item({ id: 'c', status: 'scheduled', scheduled_date: '2026-12-01' })

    const groups = groupVehicleMaintenance([first, second, third])

    expect(groups.scheduled.map(entry => entry.id)).toEqual(['a', 'c'])
    expect(groups.completed.map(entry => entry.id)).toEqual(['b'])
    expect([...groups.scheduled, ...groups.completed]).toHaveLength(3)
  })

  it('kelompok kosong tetap berupa array', () => {
    expect(groupVehicleMaintenance([])).toEqual({ scheduled: [], completed: [] })
  })
})
