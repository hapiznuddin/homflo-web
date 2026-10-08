import { describe, expect, it } from 'vitest'
import {
  formatFullDate,
  formatMonthLabel,
  formatRupiah,
  formatShortDate,
  greetingForHour
} from '../../app/utils/format'

describe('formatRupiah', () => {
  it('memformat rupiah dengan pemisah ribuan id-ID dan prefix Rp', () => {
    const result = formatRupiah(15000000)

    expect(result).toContain('15.000.000')
    expect(result.startsWith('Rp')).toBe(true)
    expect(result).not.toContain('+')
    expect(result).not.toContain('-')
  })

  it('membulatkan tanpa desimal (maximumFractionDigits 0)', () => {
    expect(formatRupiah(1234.56)).not.toContain(',')
    expect(formatRupiah(0)).toContain('0')
    expect(formatRupiah(0)).not.toContain('+')
    expect(formatRupiah(0)).not.toContain('-')
  })

  it('mode unsigned mengabaikan tanda negatif (selalu nilai absolut)', () => {
    const result = formatRupiah(-45000)

    expect(result).toContain('45.000')
    expect(result).not.toContain('-')
  })

  it('mode signed menambahkan + untuk positif dan - untuk negatif', () => {
    expect(formatRupiah(3500000, true).startsWith('+')).toBe(true)
    expect(formatRupiah(-3500000, true).startsWith('-')).toBe(true)
    expect(formatRupiah(3500000, true)).toContain('3.500.000')
  })

  it('mode signed tetap tanpa tanda pada nol', () => {
    const result = formatRupiah(0, true)

    expect(result).not.toContain('+')
    expect(result).not.toContain('-')
    expect(result).toContain('0')
  })
})

describe('formatMonthLabel', () => {
  it('merender nama bulan panjang dan tahun sesuai locale id-ID', () => {
    expect(formatMonthLabel(2026, 10)).toBe('Oktober 2026')
    expect(formatMonthLabel(2026, 1)).toBe('Januari 2026')
  })
})

describe('formatShortDate', () => {
  it('merender tanggal bulan pendek id-ID', () => {
    const result = formatShortDate(new Date(2026, 9, 5, 12))

    expect(result).toContain('5')
    expect(result).toContain('Okt')
  })
})

describe('formatFullDate', () => {
  it('merender tanggal lengkap dengan tahun id-ID', () => {
    const result = formatFullDate(new Date(2026, 9, 5, 12))

    expect(result).toContain('5')
    expect(result).toContain('Okt')
    expect(result).toContain('2026')
  })
})

describe('greetingForHour', () => {
  it('membagi batas pagi/siang/sore/malam dengan benar', () => {
    const cases: Array<[number, string]> = [
      [0, 'Selamat pagi'],
      [10, 'Selamat pagi'],
      [11, 'Selamat siang'],
      [14, 'Selamat siang'],
      [15, 'Selamat sore'],
      [18, 'Selamat sore'],
      [19, 'Selamat malam'],
      [23, 'Selamat malam']
    ]

    for (const [hour, expected] of cases) {
      expect(greetingForHour(hour)).toBe(expected)
    }
  })
})
