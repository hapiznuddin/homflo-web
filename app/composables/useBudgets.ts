import type {
  BudgetFormValues,
  BudgetItem,
  BudgetPeriod
} from '~/types/budgets'
import { readError, readFieldErrors } from '~/composables/useApiError'
import { normalizeAmountInput } from '~/utils/transactions'
import { formatMonthLabel } from '~/utils/format'

// ---------------------------------------------------------------------------
// Target anggaran: Browser -> Nuxt /api/budgets -> Laravel -> PostgreSQL.
// Hanya CRUD target. TIDAK ada spent/remaining/percent — API tidak
// menyediakannya dan UI dilarang menghitungnya sendiri (Phase 8).
// ---------------------------------------------------------------------------

export function currentPeriod(): BudgetPeriod {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  return { year, month, label: formatMonthLabel(year, month) }
}

export function useBudgets() {
  const items = useState<BudgetItem[]>('budgets-items', () => [])
  const period = useState<BudgetPeriod>('budgets-period', () => currentPeriod())
  const pending = useState<boolean>('budgets-pending', () => false)
  const submitting = useState<boolean>('budgets-submitting', () => false)
  const error = useState<string | null>('budgets-error', () => null)
  const fieldErrors = useState<Record<string, string>>('budgets-field-errors', () => ({}))
  const inflightKey = useState<string | null>('budgets-inflight', () => null)
  const requestSeq = useState<number>('budgets-request-seq', () => 0)

  function requestHeaders(): Record<string, string> {
    // Server-side rendering has no browser cookies of its own: forward
    // them explicitly so SSR resolves the real session instead of always
    // looking like a guest (same pattern as useAuth bootstrap).
    const headers: Record<string, string> = { Accept: 'application/json' }

    if (import.meta.server) {
      const { cookie } = useRequestHeaders(['cookie'])

      if (cookie) {
        headers.Cookie = cookie
      }
    }

    return headers
  }

  function periodKey(next: BudgetPeriod): string {
    return `${next.year}-${String(next.month).padStart(2, '0')}`
  }

  async function load(next?: BudgetPeriod, force = false): Promise<void> {
    const active: BudgetPeriod = next ?? period.value
    const key = periodKey(active)

    if (inflightKey.value === key) {
      return
    }

    // Already have fresh data for this period.
    if (!force && items.value.length > 0 && periodKey(period.value) === key && !error.value) {
      return
    }

    period.value = active
    inflightKey.value = key
    pending.value = true
    error.value = null
    fieldErrors.value = {}
    requestSeq.value += 1

    const current = requestSeq.value

    try {
      const envelope = await $fetch<{ success: boolean, data: BudgetItem[] }>('/api/budgets', {
        params: { year: active.year, month: active.month },
        credentials: 'include',
        headers: requestHeaders()
      })

      if (current !== requestSeq.value) {
        return
      }

      // Server route meneruskan envelope Laravel apa adanya (pola
      // me.get.ts); unwrap di sini.
      items.value = envelope.data
    } catch (err) {
      if (current !== requestSeq.value) {
        return
      }

      error.value = readError(err, 'Data anggaran belum dapat dimuat.')
    } finally {
      if (current === requestSeq.value) {
        pending.value = false
        inflightKey.value = null
      }
    }
  }

  async function refresh(): Promise<void> {
    await load(period.value, true)
  }

  function setPeriod(next: BudgetPeriod): void {
    if (periodKey(next) === periodKey(period.value)) {
      return
    }

    void load(next, true)
  }

  function toPayload(values: BudgetFormValues): Record<string, unknown> | null {
    const amount = normalizeAmountInput(values.amount)

    if (amount === null) {
      fieldErrors.value = { amount: 'Nominal harus berupa angka, mis. 500000 atau 500000,50.' }

      return null
    }

    const year = Number.parseInt(values.year, 10)
    const month = Number.parseInt(values.month, 10)

    if (!Number.isInteger(year) || !Number.isInteger(month)) {
      fieldErrors.value = { month: 'Periode harus berupa tahun dan bulan yang valid.' }

      return null
    }

    if (values.category_id === '') {
      fieldErrors.value = { category_id: 'Pilih kategori terlebih dahulu.' }

      return null
    }

    return {
      category_id: values.category_id,
      year,
      month,
      amount
    }
  }

  async function create(values: BudgetFormValues): Promise<BudgetItem | null> {
    if (submitting.value) {
      return null
    }

    const body = toPayload(values)

    if (body === null) {
      return null
    }

    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const envelope = await $fetch<{ success: boolean, data: BudgetItem }>('/api/budgets', {
        method: 'POST',
        body,
        credentials: 'include',
        headers: requestHeaders()
      })

      await refresh()

      return envelope.data
    } catch (err) {
      error.value = readError(err, 'Anggaran belum dapat disimpan.')
      fieldErrors.value = readFieldErrors(err)

      return null
    } finally {
      submitting.value = false
    }
  }

  async function update(id: string, values: BudgetFormValues): Promise<BudgetItem | null> {
    if (submitting.value) {
      return null
    }

    const body = toPayload(values)

    if (body === null) {
      return null
    }

    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const envelope = await $fetch<{ success: boolean, data: BudgetItem }>(
        `/api/budgets/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          body,
          credentials: 'include',
          headers: requestHeaders()
        }
      )

      await refresh()

      return envelope.data
    } catch (err) {
      error.value = readError(err, 'Perubahan belum dapat disimpan.')
      fieldErrors.value = readFieldErrors(err)

      return null
    } finally {
      submitting.value = false
    }
  }

  async function remove(id: string): Promise<boolean> {
    if (submitting.value) {
      return false
    }

    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      await $fetch(`/api/budgets/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: requestHeaders()
      })

      // Sinkronisasi ulang hanya setelah backend mengonfirmasi.
      await refresh()

      return true
    } catch (err) {
      error.value = readError(err, 'Anggaran belum dapat dihapus.')

      return false
    } finally {
      submitting.value = false
    }
  }

  function clearError(): void {
    error.value = null
    fieldErrors.value = {}
  }

  return {
    items,
    period,
    pending,
    submitting,
    error,
    fieldErrors,
    load,
    refresh,
    setPeriod,
    create,
    update,
    remove,
    clearError
  }
}
