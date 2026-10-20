import { describe, expect, it } from 'vitest'
import {
  BILL_FREQUENCY_OPTIONS,
  BILL_UI_STATUS_LABELS,
  billStatusChipClass,
  billUiStatus,
  frequencyLabel
} from '../../app/utils/bills'

// Helper murni Bills: SEMUA fungsi di sini hanya memilih label/kelas dari
// field backend (is_active/status/overdue) — tanpa aritmetika uang dan
// tanpa jam browser. Urutan prioritas: arsip > lunas > terlambat > biasa.

describe('bills helpers', () => {
  it('frequencyLabel memetakan empat frekuensi MVP', () => {
    expect(frequencyLabel('monthly')).toBe('Bulanan')
    expect(frequencyLabel('quarterly')).toBe('Triwulanan')
    expect(frequencyLabel('semiannual')).toBe('Semesteran')
    expect(frequencyLabel('yearly')).toBe('Tahunan')
  })

  it('BILL_FREQUENCY_OPTIONS berisi tepat empat nilai kontrak backend', () => {
    expect(BILL_FREQUENCY_OPTIONS.map(option => option.value)).toEqual([
      'monthly',
      'quarterly',
      'semiannual',
      'yearly'
    ])
  })

  it('billUiStatus memilih status tampilan sepenuhnya dari field backend', () => {
    expect(billUiStatus({ is_active: true, status: 'unpaid', overdue: false })).toBe('unpaid')
    expect(billUiStatus({ is_active: true, status: 'unpaid', overdue: true })).toBe('overdue')
    expect(billUiStatus({ is_active: true, status: 'paid', overdue: false })).toBe('paid')
    // Prioritas: arsip menang atas lunas/terlambat (field is_active backend).
    expect(billUiStatus({ is_active: false, status: 'paid', overdue: false })).toBe('archived')
    expect(billUiStatus({ is_active: false, status: 'unpaid', overdue: true })).toBe('archived')
    // Lunas menang atas overdue (kombinasi yang valid menurut kontrak).
    expect(billUiStatus({ is_active: true, status: 'paid', overdue: true })).toBe('paid')
  })

  it('BILL_UI_STATUS_LABELS melabeli setiap status', () => {
    expect(Object.keys(BILL_UI_STATUS_LABELS).sort()).toEqual(['archived', 'overdue', 'paid', 'unpaid'])
    expect(BILL_UI_STATUS_LABELS.paid).toBe('Lunas')
    expect(BILL_UI_STATUS_LABELS.archived).toBe('Diarsipkan')
  })

  it('billStatusChipClass konsisten dan berbeda antar status', () => {
    const paid = billStatusChipClass('paid')
    const overdue = billStatusChipClass('overdue')
    const unpaid = billStatusChipClass('unpaid')
    const archived = billStatusChipClass('archived')

    expect(paid).toContain('emerald')
    expect(overdue).toContain('rose')
    expect(unpaid).toContain('amber')
    expect(archived).toContain('stone')
    expect(new Set([paid, overdue, unpaid, archived]).size).toBe(4)
  })
})
