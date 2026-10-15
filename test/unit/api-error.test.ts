import { describe, expect, it } from 'vitest'
import { readError, translateMessage } from '../../app/composables/useApiError'

// Mengunci perilaku existing sekaligus pola baru untuk form transaksi.
// Seluruh penambahan di useApiError bersifat aditif.
describe('translateMessage', () => {
  it('memetakan pesan auth existing tanpa berubah', () => {
    expect(translateMessage('Unauthenticated.')).toBe('Sesi berakhir. Silakan login kembali.')
    expect(translateMessage('These credentials do not match our records.')).toBe('Email atau kata sandi salah.')
  })

  it('memetakan pesan numerik Laravel ke Indonesia', () => {
    expect(translateMessage('The amount must be a number.')).toBe('Kolom nominal harus berupa angka.')
    expect(translateMessage('The amount must be at least 0.')).toBe('Kolom nominal minimal 0.')
    expect(translateMessage('The amount may not be greater than 9999999999999.99.')).toBe(
      'Kolom nominal maksimal 9999999999999.99.'
    )
  })

  it('memetakan format tanggal, ULID, integer, dan perbandingan tanggal', () => {
    expect(translateMessage('The occurred_on does not match the format Y-m-d.')).toBe(
      'Kolom tanggal harus berformat Y-m-d.'
    )
    expect(translateMessage('The category_id must be a valid ULID.')).toBe(
      'Kolom kategori harus berupa ID yang valid.'
    )
    expect(translateMessage('The per_page must be an integer.')).toBe(
      'Kolom jumlah per halaman harus berupa bilangan bulat.'
    )
    expect(translateMessage('The date_to must be a date after or equal to date_from.')).toBe(
      'Kolom tanggal akhir tidak boleh mendahului tanggal mulai.'
    )
  })

  it('memetakan label field transaksi (type, wallet, description)', () => {
    expect(translateMessage('The type field is required.')).toBe('Kolom jenis wajib diisi.')
    expect(translateMessage('The selected type is invalid.')).toBe('jenis yang dipilih tidak valid.')
    expect(translateMessage('The wallet must not be greater than 100 characters.')).toBe(
      'Kolom dompet maksimal 100 karakter.'
    )
  })

  it('melewatkan pesan tak dikenal apa adanya', () => {
    expect(translateMessage('Something else happened.')).toBe('Something else happened.')
  })
})

describe('readError kode transaksi', () => {
  it('memetakan TRANSACTION_NOT_FOUND dan CATEGORY_NOT_FOUND', () => {
    expect(
      readError({ data: { data: { success: false, error: { code: 'TRANSACTION_NOT_FOUND' } } } }, 'x')
    ).toBe('Transaksi tidak ditemukan.')
    expect(
      readError({ data: { data: { success: false, error: { code: 'CATEGORY_NOT_FOUND' } } } }, 'x')
    ).toBe('Kategori tidak ditemukan.')
  })

  it('memetakan BUDGET_NOT_FOUND dan BUDGET_ALREADY_EXISTS', () => {
    expect(
      readError({ data: { data: { success: false, error: { code: 'BUDGET_NOT_FOUND' } } } }, 'x')
    ).toBe('Anggaran tidak ditemukan.')
    expect(
      readError({ data: { data: { success: false, error: { code: 'BUDGET_ALREADY_EXISTS' } } } }, 'x')
    ).toBe('Anggaran untuk kategori dan periode tersebut sudah ada.')
  })

  it('mengambil field error pertama saat kode tak dikenal', () => {
    const err = {
      data: {
        data: {
          message: 'The amount must be a number. (and 1 more error)',
          errors: { amount: ['The amount must be a number.'] }
        }
      }
    }

    expect(readError(err, 'fallback')).toBe('Kolom nominal harus berupa angka.')
  })
})
