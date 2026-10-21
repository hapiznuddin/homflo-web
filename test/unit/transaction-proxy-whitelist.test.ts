import { describe, expect, it } from 'vitest'
import {
  pickTransactionCreateBody,
  pickTransactionUpdateBody,
  TRANSACTION_CREATE_ALLOWED_KEYS,
  TRANSACTION_UPDATE_ALLOWED_KEYS
} from '../../server/utils/transactionBody'

// Kontrak whitelist transaksi via proxy Nuxt (Phase 15.2.2 + 15.2.3):
// proxy TIDAK PERNAH meneruskan body apa adanya — hanya field yang
// didukung StoreTransactionRequest / UpdateTransactionRequest.
// destination_wallet_id ikut whitelist (khusus transfer) tetapi ATURAN
// per-tipe dipegang pemanggil (composable) dan dijaga backend
// (prohibited_unless / postingOf). Field internal server tidak boleh
// pernah diteruskan.

describe('TRANSACTION_CREATE_ALLOWED_KEYS', () => {
  it('mengizinkan wallet_id dan destination_wallet_id (khusus transfer)', () => {
    expect(TRANSACTION_CREATE_ALLOWED_KEYS).toContain('wallet_id')
    expect(TRANSACTION_CREATE_ALLOWED_KEYS).toContain('destination_wallet_id')
  })
})

describe('pickTransactionCreateBody', () => {
  it('meneruskan hanya field yang diizinkan, termasuk wallet_id', () => {
    const body = pickTransactionCreateBody({
      type: 'expense',
      category_id: 'c1',
      wallet_id: '01J00000000000000000WALLET1',
      amount: '50000',
      occurred_on: '2026-10-07',
      description: 'Kopi',
      wallet: 'Kas Tunai'
    })

    expect(body).toEqual({
      type: 'expense',
      category_id: 'c1',
      wallet_id: '01J00000000000000000WALLET1',
      amount: '50000',
      occurred_on: '2026-10-07',
      description: 'Kopi',
      wallet: 'Kas Tunai'
    })
    // Create non-transfer: composable tidak menyertakan key — whitelist
    // meneruskan key apa adanya, sehingga key absen tetap absen.
    expect(body).not.toHaveProperty('destination_wallet_id')
  })

  it('meneruskan destination_wallet_id bila disertakan (create transfer)', () => {
    const body = pickTransactionCreateBody({
      type: 'transfer',
      wallet_id: '01J00000000000000000WALLET1',
      destination_wallet_id: '01J00000000000000000DEST01',
      amount: '416250'
    })

    expect(body).toEqual({
      type: 'transfer',
      wallet_id: '01J00000000000000000WALLET1',
      destination_wallet_id: '01J00000000000000000DEST01',
      amount: '416250'
    })
  })

  it('membuang field internal dan field asing', () => {
    const body = pickTransactionCreateBody({
      household_id: 'h1',
      source_type: 'App\\Models\\Bill',
      source_id: 'b1',
      balance: '9999',
      bill_payment: { bill_id: 'b1' },
      evil: 'x',
      type: 'income',
      amount: '1000'
    })

    expect(body).toEqual({ type: 'income', amount: '1000' })
  })

  it('melewatkan value undefined dan menangani body null/kosong', () => {
    expect(pickTransactionCreateBody({ type: 'income', description: undefined }))
      .toEqual({ type: 'income' })
    expect(pickTransactionCreateBody(null)).toEqual({})
    expect(pickTransactionCreateBody(undefined)).toEqual({})
    expect(pickTransactionCreateBody({})).toEqual({})
  })

  it('mempertahankan value null (didukung backend: nullable)', () => {
    expect(pickTransactionCreateBody({ type: 'expense', category_id: null, description: null }))
      .toEqual({ type: 'expense', category_id: null, description: null })
  })
})

// Phase 15.2.3 — whitelist PATCH [id].patch.ts (UpdateTransactionRequest).
describe('TRANSACTION_UPDATE_ALLOWED_KEYS', () => {
  it('mencakup wallet_id dan destination_wallet_id', () => {
    expect(TRANSACTION_UPDATE_ALLOWED_KEYS).toEqual(TRANSACTION_CREATE_ALLOWED_KEYS)
    expect(TRANSACTION_UPDATE_ALLOWED_KEYS).toContain('wallet_id')
    expect(TRANSACTION_UPDATE_ALLOWED_KEYS).toContain('destination_wallet_id')
  })

  it('tidak pernah mengizinkan field internal — bukan pass-through', () => {
    for (const forbidden of ['household_id', 'source_type', 'source_id', 'balance', 'bill_payment']) {
      expect(TRANSACTION_UPDATE_ALLOWED_KEYS).not.toContain(forbidden)
    }
  })
})

describe('pickTransactionUpdateBody', () => {
  it('meneruskan destination_wallet_id null (konversi transfer→non-transfer)', () => {
    const body = pickTransactionUpdateBody({
      type: 'expense',
      wallet_id: '01J00000000000000000WALLET1',
      destination_wallet_id: null,
      category_id: null,
      amount: '200000'
    })

    // null HARUS diteruskan — key absen di Laravel berarti tujuan lama
    // terbawa (change() memakai array_key_exists) → 422 TRANSACTION_INVALID.
    expect(body).toEqual({
      type: 'expense',
      wallet_id: '01J00000000000000000WALLET1',
      destination_wallet_id: null,
      category_id: null,
      amount: '200000'
    })
  })

  it('meneruskan destination_wallet_id bertipe transfer dan membuang field internal', () => {
    const body = pickTransactionUpdateBody({
      type: 'transfer',
      wallet_id: '01J00000000000000000WALLET1',
      destination_wallet_id: '01J00000000000000000DEST01',
      category_id: null,
      household_id: 'h1',
      source_type: 'App\\Models\\Bill',
      evil: 'x'
    })

    expect(body).toEqual({
      type: 'transfer',
      wallet_id: '01J00000000000000000WALLET1',
      destination_wallet_id: '01J00000000000000000DEST01',
      category_id: null
    })
  })

  it('menangani body null/kosong dan melewatkan undefined', () => {
    expect(pickTransactionUpdateBody(null)).toEqual({})
    expect(pickTransactionUpdateBody(undefined)).toEqual({})
    expect(pickTransactionUpdateBody({})).toEqual({})
    expect(pickTransactionUpdateBody({ type: 'income', description: undefined }))
      .toEqual({ type: 'income' })
  })
})
