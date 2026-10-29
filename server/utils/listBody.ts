// Whitelist body Lists via proxy Nuxt. Browser TIDAK PERNAH meneruskan body
// apa adanya: hanya field yang didukung request backend yang diteruskan.
// household_id, list_id, created_by, completed_*, status, archived_at, dan
// timestamp adalah server-owned dan tidak pernah lolos dari boundary ini.

export const LIST_CREATE_ALLOWED_KEYS = ['name', 'type'] as const
export const LIST_UPDATE_ALLOWED_KEYS = ['name'] as const
export const LIST_ITEM_CREATE_ALLOWED_KEYS = ['title', 'quantity', 'unit', 'estimated_price'] as const
export const LIST_ITEM_UPDATE_ALLOWED_KEYS = [
  'title',
  'quantity',
  'unit',
  'estimated_price',
  'actual_price'
] as const
export const LIST_COMPLETE_ALLOWED_KEYS = ['actual_price'] as const
export const LIST_EXPENSE_ALLOWED_KEYS = ['wallet_id', 'category_id', 'occurred_on', 'actual_price'] as const

const NULLABLE_KEYS = new Set<string>([
  'quantity',
  'estimated_price',
  'actual_price',
  'category_id',
  'occurred_on'
])

function pick(
  raw: Record<string, unknown> | null | undefined,
  allowed: readonly string[]
): Record<string, unknown> {
  const body: Record<string, unknown> = {}

  for (const key of allowed) {
    const value = raw?.[key]

    if (value === undefined) {
      continue
    }

    // Form controls clear nullable columns with ''. The backend treats
    // these as an explicit null; unit is deliberately not normalized
    // here because Laravel's TrimStrings/ConvertEmptyStringsToNull is
    // the authoritative boundary (AMD-04).
    body[key] = NULLABLE_KEYS.has(key) && value === '' ? null : value
  }

  return body
}

export function pickListCreateBody(raw: Record<string, unknown> | null | undefined): Record<string, unknown> {
  return pick(raw, LIST_CREATE_ALLOWED_KEYS)
}

export function pickListUpdateBody(raw: Record<string, unknown> | null | undefined): Record<string, unknown> {
  return pick(raw, LIST_UPDATE_ALLOWED_KEYS)
}

export function pickListItemCreateBody(raw: Record<string, unknown> | null | undefined): Record<string, unknown> {
  return pick(raw, LIST_ITEM_CREATE_ALLOWED_KEYS)
}

export function pickListItemUpdateBody(raw: Record<string, unknown> | null | undefined): Record<string, unknown> {
  return pick(raw, LIST_ITEM_UPDATE_ALLOWED_KEYS)
}

/**
 * Completion accepts only actual_price. An empty form value is omitted so
 * an existing snapshot is preserved; callers that intend to clear it send
 * an explicit null (contract §12.4).
 */
export function pickListCompleteBody(raw: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const body: Record<string, unknown> = {}

  if (raw?.actual_price === undefined || raw.actual_price === '') {
    return body
  }

  body.actual_price = raw.actual_price

  return body
}

export function pickListExpenseBody(raw: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const body = pick(raw, LIST_EXPENSE_ALLOWED_KEYS)

  // wallet_id is optional in the current backend flow (it resolves the
  // household's active wallet when omitted); never forward an empty value.
  if (body.wallet_id === '') {
    delete body.wallet_id
  }

  return body
}
