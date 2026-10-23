import { describe, expect, it } from 'vitest'
import {
  VEHICLE_MAINTENANCE_ALLOWED_KEYS,
  pickVehicleMaintenanceBody
} from '../../server/utils/vehicleMaintenanceBody'

// Kontrak whitelist Vehicle Maintenance via proxy Nuxt (Phase 16.4.3): proxy
// TIDAK PERNAH meneruskan body apa adanya — hanya field
// StoreVehicleMaintenanceRequest / UpdateVehicleMaintenanceRequest.
// vehicle_id, household_id, status, dan completed_at bukan field yang boleh
// dikirim dari browser; kendaraan berasal dari nested route + session dan
// lifecycle ditentukan aksi Complete backend.

describe('VEHICLE_MAINTENANCE_ALLOWED_KEYS', () => {
  it('tepat memuat empat field kontrak dan tidak memuat field internal/lifecycle', () => {
    expect([...VEHICLE_MAINTENANCE_ALLOWED_KEYS]).toEqual([
      'title',
      'description',
      'scheduled_date',
      'odometer'
    ])

    for (const forbidden of [
      'vehicle_id',
      'household_id',
      'status',
      'completed_at',
      'id',
      'created_at',
      'updated_at'
    ]) {
      expect(VEHICLE_MAINTENANCE_ALLOWED_KEYS).not.toContain(forbidden)
    }
  })
})

describe('pickVehicleMaintenanceBody', () => {
  it('menjatuhkan field internal/lifecycle termasuk vehicle_id, status, dan timestamp', () => {
    const body = pickVehicleMaintenanceBody({
      title: 'Servis rutin 50.000 km',
      description: 'Ganti oli dan filter',
      scheduled_date: '2026-12-01',
      odometer: 50000,
      vehicle_id: '01J0VEHICLE000000000000001',
      household_id: 'h-evil',
      status: 'completed',
      completed_at: '2020-01-01',
      id: '01J0MAINT0000000000000001',
      created_at: '2026-10-01T00:00:00Z'
    })

    expect(body).toEqual({
      title: 'Servis rutin 50.000 km',
      description: 'Ganti oli dan filter',
      scheduled_date: '2026-12-01',
      odometer: 50000
    })
    expect(body).not.toHaveProperty('vehicle_id')
    expect(body).not.toHaveProperty('household_id')
    expect(body).not.toHaveProperty('status')
    expect(body).not.toHaveProperty('completed_at')
    expect(body).not.toHaveProperty('id')
    expect(body).not.toHaveProperty('created_at')
  })

  it('mengubah description/odometer kosong menjadi null eksplisit', () => {
    const body = pickVehicleMaintenanceBody({
      title: 'Cek rem',
      description: '',
      scheduled_date: '2026-12-20',
      odometer: ''
    })

    expect(body).toEqual({
      title: 'Cek rem',
      description: null,
      scheduled_date: '2026-12-20',
      odometer: null
    })
  })

  it('tidak mengubah scheduled_date kosong (backend tetap otoritas validasi)', () => {
    const body = pickVehicleMaintenanceBody({ title: 'Servis', scheduled_date: '' })

    expect(body).toEqual({ title: 'Servis', scheduled_date: '' })
  })

  it('mempertahankan null eksplisit dan melewati key yang tidak disertakan', () => {
    const body = pickVehicleMaintenanceBody({ title: 'Servis', description: null })

    expect(body).toEqual({ title: 'Servis', description: null })
    expect(body).not.toHaveProperty('odometer')
    expect(body).not.toHaveProperty('scheduled_date')
  })

  it('body null/kosong menghasilkan objek kosong', () => {
    expect(pickVehicleMaintenanceBody(null)).toEqual({})
    expect(pickVehicleMaintenanceBody(undefined)).toEqual({})
    expect(pickVehicleMaintenanceBody({})).toEqual({})
  })
})
