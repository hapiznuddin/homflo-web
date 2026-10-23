import { describe, expect, it } from 'vitest'
import {
  MAINTENANCE_FILTER_OPTIONS,
  MAINTENANCE_PRIORITY_OPTIONS,
  MAINTENANCE_STATUS_LABELS,
  filterMaintenance,
  maintenancePriorityChipClass,
  maintenancePriorityLabel,
  maintenanceStatusChipClass,
  maintenanceStatusLabel
} from '../../app/utils/maintenance'
import { readError } from '../../app/composables/useApiError'
import type { MaintenanceItem, MaintenanceStatus } from '../../app/types/maintenance'

// Helper murni Maintenance: SEMUA fungsi di sini hanya memilih label/kelas
// dari field backend (priority/status) — status adalah field turunan server,
// tidak pernah dihitung ulang di browser.

function maintenanceItem(overrides: Partial<MaintenanceItem> = {}): MaintenanceItem {
  return {
    id: '01J0MAINT0000000000000001',
    household_id: 'h1',
    asset_id: '01J0ASSET0000000000000001',
    title: 'Cuci AC kamar',
    description: 'Rutin bulanan',
    location: 'Kamar utama',
    scheduled_date: '2026-11-01',
    completed_at: null,
    cancelled_at: null,
    priority: 'rutin',
    status: 'scheduled',
    created_at: '2026-10-01T00:00:00.000000Z',
    updated_at: '2026-10-01T00:00:00.000000Z',
    ...overrides
  }
}

describe('maintenance helpers', () => {
  it('MAINTENANCE_PRIORITY_OPTIONS berisi tepat tiga nilai kontrak backend', () => {
    expect(MAINTENANCE_PRIORITY_OPTIONS.map(option => option.value)).toEqual(['tinggi', 'sedang', 'rutin'])
  })

  it('maintenancePriorityLabel memetakan tiga prioritas', () => {
    expect(maintenancePriorityLabel('tinggi')).toBe('Tinggi')
    expect(maintenancePriorityLabel('sedang')).toBe('Sedang')
    expect(maintenancePriorityLabel('rutin')).toBe('Rutin')
  })

  it('label & kelas chip prioritas tidak kosong untuk setiap nilai', () => {
    for (const value of ['tinggi', 'sedang', 'rutin'] as const) {
      expect(maintenancePriorityLabel(value)).not.toBe('')
      expect(maintenancePriorityChipClass(value)).not.toBe('')
    }
  })

  it('MAINTENANCE_STATUS_LABELS memakai istilah jujur untuk lifecycle backend', () => {
    expect(MAINTENANCE_STATUS_LABELS).toEqual({
      scheduled: 'Terjadwal',
      completed: 'Selesai',
      cancelled: 'Dibatalkan'
    })

    for (const status of Object.keys(MAINTENANCE_STATUS_LABELS) as MaintenanceStatus[]) {
      expect(maintenanceStatusLabel(status)).toBe(MAINTENANCE_STATUS_LABELS[status])
      expect(maintenanceStatusChipClass(status)).not.toBe('')
    }
  })

  it('MAINTENANCE_FILTER_OPTIONS memuat Semua + tiga status kontrak', () => {
    expect(MAINTENANCE_FILTER_OPTIONS.map(option => option.value)).toEqual([
      'all',
      'scheduled',
      'completed',
      'cancelled'
    ])
  })

  it('filterMaintenance(all) mempertahankan referensi tanpa menyalin', () => {
    const items = [maintenanceItem()]

    expect(filterMaintenance(items, 'all')).toBe(items)
  })

  it('filterMaintenance menyaring client-side berdasarkan status backend', () => {
    const items = [
      maintenanceItem({ id: 'm1', status: 'scheduled' }),
      maintenanceItem({ id: 'm2', status: 'completed' }),
      maintenanceItem({ id: 'm3', status: 'cancelled' }),
      maintenanceItem({ id: 'm4', status: 'completed' })
    ]

    expect(filterMaintenance(items, 'scheduled').map(item => item.id)).toEqual(['m1'])
    expect(filterMaintenance(items, 'completed').map(item => item.id)).toEqual(['m2', 'm4'])
    expect(filterMaintenance(items, 'cancelled').map(item => item.id)).toEqual(['m3'])
  })
})

describe('readError untuk kode lifecycle maintenance', () => {
  it('memetakan kode envelope maintenance ke pesan Indonesia yang jelas', () => {
    expect(readError({
      statusCode: 422,
      data: {
        data: {
          success: false,
          error: { code: 'MAINTENANCE_ALREADY_COMPLETED', message: 'Maintenance already completed.' }
        }
      }
    }, 'fallback')).toBe('Perawatan ini sudah ditandai selesai.')

    expect(readError({
      statusCode: 422,
      data: {
        data: {
          success: false,
          error: { code: 'MAINTENANCE_ALREADY_CANCELLED', message: 'Maintenance already cancelled.' }
        }
      }
    }, 'fallback')).toBe('Perawatan ini sudah dibatalkan.')

    expect(readError({
      statusCode: 404,
      data: {
        data: {
          success: false,
          error: { code: 'MAINTENANCE_NOT_FOUND', message: 'Maintenance not found.' }
        }
      }
    }, 'fallback')).toBe('Catatan perawatan tidak ditemukan.')
  })

  it('menerjemahkan pesan validasi field maintenance via label Indonesia', () => {
    expect(readError({
      statusCode: 422,
      data: {
        message: 'The title field is required.',
        errors: { title: ['The title field is required.'] }
      }
    }, 'fallback')).toBe('Kolom judul wajib diisi.')

    expect(readError({
      statusCode: 422,
      data: {
        message: 'The asset id field is required.',
        errors: { asset_id: ['The asset id field is required.'] }
      }
    }, 'fallback')).toBe('Kolom aset wajib diisi.')
  })
})
