import type {
  TransactionFilters,
  TransactionFormValues,
  TransactionItem,
  TransactionListData,
  TransactionListMeta
} from '~/types/transactions'
import { readError, readFieldErrors } from '~/composables/useApiError'
import { normalizeAmountInput } from '~/utils/transactions'

// ---------------------------------------------------------------------------
// Read-model + mutasi transaksi: Browser -> Nuxt /api/transactions ->
// Laravel -> PostgreSQL. Satu sumber kebenaran finansial tetap di backend;
// UI tidak pernah berhitung (tanpa total/saldo), tidak memakai fixture,
// dan tidak logout otomatis saat API gagal.
// ---------------------------------------------------------------------------

const DEFAULT_PER_PAGE = 15

const EMPTY_META: TransactionListMeta = {
  current_page: 1,
  per_page: DEFAULT_PER_PAGE,
  total: 0,
  last_page: 1
}

export function useTransactions() {
  const items = useState<TransactionItem[]>('transactions-items', () => [])
  const meta = useState<TransactionListMeta>('transactions-meta', () => ({ ...EMPTY_META }))
  const filters = useState<TransactionFilters>('transactions-filters', () => ({}))
  const pending = useState<boolean>('transactions-pending', () => false)
  const submitting = useState<boolean>('transactions-submitting', () => false)
  const error = useState<string | null>('transactions-error', () => null)
  const fieldErrors = useState<Record<string, string>>('transactions-field-errors', () => ({}))
  const inflightKey = useState<string | null>('transactions-inflight', () => null)
  const requestSeq = useState<number>('transactions-request-seq', () => 0)

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

  function filtersKey(active: TransactionFilters): string {
    return JSON.stringify(active)
  }

  async function load(next?: TransactionFilters, force = false): Promise<void> {
    const active: TransactionFilters = { ...(next ?? filters.value) }
    const key = filtersKey(active)

    if (inflightKey.value === key) {
      return
    }

    // Already have fresh data for these filters.
    if (!force && items.value.length > 0 && filtersKey(filters.value) === key && !error.value) {
      return
    }

    filters.value = active
    inflightKey.value = key
    pending.value = true
    error.value = null
    fieldErrors.value = {}
    requestSeq.value += 1

    const current = requestSeq.value

    try {
      const params: Record<string, string | number> = {}

      for (const [param, value] of Object.entries(active)) {
        if (value !== undefined && value !== '') {
          params[param] = value
        }
      }

      const envelope = await $fetch<{ success: boolean, data: TransactionListData }>('/api/transactions', {
        params,
        credentials: 'include',
        headers: requestHeaders()
      })

      if (current !== requestSeq.value) {
        return
      }

      // Server route meneruskan envelope Laravel apa adanya (pola
      // me.get.ts); unwrap di sini.
      items.value = envelope.data.data
      meta.value = envelope.data.meta
    } catch (err) {
      if (current !== requestSeq.value) {
        return
      }

      error.value = readError(err, 'Data transaksi belum dapat dimuat.')
    } finally {
      if (current === requestSeq.value) {
        pending.value = false
        inflightKey.value = null
      }
    }
  }

  async function refresh(): Promise<void> {
    await load(filters.value, true)
  }

  async function fetchOne(id: string): Promise<TransactionItem> {
    const envelope = await $fetch<{ success: boolean, data: TransactionItem }>(
      `/api/transactions/${encodeURIComponent(id)}`,
      {
        credentials: 'include',
        headers: requestHeaders()
      }
    )

    return envelope.data
  }

  /**
   * Membangun body transaksi per mode (kontrak FormRequest Laravel):
   *
   * - CREATE transfer: sertakan `destination_wallet_id`, tanpa key
   *   `category_id` (StoreTransactionRequest: prohibited_if:type,transfer).
   * - CREATE income/expense: TANPA key `destination_wallet_id`
   *   (prohibited_unless:type,transfer), `category_id` id‖null.
   * - UPDATE (PATCH): selalu menyertakan KEDUA key —
   *   `destination_wallet_id` (id utk transfer; NULL utk non-transfer
   *   agar konversi transfer→expense menghapus tujuan lama; change()
   *   membaca via array_key_exists, key absen = tujuan lama terbawa →
   *   422 TRANSACTION_INVALID) dan `category_id` (null utk transfer —
   *   key absen + type=transfer = kategori lama terbawa → 422).
   */
  function toPayload(
    values: TransactionFormValues,
    mode: 'create' | 'update'
  ): Record<string, unknown> | null {
    const amount = normalizeAmountInput(values.amount)

    if (amount === null) {
      fieldErrors.value = { amount: 'Nominal harus berupa angka, mis. 150000 atau 150000,50.' }

      return null
    }

    const isTransfer = values.type === 'transfer'
    const body: Record<string, unknown> = {
      type: values.type,
      amount,
      occurred_on: values.occurred_on,
      description: values.description === '' ? null : values.description,
      wallet: values.wallet === '' ? null : values.wallet,
      // ID dompet (ULID) dari Wallet API — kolom posting sesungguhnya;
      // '' (belum pilih) tidak mengirim key sehingga create kena
      // validasi required backend.
      ...(values.wallet_id === '' ? {} : { wallet_id: values.wallet_id })
    }

    if (isTransfer) {
      if (values.destination_wallet_id !== '') {
        body.destination_wallet_id = values.destination_wallet_id
      }
    } else if (mode === 'update') {
      // Konversi transfer→non-transfer: null eksplisit (lihat doc toPayload).
      body.destination_wallet_id = null
    }

    if (!(isTransfer && mode === 'create')) {
      body.category_id = !isTransfer && values.category_id !== ''
        ? values.category_id
        : null
    }

    return body
  }

  async function create(values: TransactionFormValues): Promise<TransactionItem | null> {
    if (submitting.value) {
      return null
    }

    const body = toPayload(values, 'create')

    if (body === null) {
      return null
    }

    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const envelope = await $fetch<{ success: boolean, data: TransactionItem }>('/api/transactions', {
        method: 'POST',
        body,
        credentials: 'include',
        headers: requestHeaders()
      })

      await refresh()

      return envelope.data
    } catch (err) {
      error.value = readError(err, 'Transaksi belum dapat disimpan.')
      fieldErrors.value = readFieldErrors(err)

      return null
    } finally {
      submitting.value = false
    }
  }

  async function update(id: string, values: TransactionFormValues): Promise<TransactionItem | null> {
    if (submitting.value) {
      return null
    }

    const body = toPayload(values, 'update')

    if (body === null) {
      return null
    }

    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const envelope = await $fetch<{ success: boolean, data: TransactionItem }>(
        `/api/transactions/${encodeURIComponent(id)}`,
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
      await $fetch(`/api/transactions/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: requestHeaders()
      })

      // Sinkronisasi ulang hanya setelah backend mengonfirmasi.
      await refresh()

      return true
    } catch (err) {
      error.value = readError(err, 'Transaksi belum dapat dihapus.')

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
    meta,
    filters,
    pending,
    submitting,
    error,
    fieldErrors,
    load,
    refresh,
    fetchOne,
    create,
    update,
    remove,
    clearError
  }
}
