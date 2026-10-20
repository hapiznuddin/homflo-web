import type {
  BillDetail,
  BillFilters,
  BillFormValues,
  BillItem,
  BillPayFormValues,
  BillPayResponse,
  BillRecurrence,
  BillRecurrenceFormValues
} from '~/types/bills'
import { readError, readFieldErrors } from '~/composables/useApiError'
import { normalizeAmountInput } from '~/utils/transactions'

// ---------------------------------------------------------------------------
// Read-model + mutasi bills: Browser -> Nuxt /api/bills -> Laravel ->
// PostgreSQL. Satu sumber kebenaran finansial tetap di backend:
// status/overdue/paid/remaining/arsip selalu field server (tidak pernah
// dihitung di browser), payload bayar HANYA { wallet_id, occurred_on? } —
// amount/category_id tidak pernah dikirim — dan tidak ada logout
// otomatis saat API gagal.
// ---------------------------------------------------------------------------

export function useBills() {
  const items = useState<BillItem[]>('bills-items', () => [])
  const filters = useState<BillFilters>('bills-filters', () => ({}))
  const pending = useState<boolean>('bills-pending', () => false)
  const submitting = useState<boolean>('bills-submitting', () => false)
  const error = useState<string | null>('bills-error', () => null)
  const fieldErrors = useState<Record<string, string>>('bills-field-errors', () => ({}))
  const inflightKey = useState<string | null>('bills-inflight', () => null)
  const requestSeq = useState<number>('bills-request-seq', () => 0)

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

  function filtersKey(active: BillFilters): string {
    return active.include_archived ? 'archived' : 'active'
  }

  async function load(next?: BillFilters, force = false): Promise<void> {
    const active: BillFilters = { ...(next ?? filters.value) }
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
      const params: Record<string, string> = {}

      // Kontrak backend: include_archived=true mengembalikan bill aktif +
      // terarsip (bukan hanya arsip); tanpa param = hanya aktif.
      if (active.include_archived) {
        params.include_archived = 'true'
      }

      const envelope = await $fetch<{ success: boolean, data: BillItem[] }>('/api/bills', {
        params,
        credentials: 'include',
        headers: requestHeaders()
      })

      if (current !== requestSeq.value) {
        return
      }

      // Server route meneruskan envelope Laravel apa adanya (pola
      // me.get.ts); unwrap di sini. Daftar bills TANPA pagination
      // (kontrak backend: array flat).
      items.value = envelope.data
    } catch (err) {
      if (current !== requestSeq.value) {
        return
      }

      error.value = readError(err, 'Data tagihan belum dapat dimuat.')
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

  async function fetchOne(id: string): Promise<BillDetail> {
    const envelope = await $fetch<{ success: boolean, data: BillDetail }>(
      `/api/bills/${encodeURIComponent(id)}`,
      {
        credentials: 'include',
        headers: requestHeaders()
      }
    )

    return envelope.data
  }

  function toPayload(values: BillFormValues, mode: 'create' | 'edit'): Record<string, unknown> | null {
    const amount = normalizeAmountInput(values.amount)

    if (amount === null) {
      fieldErrors.value = { amount: 'Nominal harus berupa angka, mis. 150000 atau 150000,50.' }

      return null
    }

    const payload: Record<string, unknown> = {
      title: values.title.trim(),
      amount,
      due_date: values.due_date === '' ? null : values.due_date,
      category_id: values.category_id === '' ? null : values.category_id,
      notes: values.notes === '' ? null : values.notes
    }

    // recurrence HANYA dikirim saat create (POST); PATCH /bills/{id}
    // melarang kunci recurrence — perubahan jadwal lewat PATCH recurrence.
    if (mode === 'create' && values.recurrence) {
      payload.recurrence = { frequency: values.frequency }
    }

    return payload
  }

  async function create(values: BillFormValues): Promise<BillItem | null> {
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
      const envelope = await $fetch<{ success: boolean, data: BillItem }>('/api/bills', {
        method: 'POST',
        body,
        credentials: 'include',
        headers: requestHeaders()
      })

      await refresh()

      return envelope.data
    } catch (err) {
      error.value = readError(err, 'Tagihan belum dapat disimpan.')
      fieldErrors.value = readFieldErrors(err)

      return null
    } finally {
      submitting.value = false
    }
  }

  async function update(id: string, values: BillFormValues): Promise<BillItem | null> {
    if (submitting.value) {
      return null
    }

    const body = toPayload(values, 'edit')

    if (body === null) {
      return null
    }

    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const envelope = await $fetch<{ success: boolean, data: BillItem }>(
        `/api/bills/${encodeURIComponent(id)}`,
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
      error.value = readError(err, 'Perubahan tagihan belum dapat disimpan.')
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
      await $fetch(`/api/bills/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: requestHeaders()
      })

      // Sinkronisasi ulang hanya setelah backend mengonfirmasi.
      await refresh()

      return true
    } catch (err) {
      error.value = readError(err, 'Tagihan belum dapat dihapus.')

      return false
    } finally {
      submitting.value = false
    }
  }

  async function archive(id: string): Promise<BillItem | null> {
    if (submitting.value) {
      return null
    }

    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const envelope = await $fetch<{ success: boolean, data: BillItem }>(
        `/api/bills/${encodeURIComponent(id)}/archive`,
        {
          method: 'POST',
          credentials: 'include',
          headers: requestHeaders()
        }
      )

      await refresh()

      return envelope.data
    } catch (err) {
      error.value = readError(err, 'Tagihan belum dapat diarsipkan.')

      return null
    } finally {
      submitting.value = false
    }
  }

  async function pay(id: string, values: BillPayFormValues): Promise<BillPayResponse | null> {
    if (submitting.value) {
      return null
    }

    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const body: Record<string, unknown> = { wallet_id: values.wallet_id }

      // Kosong = biarkan backend memakai hari bisnis (Asia/Jakarta);
      // jam browser tidak pernah menjadi sumber tanggal.
      if (values.occurred_on !== '') {
        body.occurred_on = values.occurred_on
      }

      // amount dan category_id TIDAK PERNAH dikirim: nominal pelunasan
      // diturunkan backend di bawah lock dan kategori diwarisi dari bill
      // (PayBillRequest melarang keduanya).
      const envelope = await $fetch<{ success: boolean, data: BillPayResponse }>(
        `/api/bills/${encodeURIComponent(id)}/payments`,
        {
          method: 'POST',
          body,
          credentials: 'include',
          headers: requestHeaders()
        }
      )

      await refresh()

      return envelope.data
    } catch (err) {
      error.value = readError(err, 'Pembayaran belum dapat diproses.')

      return null
    } finally {
      submitting.value = false
    }
  }

  /**
   * Update jadwal dengan payload DIFF: hanya kunci yang ada di `changes`
   * yang dikirim (FormRequest 'sometimes'). Penting karena API tanpa GET
   * recurrence — nilai template saat ini tidak bisa dibaca dari baris bill
   * (bisa basi karena edit lokal periode atau periode lunas), jadi field
   * yang tidak disentuh pengguna TIDAK boleh dikirim agar tidak
   * menimpa/merevert jadwal. due_day/frequency/is_active bersumber dari
   * bill.recurrence (field jadwal asli, akurat) sehingga aman dikirim
   * apa adanya.
   */
  async function updateRecurrence(recurrenceId: string, changes: Partial<BillRecurrenceFormValues>): Promise<BillRecurrence | null> {
    if (submitting.value) {
      return null
    }

    const body: Record<string, unknown> = {}

    if (changes.title !== undefined) {
      body.title = changes.title.trim()
    }

    if (changes.amount !== undefined) {
      const amount = normalizeAmountInput(changes.amount)

      if (amount === null) {
        fieldErrors.value = { amount: 'Nominal harus berupa angka, mis. 150000 atau 150000,50.' }

        return null
      }

      body.amount = amount
    }

    if (changes.category_id !== undefined) {
      body.category_id = changes.category_id === '' ? null : changes.category_id
    }

    if (changes.notes !== undefined) {
      body.notes = changes.notes === '' ? null : changes.notes
    }

    if (changes.due_day !== undefined) {
      // Bilangan bulat 1–31 (aturan backend min:1|max:31); divalidasi di
      // sini agar input kosong/aneh tidak menyentuh network.
      if (!Number.isInteger(changes.due_day) || changes.due_day < 1 || changes.due_day > 31) {
        fieldErrors.value = { due_day: 'Tanggal jatuh tempo harus berupa bilangan bulat 1–31.' }

        return null
      }

      body.due_day = changes.due_day
    }

    if (changes.frequency !== undefined) {
      body.frequency = changes.frequency
    }

    if (changes.is_active !== undefined) {
      body.is_active = changes.is_active
    }

    if (Object.keys(body).length === 0) {
      return null
    }

    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      // Body FLAT sesuai UpdateBillRecurrenceRequest (D-07).
      const envelope = await $fetch<{ success: boolean, data: BillRecurrence }>(
        `/api/bills/recurrences/${encodeURIComponent(recurrenceId)}`,
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
      error.value = readError(err, 'Jadwal tagihan belum dapat diubah.')
      fieldErrors.value = readFieldErrors(err)

      return null
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
    archive,
    pay,
    updateRecurrence,
    clearError
  }
}
