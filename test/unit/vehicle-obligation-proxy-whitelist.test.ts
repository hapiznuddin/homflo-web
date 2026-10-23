import { describe, expect, it } from 'vitest'
import {
  VEHICLE_OBLIGATION_CREATE_KEYS,
  VEHICLE_OBLIGATION_UPDATE_KEYS,
  pickVehicleObligationCreateBody,
  pickVehicleObligationUpdateBody
} from '../../server/utils/vehicleObligationBody'
import {
  OBLIGATION_TYPE_ALLOWED_KEYS,
  pickObligationTypeBody
} from '../../server/utils/obligationTypeBody'

// Kontrak whitelist Obligations via proxy Nuxt (Phase 16.4.6): proxy TIDAK
// PERNAH meneruskan body apa adanya. `vehicle_id`/`household_id`/id/timestamp
// ditentukan server melalui nested route + session. `status` hanya boleh
// dikirim saat update; create selalu Active di backend.

describe('VEHICLE_OBLIGATION_CREATE_KEYS', () => {
  it('memuat field create kontrak tanpa status/ownership/lifecycle', () => {
    expect([...VEHICLE_OBLIGATION_CREATE_KEYS]).toEqual([
      'obligation_type_id',
      'title',
      'description',
      'issued_date',
      'due_date',
      'amount'
    ])

    for (const forbidden of [
      'vehicle_id',
      'household_id',
      'status',
      'id',
      'created_at',
      'updated_at'
    ]) {
      expect(VEHICLE_OBLIGATION_CREATE_KEYS).not.toContain(forbidden)
    }
  })
})

describe('VEHICLE_OBLIGATION_UPDATE_KEYS', () => {
  it('menambahkan status sebagai satu-satunya field lifecycle yang writable', () => {
    expect([...VEHICLE_OBLIGATION_UPDATE_KEYS]).toEqual([
      'obligation_type_id',
      'title',
      'description',
      'issued_date',
      'due_date',
      'amount',
      'status'
    ])

    for (const forbidden of ['vehicle_id', 'household_id', 'id', 'created_at', 'updated_at']) {
      expect(VEHICLE_OBLIGATION_UPDATE_KEYS).not.toContain(forbidden)
    }
  })
})

describe('pickVehicleObligationCreateBody', () => {
  it('menjatuhkan ownership, status, id, dan timestamp', () => {
    const body = pickVehicleObligationCreateBody({
      obligation_type_id: '01JTYPE000000000000000001',
      title: 'Pajak tahunan',
      description: 'Pajak kendaraan',
      issued_date: '2026-10-01',
      due_date: '2026-11-30',
      amount: '250000.00',
      vehicle_id: '01JVEHICLE000000000000001',
      household_id: 'h-evil',
      status: 'inactive',
      id: '01JOBLIGATION000000000001',
      created_at: '2026-10-01T00:00:00Z'
    })

    expect(body).toEqual({
      obligation_type_id: '01JTYPE000000000000000001',
      title: 'Pajak tahunan',
      description: 'Pajak kendaraan',
      issued_date: '2026-10-01',
      due_date: '2026-11-30',
      amount: '250000.00'
    })
    expect(body).not.toHaveProperty('vehicle_id')
    expect(body).not.toHaveProperty('household_id')
    expect(body).not.toHaveProperty('status')
    expect(body).not.toHaveProperty('id')
    expect(body).not.toHaveProperty('created_at')
  })

  it('mengubah description/issued_date/amount kosong menjadi null eksplisit', () => {
    const body = pickVehicleObligationCreateBody({
      obligation_type_id: '01JTYPE000000000000000001',
      title: 'STNK',
      description: '',
      issued_date: '',
      due_date: '2026-12-31',
      amount: ''
    })

    expect(body).toEqual({
      obligation_type_id: '01JTYPE000000000000000001',
      title: 'STNK',
      description: null,
      issued_date: null,
      due_date: '2026-12-31',
      amount: null
    })
  })

  it('tidak mengubah due_date kosong agar backend tetap otoritas validasi', () => {
    const body = pickVehicleObligationCreateBody({
      obligation_type_id: '01JTYPE000000000000000001',
      title: 'KIR',
      due_date: ''
    })

    expect(body).toEqual({
      obligation_type_id: '01JTYPE000000000000000001',
      title: 'KIR',
      due_date: ''
    })
  })

  it('body null/kosong menghasilkan objek kosong', () => {
    expect(pickVehicleObligationCreateBody(null)).toEqual({})
    expect(pickVehicleObligationCreateBody(undefined)).toEqual({})
    expect(pickVehicleObligationCreateBody({})).toEqual({})
  })
})

describe('pickVehicleObligationUpdateBody', () => {
  it('mempertahankan status active/inactive dan menjatuhkan field server', () => {
    const body = pickVehicleObligationUpdateBody({
      title: 'Pajak diperbarui',
      issued_date: null,
      amount: null,
      status: 'inactive',
      vehicle_id: 'other',
      household_id: 'h-evil',
      id: 'other'
    })

    expect(body).toEqual({
      title: 'Pajak diperbarui',
      issued_date: null,
      amount: null,
      status: 'inactive'
    })
  })
})

describe('OBLIGATION_TYPE_ALLOWED_KEYS', () => {
  it('hanya memuat name — ownership/type sistem tidak writable', () => {
    expect([...OBLIGATION_TYPE_ALLOWED_KEYS]).toEqual(['name'])

    for (const forbidden of ['household_id', 'is_system', 'code', 'id', 'created_at']) {
      expect(OBLIGATION_TYPE_ALLOWED_KEYS).not.toContain(forbidden)
    }
  })
})

describe('pickObligationTypeBody', () => {
  it('hanya meneruskan name', () => {
    const body = pickObligationTypeBody({
      name: 'Asuransi kendaraan',
      household_id: 'h-evil',
      is_system: true,
      code: 'insurance',
      id: 'evil'
    })

    expect(body).toEqual({ name: 'Asuransi kendaraan' })
  })

  it('body kosong menghasilkan objek kosong', () => {
    expect(pickObligationTypeBody(null)).toEqual({})
    expect(pickObligationTypeBody({})).toEqual({})
  })
})
