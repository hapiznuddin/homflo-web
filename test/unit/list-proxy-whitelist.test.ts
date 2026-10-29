import { describe, expect, it } from 'vitest'
import {
  LIST_COMPLETE_ALLOWED_KEYS,
  LIST_CREATE_ALLOWED_KEYS,
  LIST_EXPENSE_ALLOWED_KEYS,
  LIST_ITEM_CREATE_ALLOWED_KEYS,
  LIST_ITEM_UPDATE_ALLOWED_KEYS,
  LIST_UPDATE_ALLOWED_KEYS,
  pickListCompleteBody,
  pickListCreateBody,
  pickListExpenseBody,
  pickListItemCreateBody,
  pickListItemUpdateBody,
  pickListUpdateBody
} from '../../server/utils/listBody'

// Kontrak whitelist Lists via proxy Nuxt (Phase 16.6.9): browser tidak
// pernah meneruskan body apa adanya. household_id, list_id, created_by,
// completed_*, status, archived_at, dan timestamp harus selalu dibuang.

describe('Lists whitelist keys', () => {
  it('matches the backend request contracts and excludes server-owned fields', () => {
    expect([...LIST_CREATE_ALLOWED_KEYS]).toEqual(['name', 'type'])
    expect([...LIST_UPDATE_ALLOWED_KEYS]).toEqual(['name'])
    expect([...LIST_ITEM_CREATE_ALLOWED_KEYS]).toEqual(['title', 'quantity', 'unit', 'estimated_price'])
    expect([...LIST_ITEM_UPDATE_ALLOWED_KEYS]).toEqual([
      'title',
      'quantity',
      'unit',
      'estimated_price',
      'actual_price'
    ])
    expect([...LIST_COMPLETE_ALLOWED_KEYS]).toEqual(['actual_price'])
    expect([...LIST_EXPENSE_ALLOWED_KEYS]).toEqual([
      'wallet_id',
      'category_id',
      'occurred_on',
      'actual_price'
    ])

    for (const keys of [
      LIST_CREATE_ALLOWED_KEYS,
      LIST_UPDATE_ALLOWED_KEYS,
      LIST_ITEM_CREATE_ALLOWED_KEYS,
      LIST_ITEM_UPDATE_ALLOWED_KEYS,
      LIST_COMPLETE_ALLOWED_KEYS,
      LIST_EXPENSE_ALLOWED_KEYS
    ]) {
      expect(keys).not.toContain('household_id')
      expect(keys).not.toContain('list_id')
      expect(keys).not.toContain('created_by')
      expect(keys).not.toContain('completed_at')
      expect(keys).not.toContain('completed_by')
      expect(keys).not.toContain('status')
      expect(keys).not.toContain('archived_at')
    }
  })
})

describe('pickListCreateBody', () => {
  it('keeps name/type and drops household and lifecycle fields', () => {
    expect(pickListCreateBody({
      name: 'Belanja',
      type: 'shopping',
      household_id: 'h1',
      created_by: 'u1',
      is_default: true,
      archived_at: null
    })).toEqual({ name: 'Belanja', type: 'shopping' })
  })
})

describe('pickListUpdateBody', () => {
  it('only forwards name; type is immutable', () => {
    expect(pickListUpdateBody({ name: 'Baru', type: 'custom', id: 'l1' }))
      .toEqual({ name: 'Baru' })
  })
})

describe('pickListItemCreateBody', () => {
  it('keeps item fields and turns cleared numerics into null', () => {
    expect(pickListItemCreateBody({
      title: 'Sabun',
      quantity: '',
      unit: 'pcs',
      estimated_price: '',
      actual_price: '999',
      list_id: 'l1',
      created_by: 'u1'
    })).toEqual({
      title: 'Sabun',
      quantity: null,
      unit: 'pcs',
      estimated_price: null
    })
  })

  it('does not normalize unit (Laravel TrimStrings is authoritative)', () => {
    expect(pickListItemCreateBody({ title: 'Sabun', unit: '' }))
      .toEqual({ title: 'Sabun', unit: '' })
  })
})

describe('pickListItemUpdateBody', () => {
  it('allows actual_price but still drops lifecycle fields', () => {
    expect(pickListItemUpdateBody({
      title: 'Sabun',
      actual_price: '12500',
      status: 'completed',
      completed_at: '2026-10-29T00:00:00Z'
    })).toEqual({ title: 'Sabun', actual_price: '12500' })
  })
})

describe('pickListCompleteBody', () => {
  it('omits an empty form value so the snapshot is preserved', () => {
    expect(pickListCompleteBody({ actual_price: '' })).toEqual({})
    expect(pickListCompleteBody({})).toEqual({})
    expect(pickListCompleteBody(null)).toEqual({})
  })

  it('forwards an explicit null or a real price', () => {
    expect(pickListCompleteBody({ actual_price: null })).toEqual({ actual_price: null })
    expect(pickListCompleteBody({ actual_price: '12500.00' }))
      .toEqual({ actual_price: '12500.00' })
  })

  it('drops every other field', () => {
    expect(pickListCompleteBody({
      actual_price: '1',
      completed_by: 'u1',
      completed_at: 'x',
      status: 'completed'
    })).toEqual({ actual_price: '1' })
  })
})

describe('pickListExpenseBody', () => {
  it('forwards the expense contract fields and drops server-owned money fields', () => {
    expect(pickListExpenseBody({
      wallet_id: 'w1',
      category_id: 'c1',
      occurred_on: '2026-10-29',
      actual_price: '100',
      type: 'expense',
      amount: '100',
      description: 'evil',
      source_type: 'App\\Models\\ListItem',
      source_id: 'i1',
      household_id: 'h1'
    })).toEqual({
      wallet_id: 'w1',
      category_id: 'c1',
      occurred_on: '2026-10-29',
      actual_price: '100'
    })
  })

  it('normalizes cleared nullable fields and omits an empty wallet', () => {
    expect(pickListExpenseBody({
      wallet_id: '',
      category_id: '',
      occurred_on: '',
      actual_price: ''
    })).toEqual({
      category_id: null,
      occurred_on: null,
      actual_price: null
    })
  })
})
