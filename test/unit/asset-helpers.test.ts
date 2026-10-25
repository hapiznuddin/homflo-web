import { describe, expect, it } from 'vitest'
import {
  ASSET_NO_PROPERTY,
  ASSET_WITHOUT_PROPERTY_LABEL,
  assetPropertyLabel,
  isAssetPropertyArchived
} from '../../app/utils/assets'

describe('asset property helpers', () => {
  it('memakai sentinel none dan label "Tanpa properti" yang konsisten', () => {
    expect(ASSET_NO_PROPERTY).toBe('none')
    expect(assetPropertyLabel(null)).toBe(ASSET_WITHOUT_PROPERTY_LABEL)
    expect(assetPropertyLabel(undefined)).toBe('Tanpa properti')
  })

  it('menampilkan nama Property tanpa UUID dan mendeteksi arsip', () => {
    const active = { id: '01J0PROPERTY00000000000001', name: 'Rumah utama', archived_at: null }
    const archived = {
      ...active,
      id: '01J0PROPERTY00000000000002',
      archived_at: '2026-10-01T00:00:00Z'
    }

    expect(assetPropertyLabel(active)).toBe('Rumah utama')
    expect(assetPropertyLabel(archived)).toBe('Rumah utama')
    expect(isAssetPropertyArchived(active)).toBe(false)
    expect(isAssetPropertyArchived(archived)).toBe(true)
    expect(isAssetPropertyArchived(null)).toBe(false)
  })
})
