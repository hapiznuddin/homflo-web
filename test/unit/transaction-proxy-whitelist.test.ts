import { describe, expect, it } from 'vitest'
import {
  pickTransactionCreateBody,
  TRANSACTION_CREATE_ALLOWED_KEYS
} from '../../server/utils/transactionBody'

// Kontrak whitelist POST transaksi (Phase 15.2.2): proxy Nuxt tidak
// pernah meneruskan body apa adanya — hanya field yang didukung
// StoreTransactionRequest. wallet_id (ULID posting) wajib lolos;
// destination_wallet_id (khusus transfer, fase 15.2.3) dan field
// internal server tidak boleh pernah diteruskan.

describe('TRANSACTION_CREATE_ALLOWED_KEYS', () => {
  it('mengizinkan wallet_id dan tidak mengizinkan destination_wallet_id', () => {
    expect(TRANSACTION_CREATE_ALLOWED_KEYS).toContain('wallet_id')
    expect(TRANSACTION_CREATE_ALLOWED_KEYS).not.toContain('destination_wallet_id')
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
  })

  it('membuang field internal, field asing, dan khusus transfer', () => {
    const body = pickTransactionCreateBody({
      household_id: 'h1',
      source_type: 'App\\Models\\Bill',
      source_id: 'b1',
      destination_wallet_id: '01J00000000000000000DEST01',
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
