import { describe, expect, it } from 'vitest'
import type { ObligationTypeItem, VehicleObligationItem } from '~/types/vehicleObligations'
import {
  formatObligationAmount,
  isObligationDueDatePast,
  obligationStatusChipClass,
  obligationStatusLabel,
  obligationTypeOptions,
  parseObligationAmount,
  splitObligationTypes,
  ymdToday
} from '~/utils/vehicleObligations'

function typeItem(overrides: Partial<ObligationTypeItem> = {}): ObligationTypeItem {
  return {
    id: '01JTYPE000000000000000001',
    household_id: null,
    code: 'tax',
    name: 'Pajak Kendaraan',
    is_system: true,
    created_at: '2026-10-01T00:00:00.000000Z',
    updated_at: '2026-10-01T00:00:00.000000Z',
    ...overrides
  }
}

function obligationItem(overrides: Partial<VehicleObligationItem> = {}): VehicleObligationItem {
  return {
    id: '01JOBLIGATION000000000001',
    vehicle_id: '01JVEHICLE000000000000001',
    obligation_type: {
      id: '01JTYPE000000000000000001',
      code: 'tax',
      name: 'Pajak Kendaraan',
      is_system: true
    },
    title: 'Pajak tahunan',
    description: null,
    issued_date: null,
    due_date: '2026-11-30',
    amount: '250000.00',
    status: 'active',
    created_at: '2026-10-01T00:00:00.000000Z',
    updated_at: '2026-10-01T00:00:00.000000Z',
    ...overrides
  }
}

describe('status administratif', () => {
  it('memetakan hanya active/inactive tanpa status pembayaran', () => {
    expect(obligationStatusLabel('active')).toBe('Aktif')
    expect(obligationStatusLabel('inactive')).toBe('Tidak aktif')
    expect(obligationStatusChipClass('active')).toContain('emerald')
    expect(obligationStatusChipClass('inactive')).toContain('slate')
  })
})

describe('konteks tanggal', () => {
  it('ymdToday memakai tanggal lokal Y-m-d', () => {
    expect(ymdToday(new Date(2026, 9, 23))).toBe('2026-10-23')
    expect(ymdToday(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('due date lewat hanya penanda tanggal, bukan status', () => {
    expect(isObligationDueDatePast(obligationItem({ due_date: '2026-11-29' }), '2026-11-30')).toBe(true)
    expect(isObligationDueDatePast(obligationItem({ due_date: '2026-11-30' }), '2026-11-30')).toBe(false)
    expect(isObligationDueDatePast(obligationItem({ due_date: '2026-12-01' }), '2026-11-30')).toBe(false)
  })

  it('status tidak berubah karena due date lewat', () => {
    const item = obligationItem({ due_date: '2020-01-01', status: 'active' })

    expect(isObligationDueDatePast(item, '2026-10-23')).toBe(true)
    expect(item.status).toBe('active')
  })
})

describe('format nominal', () => {
  it('memformat string desimal backend dengan format mata uang aplikasi', () => {
    expect(formatObligationAmount('250000.00')).toContain('250.000')
    expect(formatObligationAmount('0.00')).toContain('0')
  })

  it('tidak membulatkan sen yang didukung backend', () => {
    const formatted = formatObligationAmount('250000.50')

    expect(formatted).toContain('250.000')
    expect(formatted).toContain('50')
    expect(formatted).not.toContain('250.001')
  })

  it('null/kosong tidak ditampilkan', () => {
    expect(formatObligationAmount(null)).toBeNull()
    expect(formatObligationAmount('')).toBeNull()
  })
})

describe('parseObligationAmount', () => {
  it('string kosong berarti tidak dicatat', () => {
    expect(parseObligationAmount('')).toEqual({ value: null, invalid: false })
    expect(parseObligationAmount('   ')).toEqual({ value: null, invalid: false })
  })

  it('menerima angka non-negatif dengan maksimal dua desimal', () => {
    expect(parseObligationAmount('250000')).toEqual({ value: '250000', invalid: false })
    expect(parseObligationAmount(' 250000.50 ')).toEqual({ value: '250000.50', invalid: false })
    expect(parseObligationAmount('0')).toEqual({ value: '0', invalid: false })
  })

  it('menolak negatif, bukan angka, dan lebih dari dua desimal', () => {
    expect(parseObligationAmount('-1').invalid).toBe(true)
    expect(parseObligationAmount('abc').invalid).toBe(true)
    expect(parseObligationAmount('250000.555').invalid).toBe(true)
    expect(parseObligationAmount('250.000,00').invalid).toBe(true)
    expect(parseObligationAmount('99999999999999').invalid).toBe(true)
  })
})

describe('katalog jenis', () => {
  it('memisahkan tipe sistem dan custom', () => {
    const custom = typeItem({
      id: '01JTYPE000000000000000002',
      household_id: 'h1',
      code: null,
      name: 'Asuransi',
      is_system: false
    })

    const groups = splitObligationTypes([typeItem(), custom])

    expect(groups.system.map(item => item.name)).toEqual(['Pajak Kendaraan'])
    expect(groups.custom.map(item => item.name)).toEqual(['Asuransi'])
  })

  it('opsi form membedakan Bawaan dan Custom', () => {
    const custom = typeItem({
      id: '01JTYPE000000000000000002',
      household_id: 'h1',
      code: null,
      name: 'Asuransi',
      is_system: false
    })

    expect(obligationTypeOptions([typeItem(), custom])).toEqual([
      { label: 'Pajak Kendaraan · Bawaan', value: '01JTYPE000000000000000001' },
      { label: 'Asuransi · Custom', value: '01JTYPE000000000000000002' }
    ])
  })
})
