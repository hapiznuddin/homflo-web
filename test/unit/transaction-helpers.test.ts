import { describe, expect, it } from 'vitest'
import {
  formatTransactionAmount,
  normalizeAmountInput
} from '../../app/utils/transactions'
import { readFieldErrors } from '../../app/composables/useApiError'
import { formatYmd } from '../../app/utils/format'

describe('normalizeAmountInput', () => {
  it('menerima digit polos dan desimal dot/koma', () => {
    expect(normalizeAmountInput('150000')).toBe('150000')
    expect(normalizeAmountInput('150000.50')).toBe('150000.50')
    expect(normalizeAmountInput('150000,50')).toBe('150000.50')
    expect(normalizeAmountInput('  2500,5  ')).toBe('2500.5')
  })

  it('menolak format yang bukan angka valid backend', () => {
    expect(normalizeAmountInput('')).toBeNull()
    expect(normalizeAmountInput('150.000')).toBeNull()
    expect(normalizeAmountInput('150000.555')).toBeNull()
    expect(normalizeAmountInput('abc')).toBeNull()
    expect(normalizeAmountInput('-500')).toBeNull()
    expect(normalizeAmountInput('12.5.6')).toBeNull()
  })
})

describe('formatTransactionAmount', () => {
  it('memformat string desimal backend sebagai Rupiah tanpa mengubah nilai', () => {
    expect(formatTransactionAmount('150000.50')).toContain('150.001')
    expect(formatTransactionAmount('685000.00')).toContain('685.000')
    expect(formatTransactionAmount('685000.00').startsWith('Rp')).toBe(true)
  })
})

describe('formatYmd', () => {
  it('memformat Y-m-d tanpa geser zona waktu', () => {
    expect(formatYmd('2026-10-05')).toBe('5 Okt 2026')
    expect(formatYmd('2026-01-01')).toBe('1 Jan 2026')
  })
})

describe('readFieldErrors', () => {
  it('mengambil peta errors terdalam dan menerjemahkan pesan pertama', () => {
    const err = {
      data: {
        data: {
          message: 'The given data was invalid.',
          errors: {
            amount: ['The amount must be a number.'],
            occurred_on: ['The occurred_on field is required.']
          }
        }
      }
    }

    expect(readFieldErrors(err)).toEqual({
      amount: 'Kolom nominal harus berupa angka.',
      occurred_on: 'Kolom tanggal wajib diisi.'
    })
  })

  it('mengembalikan objek kosong saat tidak ada field errors', () => {
    expect(readFieldErrors({ data: { data: { message: 'Unauthenticated.' } } })).toEqual({})
    expect(readFieldErrors(null)).toEqual({})
    expect(readFieldErrors('rusak')).toEqual({})
  })
})
