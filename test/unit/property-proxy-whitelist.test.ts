import { describe, expect, it } from 'vitest'
import { PROPERTY_ALLOWED_KEYS, pickPropertyBody } from '../../server/utils/propertyBody'

// Kontrak whitelist Property via proxy Nuxt: proxy TIDAK PERNAH meneruskan
// body apa adanya — hanya field StorePropertyRequest/UpdatePropertyRequest.
// household_id, id, archived_at, dan timestamp tidak boleh dikirim browser;
// ownership dan lifecycle ditentukan backend.

describe('PROPERTY_ALLOWED_KEYS', () => {
  it('tepat memuat enam field kontrak dan tidak memuat field internal/lifecycle', () => {
    expect([...PROPERTY_ALLOWED_KEYS]).toEqual([
      'name',
      'type',
      'address',
      'description',
      'ownership_status',
      'notes'
    ])

    for (const forbidden of ['household_id', 'id', 'archived_at', 'created_at', 'updated_at']) {
      expect(PROPERTY_ALLOWED_KEYS).not.toContain(forbidden)
    }
  })
})

describe('pickPropertyBody', () => {
  it('menjatuhkan field internal/asing termasuk household_id, id, dan archived_at', () => {
    const body = pickPropertyBody({
      name: 'Rumah utama',
      type: 'house',
      address: 'Jl. Mawar 1',
      description: 'Rumah keluarga',
      ownership_status: 'owned',
      notes: 'Kunci di pos',
      household_id: 'h-evil',
      id: '01J0PROPERTY00000000000001',
      archived_at: '2026-10-01T00:00:00Z',
      created_at: '2026-10-01T00:00:00Z'
    })

    expect(body).toEqual({
      name: 'Rumah utama',
      type: 'house',
      address: 'Jl. Mawar 1',
      description: 'Rumah keluarga',
      ownership_status: 'owned',
      notes: 'Kunci di pos'
    })
    expect(body).not.toHaveProperty('household_id')
    expect(body).not.toHaveProperty('id')
    expect(body).not.toHaveProperty('archived_at')
    expect(body).not.toHaveProperty('created_at')
  })

  it('mengubah description/notes kosong menjadi null tetapi mempertahankan address kosong untuk validasi backend', () => {
    const body = pickPropertyBody({
      name: 'Rumah',
      type: 'house',
      address: '',
      description: '',
      ownership_status: 'owned',
      notes: ''
    })

    expect(body).toEqual({
      name: 'Rumah',
      type: 'house',
      address: '',
      description: null,
      ownership_status: 'owned',
      notes: null
    })
  })

  it('mempertahankan null eksplisit dan melewati key yang tidak disertakan', () => {
    const body = pickPropertyBody({ name: 'Tanah', description: null })

    expect(body).toEqual({ name: 'Tanah', description: null })
    expect(body).not.toHaveProperty('address')
    expect(body).not.toHaveProperty('ownership_status')
  })

  it('body null/kosong menghasilkan objek kosong', () => {
    expect(pickPropertyBody(null)).toEqual({})
    expect(pickPropertyBody(undefined)).toEqual({})
    expect(pickPropertyBody({})).toEqual({})
  })
})
