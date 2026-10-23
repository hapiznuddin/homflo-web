import { describe, expect, it } from 'vitest'
import type { VehicleMaintenanceItem } from '~/types/vehicleMaintenance'
import type { VehicleObligationItem } from '~/types/vehicleObligations'
import type { VehicleItem } from '~/types/vehicles'
import {
  VEHICLE_OVERVIEW_VEHICLE_LIMIT,
  mapWithConcurrency,
  selectActiveObligations,
  selectUpcomingServiceSchedules,
  vehiclesForOverview
} from '~/utils/vehicleOverview'

function vehicle(id: string, name: string): VehicleItem {
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

describe('vehicle overview helpers', () => {
  it('membatasi kendaraan yang dipindai tanpa mengubah urutan backend', () => {
    const vehicles = Array.from(
      { length: VEHICLE_OVERVIEW_VEHICLE_LIMIT + 3 },
      (_, index) => vehicle(`v${index}`, `Kendaraan ${index}`)
    )

    const scanned = vehiclesForOverview(vehicles)

    expect(scanned).toHaveLength(VEHICLE_OVERVIEW_VEHICLE_LIMIT)
    expect(scanned[0]?.id).toBe('v0')
    expect(scanned.at(-1)?.id).toBe(`v${VEHICLE_OVERVIEW_VEHICLE_LIMIT - 1}`)
  })

  it('hanya memilih status scheduled lalu mengurutkan tanggal menaik, tanggal kosong terakhir', () => {
    const vehicles = [vehicle('v1', 'Motor Beat'), vehicle('v2', 'Mobil Avanza')]
    const records = {
      v1: [
        maintenance('m4', 'v1', { scheduled_date: '2026-08-01' }),
        maintenance('m3', 'v1', { scheduled_date: null }),
        maintenance('m2', 'v1', { status: 'completed', scheduled_date: '2026-02-01', completed_at: '2026-02-01' })
      ],
      v2: [
        maintenance('m1', 'v2', { scheduled_date: '2026-05-10' }),
        maintenance('m5', 'v2', { scheduled_date: '2026-05-10' })
      ]
    }

    const selected = selectUpcomingServiceSchedules(vehicles, records)

    expect(selected.map(item => item.maintenance.id)).toEqual(['m1', 'm5', 'm4', 'm3'])
    expect(selected.map(item => item.vehicle.name)).toEqual([
      'Mobil Avanza',
      'Mobil Avanza',
      'Motor Beat',
      'Motor Beat'
    ])
    expect(selected.some(item => item.maintenance.status === 'completed')).toBe(false)
  })

  it('hanya memilih kewajiban active lalu mengurutkan due_date menaik', () => {
    const vehicles = [vehicle('v1', 'Motor Beat'), vehicle('v2', 'Mobil Avanza')]
    const records = {
      v1: [
        obligation('o3', 'v1', { due_date: '2026-09-01' }),
        obligation('o2', 'v1', { due_date: '2020-01-01', status: 'inactive' })
      ],
      v2: [
        obligation('o1', 'v2', { due_date: '2026-04-01' }),
        obligation('o4', 'v2', { due_date: '2026-04-01' })
      ]
    }

    const selected = selectActiveObligations(vehicles, records)

    expect(selected.map(item => item.obligation.id)).toEqual(['o1', 'o4', 'o3'])
    expect(selected.every(item => item.obligation.status === 'active')).toBe(true)
    expect(selected.some(item => item.obligation.id === 'o2')).toBe(false)
  })

  it('mempertahankan hasil dan kegagalan sesuai urutan input dengan batas konkurensi', async () => {
    let active = 0
    let maxActive = 0

    const results = await mapWithConcurrency([0, 1, 2, 3, 4, 5, 6], 3, async (value) => {
      active += 1
      maxActive = Math.max(maxActive, active)

      await new Promise(resolve => setTimeout(resolve, 5))
      active -= 1

      if (value === 2) {
        throw new Error('gagal')
      }

      return value * 10
    })

    expect(maxActive).toBeLessThanOrEqual(3)
    expect(results).toHaveLength(7)
    expect(results[0]).toEqual({ status: 'fulfilled', value: 0 })
    expect(results[2]?.status).toBe('rejected')
    expect(results[6]).toEqual({ status: 'fulfilled', value: 60 })
  })
})
