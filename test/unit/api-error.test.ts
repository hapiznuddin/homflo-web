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

describe('readError/readErrorCode kode property (Phase 16.5.4.1)', () => {
  it('memetakan PROPERTY_NOT_FOUND dan PROPERTY_ARCHIVED', () => {
    expect(
      readError({ data: { data: { success: false, error: { code: 'PROPERTY_NOT_FOUND' } } } }, 'x')
    ).toBe('Properti tidak ditemukan.')
    expect(
      readError({ data: { data: { success: false, error: { code: 'PROPERTY_ARCHIVED' } } } }, 'x')
    ).toBe('Properti sudah diarsipkan. Pulihkan terlebih dahulu sebelum mengubahnya.')
  })

  it('readErrorCode membaca kode PROPERTY_ARCHIVED dari envelope 409 Nitro', () => {
    expect(
      readErrorCode({ statusCode: 409, data: { data: { success: false, error: { code: 'PROPERTY_ARCHIVED' } } } })
    ).toBe('PROPERTY_ARCHIVED')
  })

  it('memetakan label field property', () => {
    expect(translateMessage('The address field is required.')).toBe('Kolom alamat wajib diisi.')
    expect(translateMessage('The ownership_status field is required.')).toBe(
      'Kolom status kepemilikan wajib diisi.'
    )
    expect(translateMessage('The property_id must be a valid ULID.')).toBe(
      'Kolom properti harus berupa ID yang valid.'
    )
  })
})

describe('readError/readErrorCode kode Lists (Phase 3 item CRUD)', () => {
  it('memetakan semua kode domain List ke pesan Indonesia', () => {
    const cases: Array<[string, string]> = [
      ['LIST_ARCHIVED', 'List sudah diarsipkan; item tidak dapat diubah.'],
      ['LIST_NOT_FOUND', 'List tidak ditemukan.'],
      ['LIST_ITEM_NOT_FOUND', 'Item list tidak ditemukan.'],
      ['LIST_ITEM_HAS_EXPENSE', 'Item sudah memiliki Expense sehingga tidak dapat dihapus.'],
      ['LIST_ITEM_ALREADY_COMPLETED', 'Item sudah completed.'],
      ['LIST_ITEM_NOT_COMPLETED', 'Item belum completed.'],
      ['LIST_ITEM_PRICE_LOCKED', 'Harga aktual terkunci karena Expense sudah dibuat.'],
      ['LIST_ITEM_ACTUAL_PRICE_REQUIRED', 'Harga aktual wajib diisi dan lebih dari 0.'],
      ['LIST_EXPENSE_LOCKED', 'Expense dari item list tidak dapat diubah atau dihapus.'],
      ['DEFAULT_LIST_REQUIRED', 'Rumah tangga ini belum memiliki default list.']
    ]

    for (const [code, expected] of cases) {
      expect(readError({ data: { data: { success: false, error: { code } } } }, 'x')).toBe(expected)
      expect(readErrorCode({ data: { data: { success: false, error: { code } } } })).toBe(code)
    }
  })

  it('memetakan label field item list', () => {
    expect(translateMessage('The quantity must be a number.')).toBe('Kolom jumlah harus berupa angka.')
    expect(translateMessage('The unit field is required.')).toBe('Kolom satuan wajib diisi.')
    expect(translateMessage('The estimated_price must be a number.')).toBe('Kolom harga perkiraan harus berupa angka.')
    expect(translateMessage('The actual_price must be a number.')).toBe('Kolom harga aktual harus berupa angka.')
    expect(translateMessage('The title field is required.')).toBe('Kolom judul wajib diisi.')
    expect(translateMessage('The wallet_id field is required.')).toBe('Kolom dompet wajib diisi.')
  })

  it('tetap memetakan kode integrasi Expense (kategori, dompet, saldo)', () => {
    expect(
      readError({ data: { data: { success: false, error: { code: 'CATEGORY_TYPE_MISMATCH' } } } }, 'x')
    ).toBe('Kategori harus berjenis pengeluaran.')
    expect(
      readError({ data: { data: { success: false, error: { code: 'WALLET_NOT_FOUND' } } } }, 'x')
    ).toBe('Dompet tidak ditemukan atau tidak aktif.')
    expect(
      readError({ data: { data: { success: false, error: { code: 'INSUFFICIENT_FUNDS' } } } }, 'x')
    ).toBe('Saldo dompet tidak cukup.')
  })
})
