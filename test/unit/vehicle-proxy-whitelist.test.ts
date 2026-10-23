import { describe, expect, it } from 'vitest'
import { VEHICLE_ALLOWED_KEYS, pickVehicleBody } from '../../server/utils/vehicleBody'

// Kontrak whitelist kendaraan via proxy Nuxt (Phase 16.4.2): proxy TIDAK
// PERNAH meneruskan body apa adanya — hanya field StoreVehicleRequest /
// UpdateVehicleRequest. household_id bukan field yang boleh dikirim dari
// browser; ownership ditentukan session backend. Nama field backend adalah
// `plate_number` (label UI "plat nomor" dipetakan di batas request klien).

describe('VEHICLE_ALLOWED_KEYS', () => {
  it('tepat memuat tujuh field kontrak dan tidak memuat identifier', () => {
    expect([...VEHICLE_ALLOWED_KEYS]).toEqual([
      'name',
      'brand',
      'model',
      'year',
      'type',
      'plate_number',
      'odometer'
    ])
    expect(VEHICLE_ALLOWED_KEYS).not.toContain('household_id')
    expect(VEHICLE_ALLOWED_KEYS).not.toContain('id')
  })
})

describe('pickVehicleBody', () => {
  it('menjatuhkan field internal/asing termasuk household_id dan id', () => {
    const body = pickVehicleBody({
      name: 'Motor Beat',
      brand: 'Honda',
      model: 'Beat FI',
      year: 2019,
      type: 'Sepeda motor',
      plate_number: 'B 1234 XYZ',
      odometer: 24000,
      household_id: 'h-evil',
      id: '01J0VEHICLE000000000000001',
      created_at: '2026-01-15T00:00:00Z'
    })

    expect(body).toEqual({
      name: 'Motor Beat',
      brand: 'Honda',
      model: 'Beat FI',
      year: 2019,
      type: 'Sepeda motor',
      plate_number: 'B 1234 XYZ',
      odometer: 24000
    })
    expect(body).not.toHaveProperty('household_id')
    expect(body).not.toHaveProperty('id')
    expect(body).not.toHaveProperty('created_at')
  })

  it('mengubah string kosong pada kolom nullable menjadi null eksplisit', () => {
    const body = pickVehicleBody({
      name: 'Motor Beat',
      brand: '',
      model: '',
      year: '',
      type: '',
      plate_number: '',
      odometer: ''
    })

    expect(body).toEqual({
      name: 'Motor Beat',
      brand: null,
      model: null,
      year: null,
      type: null,
      plate_number: null,
      odometer: null
    })
  })

  it('mempertahankan null eksplisit dan melewati key yang tidak disertakan', () => {
    const body = pickVehicleBody({ name: 'Mobil', plate_number: null })

    expect(body).toEqual({ name: 'Mobil', plate_number: null })
    expect(body).not.toHaveProperty('brand')
    expect(body).not.toHaveProperty('odometer')
  })

  it('body null/kosong menghasilkan objek kosong', () => {
    expect(pickVehicleBody(null)).toEqual({})
    expect(pickVehicleBody(undefined)).toEqual({})
    expect(pickVehicleBody({})).toEqual({})
  })
})
