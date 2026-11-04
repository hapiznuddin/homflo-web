// Central household scope guard.
//
// The active household is server-owned state. When it changes, every cached
// household-scoped value must be discarded and any response that started
// under the previous household must be ignored. Composables capture
// `token()` before a request and only write state when `isCurrent(token)`
// still holds afterwards.

const HOUSEHOLD_STATE_KEYS = [
  'dashboard-period',
  'dashboard-data',
  'dashboard-pending',
  'dashboard-error',
  'dashboard-inflight',
  'dashboard-request-seq',

  'wallets-items',
  'wallets-pending',
  'wallets-error',
  'wallets-inflight',
  'wallets-request-seq',

  'transactions-items',
  'transactions-meta',
  'transactions-filters',
  'transactions-pending',
  'transactions-submitting',
  'transactions-error',
  'transactions-field-errors',
  'transactions-inflight',
  'transactions-request-seq',

  'bills-items',
  'bills-filters',
  'bills-pending',
  'bills-submitting',
  'bills-error',
  'bills-field-errors',
  'bills-inflight',
  'bills-request-seq',

  'budgets-items',
  'budgets-period',
  'budgets-pending',
  'budgets-submitting',
  'budgets-error',
  'budgets-field-errors',
  'budgets-inflight',
  'budgets-request-seq',

  'lists-items',
  'lists-selected',
  'lists-item-selected',
  'lists-pending',
  'lists-submitting',
  'lists-error',
  'lists-error-code',
  'lists-field-errors',
  'lists-filters',
  'lists-default',
  'lists-items-detail',
  'lists-inflight',
  'lists-request-seq',

  'categories-items',
  'categories-pending',
  'categories-submitting',
  'categories-error',
  'categories-field-errors',
  'categories-inflight',
  'categories-loaded',
  'categories-request-seq',

  'assets-items',
  'assets-pending',
  'assets-submitting',
  'assets-error',
  'assets-field-errors',
  'assets-inflight',
  'assets-request-seq',

  'properties-items',
  'properties-filters',
  'properties-pending',
  'properties-submitting',
  'properties-error',
  'properties-error-code',
  'properties-field-errors',
  'properties-inflight',
  'properties-request-seq',
  'properties-scope',
  'properties-scope-epoch',

  'vehicles-items',
  'vehicles-pending',
  'vehicles-submitting',
  'vehicles-error',
  'vehicles-error-code',
  'vehicles-field-errors',
  'vehicles-inflight',
  'vehicles-request-seq',
  'vehicles-scope',
  'vehicles-scope-epoch',

  'maintenance-items',
  'maintenance-pending',
  'maintenance-submitting',
  'maintenance-error',
  'maintenance-field-errors',
  'maintenance-inflight',
  'maintenance-request-seq',

  'obligation-types-items',
  'obligation-types-pending',
  'obligation-types-submitting',
  'obligation-types-error',
  'obligation-types-error-code',
  'obligation-types-field-errors',
  'obligation-types-inflight',
  'obligation-types-request-seq',
  'obligation-types-scope',
  'obligation-types-scope-epoch',

  'household-members-items',
  'household-members-pending',
  'household-members-submitting',
  'household-members-error',
  'household-members-invite-field-errors',
  'household-members-inflight',
  'household-members-loaded',
  'household-members-loaded-for',

  'household-pending-invitations-items',
  'household-pending-invitations-pending',
  'household-pending-invitations-submitting',
  'household-pending-invitations-error',
  'household-pending-invitations-inflight',
  'household-pending-invitations-loaded',
  'household-pending-invitations-loaded-for',

  'vehicle-maintenance-store',
  'vehicle-obligations-store',
  'vehicle-overview-services',
  'vehicle-overview-obligations'
] as const

export function useHouseholdScope() {
  const auth = useAuth()
  const scope = useState<string | null>('household-scope-id', () => auth.household.value?.id ?? null)
  const epoch = useState<number>('household-scope-epoch', () => 0)
  const currentScope = computed(() => auth.household.value?.id ?? null)

  function invalidate(): void {
    epoch.value += 1
    clearNuxtState([...HOUSEHOLD_STATE_KEYS])
  }

  // Any server-confirmed household change (switch, rename with a different
  // list, future acceptance flow) invalidates the cache exactly once per
  // scope transition. Explicit switch actions also call invalidate().
  watch(currentScope, (nextScope) => {
    if (scope.value === nextScope) {
      return
    }

    scope.value = nextScope
    invalidate()
  }, { immediate: true, flush: 'sync' })

  function token(): number {
    return epoch.value
  }

  function isCurrent(value: number): boolean {
    return value === epoch.value
  }

  return { scope, epoch, token, isCurrent, invalidate }
}
