import { describe, expect, it } from 'vitest'
import { MAINTENANCE_ALLOWED_KEYS, pickMaintenanceBody } from '../../server/utils/maintenanceBody'

// Kontrak whitelist maintenance via proxy Nuxt (Phase 16.3.3): proxy TIDAK
// PERNAH meneruskan body apa adanya — hanya field StoreMaintenanceRequest /
// UpdateMaintenanceRequest. household_id, status, completed_at, dan
// cancelled_at bukan field yang boleh dikirim dari browser; ownership dan
// lifecycle ditentukan session + aksi Complete/Cancel backend.

describe('MAINTENANCE_ALLOWED_KEYS', () => {
  it('tepat memuat enam field kontrak dan tidak memuat field internal/lifecycle', () => {
    expect([...MAINTENANCE_ALLOWED_KEYS]).toEqual([
      'asset_id',
      'title',
      'description',
      'location',
      'scheduled_date',
      'priority'
    ])

    for (const forbidden of [
      'household_id',
      'status',
      'completed_at',
      'cancelled_at',
      'id',
      'created_at',
      'updated_at'
    ]) {
      expect(MAINTENANCE_ALLOWED_KEYS).not.toContain(forbidden)
    }
  })
})

describe('pickMaintenanceBody', () => {
  it('menjatuhkan field internal/lifecycle termasuk household_id, status, dan timestamp', () => {
    const body = pickMaintenanceBody({
      asset_id: '01J0ASSET0000000000000001',
      title: 'Cuci AC kamar',
      description: 'Rutin bulanan',
      location: 'Kamar utama',
      scheduled_date: '2026-11-01',
      priority: 'rutin',
      household_id: 'h-evil',
      status: 'completed',
      completed_at: '2026-11-02',
      cancelled_at: '2026-11-03',
      id: '01J0MAINT0000000000000001',
      created_at: '2026-11-01T00:00:00Z'
    })

    expect(body).toEqual({
      asset_id: '01J0ASSET0000000000000001',
      title: 'Cuci AC kamar',
      description: 'Rutin bulanan',
      location: 'Kamar utama',
      scheduled_date: '2026-11-01',
      priority: 'rutin'
    })
    expect(body).not.toHaveProperty('household_id')
    expect(body).not.toHaveProperty('status')
    expect(body).not.toHaveProperty('completed_at')
    expect(body).not.toHaveProperty('cancelled_at')
    expect(body).not.toHaveProperty('id')
    expect(body).not.toHaveProperty('created_at')
  })

  it('mengubah deskripsi kosong menjadi null eksplisit', () => {
    const body = pickMaintenanceBody({ title: 'Servis', description: '' })

    expect(body).toEqual({ title: 'Servis', description: null })
  })

  it('tidak menyentuh location/scheduled_date/priority kosong (hanya description nullable)', () => {
    const body = pickMaintenanceBody({
      location: '',
      scheduled_date: '',
      priority: 'tinggi'
    })

    expect(body).toEqual({ location: '', scheduled_date: '', priority: 'tinggi' })
  })

  it('mempertahankan null eksplisit dan melewati key yang tidak disertakan', () => {
    const body = pickMaintenanceBody({ title: 'Servis', description: null })

    expect(body).toEqual({ title: 'Servis', description: null })
    expect(body).not.toHaveProperty('location')
    expect(body).not.toHaveProperty('asset_id')
  })

  it('body null/kosong menghasilkan objek kosong', () => {
    expect(pickMaintenanceBody(null)).toEqual({})
    expect(pickMaintenanceBody(undefined)).toEqual({})
    expect(pickMaintenanceBody({})).toEqual({})
  })
})
