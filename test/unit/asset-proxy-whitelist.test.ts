import { describe, expect, it } from 'vitest'
import { ASSET_ALLOWED_KEYS, pickAssetBody } from '../../server/utils/assetBody'

// Kontrak whitelist aset via proxy Nuxt (Phase 16.2): proxy TIDAK PERNAH
// meneruskan body apa adanya — hanya field StoreAssetRequest /
// UpdateAssetRequest. household_id bukan field yang boleh dikirim dari
// browser; ownership ditentukan session backend.

describe('ASSET_ALLOWED_KEYS', () => {
  it('tepat memuat enam field kontrak dan tidak memuat household_id', () => {
    expect([...ASSET_ALLOWED_KEYS]).toEqual([
      'name',
      'description',
      'location',
      'acquired_on',
      'acquisition_cost',
      'property_id'
    ])
    expect(ASSET_ALLOWED_KEYS).not.toContain('household_id')
    expect(ASSET_ALLOWED_KEYS).not.toContain('property')
  })
})

describe('pickAssetBody', () => {
  it('menjatuhkan field internal/asing termasuk household_id dan id', () => {
    const body = pickAssetBody({
      name: 'Kulkas',
      description: 'Dua pintu',
      location: 'Dapur',
      acquired_on: '2026-01-15',
      acquisition_cost: '4500000',
      property_id: '01J0PROPERTY00000000000001',
      household_id: 'h-evil',
      id: '01J0ASSET0000000000000001',
      created_at: '2026-01-15T00:00:00Z',
      property: {
        id: '01J0PROPERTY00000000000001',
        name: 'Rumah utama',
        archived_at: null
      }
    })

    expect(body).toEqual({
      name: 'Kulkas',
      description: 'Dua pintu',
      location: 'Dapur',
      acquired_on: '2026-01-15',
      acquisition_cost: '4500000',
      property_id: '01J0PROPERTY00000000000001'
    })
    expect(body).not.toHaveProperty('household_id')
    expect(body).not.toHaveProperty('id')
    expect(body).not.toHaveProperty('created_at')
    // Nested summary adalah field response server-owned, bukan payload.
    expect(body).not.toHaveProperty('property')
  })

  it('mengubah string kosong pada kolom nullable menjadi null eksplisit', () => {
    const body = pickAssetBody({
      name: 'Sofa',
      description: '',
      location: '',
      acquired_on: '',
      acquisition_cost: '',
      property_id: ''
    })

    expect(body).toEqual({
      name: 'Sofa',
      description: null,
      location: null,
      acquired_on: null,
      acquisition_cost: null,
      property_id: null
    })
  })

  it('mempertahankan null eksplisit dan melewati key yang tidak disertakan', () => {
    const body = pickAssetBody({ name: 'Lemari', description: null, property_id: null })

    expect(body).toEqual({ name: 'Lemari', description: null, property_id: null })
    expect(body).not.toHaveProperty('location')
  })

  it('body null/kosong menghasilkan objek kosong', () => {
    expect(pickAssetBody(null)).toEqual({})
    expect(pickAssetBody(undefined)).toEqual({})
    expect(pickAssetBody({})).toEqual({})
  })
})
