import type { AssetPropertySummary } from '~/types/assets'

// Sentinel form untuk relasi opsional. Reka UI menolak SelectItem dengan
// value string kosong, jadi "Tanpa properti" memakai nilai eksplisit.
export const ASSET_NO_PROPERTY = 'none'

export const ASSET_WITHOUT_PROPERTY_LABEL = 'Tanpa properti'

/** Nama Property untuk list/detail; UUID tidak pernah dipakai sebagai label. */
export function assetPropertyLabel(property: AssetPropertySummary | null | undefined): string {
  return property?.name ?? ASSET_WITHOUT_PROPERTY_LABEL
}

export function isAssetPropertyArchived(
  property: AssetPropertySummary | null | undefined
): boolean {
  return property?.archived_at != null
}
