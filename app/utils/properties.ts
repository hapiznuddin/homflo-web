import type { PropertyItem, PropertyOwnershipStatus, PropertyType } from '~/types/properties'

// Label UI Property dipusatkan di satu tempat agar list, detail, dan form
// memakai istilah yang sama. Nilai API tidak pernah diubah di sini.
export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  house: 'Rumah',
  apartment: 'Apartemen',
  land: 'Tanah',
  shophouse: 'Ruko',
  other: 'Lainnya'
}

export const PROPERTY_OWNERSHIP_LABELS: Record<PropertyOwnershipStatus, string> = {
  owned: 'Milik sendiri',
  rented: 'Disewa'
}

export const PROPERTY_TYPE_OPTIONS: Array<{ label: string, value: PropertyType }> = [
  { label: PROPERTY_TYPE_LABELS.house, value: 'house' },
  { label: PROPERTY_TYPE_LABELS.apartment, value: 'apartment' },
  { label: PROPERTY_TYPE_LABELS.land, value: 'land' },
  { label: PROPERTY_TYPE_LABELS.shophouse, value: 'shophouse' },
  { label: PROPERTY_TYPE_LABELS.other, value: 'other' }
]

export const PROPERTY_OWNERSHIP_OPTIONS: Array<{ label: string, value: PropertyOwnershipStatus }> = [
  { label: PROPERTY_OWNERSHIP_LABELS.owned, value: 'owned' },
  { label: PROPERTY_OWNERSHIP_LABELS.rented, value: 'rented' }
]

export function propertyTypeLabel(type: PropertyType | string | null | undefined): string {
  if (!type) {
    return '—'
  }

  return PROPERTY_TYPE_LABELS[type as PropertyType] ?? type
}

export function propertyOwnershipLabel(
  status: PropertyOwnershipStatus | string | null | undefined
): string {
  if (!status) {
    return '—'
  }

  return PROPERTY_OWNERSHIP_LABELS[status as PropertyOwnershipStatus] ?? status
}

export function isPropertyArchived(property: Pick<PropertyItem, 'archived_at'> | null | undefined): boolean {
  return property?.archived_at != null
}
