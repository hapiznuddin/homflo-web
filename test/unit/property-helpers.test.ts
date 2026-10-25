import { describe, expect, it } from 'vitest'
import {
  isPropertyArchived,
  propertyOwnershipLabel,
  propertyTypeLabel
} from '../../app/utils/properties'

describe('property helpers', () => {
  it('memetakan enum tipe dan ownership ke label UI', () => {
    expect(propertyTypeLabel('house')).toBe('Rumah')
    expect(propertyTypeLabel('apartment')).toBe('Apartemen')
    expect(propertyTypeLabel('land')).toBe('Tanah')
    expect(propertyTypeLabel('shophouse')).toBe('Ruko')
    expect(propertyTypeLabel('other')).toBe('Lainnya')
    expect(propertyOwnershipLabel('owned')).toBe('Milik sendiri')
    expect(propertyOwnershipLabel('rented')).toBe('Disewa')
  })

  it('menjaga nilai tak dikenal/null tetap jujur, bukan menebak', () => {
    expect(propertyTypeLabel('unknown')).toBe('unknown')
    expect(propertyTypeLabel(null)).toBe('—')
    expect(propertyOwnershipLabel(undefined)).toBe('—')
  })

  it('menganggap arsip hanya bila archived_at terisi', () => {
    expect(isPropertyArchived(null)).toBe(false)
    expect(isPropertyArchived({ archived_at: null })).toBe(false)
    expect(isPropertyArchived({ archived_at: '2026-10-01T00:00:00Z' })).toBe(true)
  })
})
