import { describe, expect, it } from 'vitest'
import { readError, readErrorCode, translateMessage } from '../../app/composables/useApiError'

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

  // Phase 15.2.3 — konversi tipe/payload transfer yang ditolak backend
  // (CategoryTypeMismatch/InvalidTransfer) keluar sebagai TRANSACTION_INVALID.
  it('memetakan TRANSACTION_INVALID ke pesan Indonesia', () => {
    expect(
      readError({ data: { data: { success: false, error: { code: 'TRANSACTION_INVALID' } } } }, 'x')
    ).toBe('Transaksi tidak valid. Periksa jenis, kategori, dan dompet.')
  })

  it('memetakan label destination_wallet_id (dompet tujuan)', () => {
    expect(translateMessage('The destination_wallet_id field is required.')).toBe(
      'Kolom dompet tujuan wajib diisi.'
    )
    expect(translateMessage('The destination wallet id and wallet id must be different.')).toBe(
      'The destination wallet id and wallet id must be different.'
    )
  })

  it('memetakan ASSET_NOT_FOUND dan label field aset', () => {
    expect(
      readError({ data: { data: { success: false, error: { code: 'ASSET_NOT_FOUND' } } } }, 'x')
    ).toBe('Aset tidak ditemukan.')
    expect(translateMessage('The acquired_on does not match the format Y-m-d.')).toBe(
      'Kolom tanggal perolehan harus berformat Y-m-d.'
    )
    expect(translateMessage('The acquisition_cost must be a number.')).toBe(
      'Kolom biaya perolehan harus berupa angka.'
    )
    expect(translateMessage('The location must not be greater than 255 characters.')).toBe(
      'Kolom lokasi maksimal 255 karakter.'
    )
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

describe('readError/readErrorCode kode kendaraan (Phase 16.4.2)', () => {
  it('memetakan kode domain kendaraan ke pesan Indonesia', () => {
    expect(
      readError({ data: { data: { success: false, error: { code: 'VEHICLE_NOT_FOUND' } } } }, 'x')
    ).toBe('Kendaraan tidak ditemukan.')
    expect(
      readError({ data: { data: { success: false, error: { code: 'VEHICLE_PLATE_ALREADY_EXISTS' } } } }, 'x')
    ).toBe('Plat nomor tersebut sudah dipakai kendaraan lain di rumah tangga ini.')
    expect(
      readError({ data: { data: { success: false, error: { code: 'VEHICLE_ODOMETER_BELOW_RECORDED' } } } }, 'x')
    ).toBe('Odometer tidak boleh lebih rendah dari catatan servis terakhir.')
    expect(
      readError({ data: { data: { success: false, error: { code: 'VEHICLE_HAS_MAINTENANCE_HISTORY' } } } }, 'x')
    ).toBe('Kendaraan tidak dapat dihapus karena masih memiliki riwayat servis.')
  })

  it('readErrorCode membaca kode dari envelope bersarang Nitro', () => {
    expect(
      readErrorCode({ data: { data: { success: false, error: { code: 'VEHICLE_HAS_MAINTENANCE_HISTORY' } } } })
    ).toBe('VEHICLE_HAS_MAINTENANCE_HISTORY')
    expect(readErrorCode({ statusCode: 500, data: { message: 'Server error.' } })).toBeNull()
    expect(readErrorCode(null)).toBeNull()
  })

  it('memetakan label field kendaraan', () => {
    expect(translateMessage('The plate_number must not be greater than 32 characters.')).toBe(
      'Kolom plat nomor maksimal 32 karakter.'
    )
    expect(translateMessage('The odometer must be an integer.')).toBe(
      'Kolom odometer harus berupa bilangan bulat.'
    )
    expect(translateMessage('The brand must not be greater than 255 characters.')).toBe(
      'Kolom merek maksimal 255 karakter.'
    )
    expect(translateMessage('The model must not be greater than 255 characters.')).toBe(
      'Kolom model maksimal 255 karakter.'
    )
    expect(
      translateMessage('The service odometer must not be greater than the vehicle odometer.')
    ).toBe('Odometer servis tidak boleh melebihi odometer kendaraan saat ini.')
  })
})
