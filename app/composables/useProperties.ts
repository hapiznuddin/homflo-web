import type { PropertyFilters, PropertyFormValues, PropertyItem } from '~/types/properties'
import { readError, readErrorCode, readFieldErrors } from '~/composables/useApiError'

// ---------------------------------------------------------------------------
// Katalog Property: Browser -> Nuxt /api/properties -> Laravel -> PostgreSQL.
// List default hanya Property aktif; include_archived=true mengembalikan
// aktif + arsip (bukan hanya arsip). household_id TIDAK PERNAH dibentuk di
// sini: ownership berasal dari konteks session, dan proxy hanya meneruskan
// field yang diizinkan. Tidak ada endpoint DELETE permanen.
// ---------------------------------------------------------------------------

const VALID_TYPES = ['house', 'apartment', 'land', 'shophouse', 'other'] as const
const VALID_OWNERSHIP = ['owned', 'rented'] as const

export function useProperties() {
  const auth = useAuth()
  const items = useState<PropertyItem[]>('properties-items', () => [])
  const filters = useState<PropertyFilters>('properties-filters', () => ({}))
  const pending = useState<boolean>('properties-pending', () => false)
  const submitting = useState<boolean>('properties-submitting', () => false)
  const error = useState<string | null>('properties-error', () => null)
  const errorCode = useState<string | null>('properties-error-code', () => null)
  const fieldErrors = useState<Record<string, string>>('properties-field-errors', () => ({}))
  const inflightKey = useState<string | null>('properties-inflight', () => null)
  const requestSeq = useState<number>('properties-request-seq', () => 0)
  const scope = useState<string>('properties-scope', () => '')
  const scopeEpoch = useState<number>('properties-scope-epoch', () => 0)
  const currentScope = computed(() => auth.household.value?.id ?? '')

  // Bind ke household saat sesi berganti — buang cache lama dan naikkan
  // epoch agar respons lama tidak bisa masuk ke sesi baru.
  watch(currentScope, (nextScope) => {
    if (scope.value === nextScope) {
      return
    }

    scope.value = nextScope
    scopeEpoch.value += 1
    items.value = []
    filters.value = {}
    pending.value = false
    submitting.value = false
    error.value = null
    errorCode.value = null
    fieldErrors.value = {}
    inflightKey.value = null
    requestSeq.value += 1
  }, { immediate: true, flush: 'sync' })

  function requestHeaders(): Record<string, string> {
    // Server-side rendering tidak membawa cookie browser secara otomatis:
    // teruskan eksplisit agar SSR melihat session yang sebenarnya.
    const headers: Record<string, string> = { Accept: 'application/json' }

    if (import.meta.server) {
      const { cookie } = useRequestHeaders(['cookie'])

      if (cookie) {
        headers.Cookie = cookie
      }
    }

    return headers
  }

  function filtersKey(active: PropertyFilters): string {
    return active.include_archived ? 'archived' : 'active'
  }

  async function load(next?: PropertyFilters, force = false): Promise<void> {
    const active: PropertyFilters = { ...(next ?? filters.value) }
    const key = filtersKey(active)

    if (inflightKey.value === key) {
      return
    }

    // Data untuk filter yang sama sudah segar.
    if (!force && items.value.length > 0 && filtersKey(filters.value) === key && !error.value) {
      return
    }

    filters.value = active
    inflightKey.value = key
    pending.value = true
    error.value = null
    errorCode.value = null
    fieldErrors.value = {}
    requestSeq.value += 1

    const current = requestSeq.value

    try {
      const params: Record<string, string> = {}

      // Kontrak backend: include_archived=true mengembalikan Property aktif +
      // terarsip; tanpa param = hanya aktif.
      if (active.include_archived) {
        params.include_archived = 'true'
      }

      const envelope = await $fetch<{ success: boolean, data: PropertyItem[] }>('/api/properties', {
        params,
        credentials: 'include',
        headers: requestHeaders()
      })

      if (current !== requestSeq.value) {
        return
      }

      // Server route meneruskan envelope Laravel apa adanya; unwrap di sini.
      // Daftar Property TANPA pagination (kontrak backend: array flat).
      items.value = envelope.data
    } catch (err) {
      if (current !== requestSeq.value) {
        return
      }

      error.value = readError(err, 'Data property belum dapat dimuat.')
      errorCode.value = readErrorCode(err)
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

  async function fetchOne(id: string): Promise<PropertyItem> {
    const envelope = await $fetch<{ success: boolean, data: PropertyItem }>(
      `/api/properties/${encodeURIComponent(id)}`,
      {
        credentials: 'include',
        headers: requestHeaders()
      }
    )

    return envelope.data
  }

  // Terapkan hasil create/update/archive/restore sebelum refresh agar UI
  // tetap benar bila refresh berikutnya gagal.
  function upsert(record: PropertyItem): void {
    const next = items.value.filter(item => item.id !== record.id)
    next.push(record)
    items.value = next.sort((left, right) => left.name.localeCompare(right.name))
  }

  function clearError(): void {
    error.value = null
    errorCode.value = null
    fieldErrors.value = {}
  }

  /** Payload create/update: hanya field yang didukung FormRequest backend.
   * household_id/id/timestamp/archived_at tidak pernah disertakan.
   */
  function toPayload(values: PropertyFormValues): Record<string, unknown> | null {
    const localErrors: Record<string, string> = {}
    const name = values.name?.trim() ?? ''
    const address = values.address?.trim() ?? ''
    const description = values.description?.trim() ?? ''
    const notes = values.notes?.trim() ?? ''

    if (name === '') {
      localErrors.name = 'Nama properti wajib diisi.'
    } else if (name.length > 255) {
      localErrors.name = 'Nama properti maksimal 255 karakter.'
    }

    if (!VALID_TYPES.includes(values.type as typeof VALID_TYPES[number])) {
      localErrors.type = 'Tipe properti wajib dipilih.'
    }

    if (address === '') {
      localErrors.address = 'Alamat wajib diisi.'
    } else if (address.length > 500) {
      localErrors.address = 'Alamat maksimal 500 karakter.'
    }

    if (!VALID_OWNERSHIP.includes(values.ownership_status as typeof VALID_OWNERSHIP[number])) {
      localErrors.ownership_status = 'Status kepemilikan wajib dipilih.'
    }

    if (description.length > 5000) {
      localErrors.description = 'Deskripsi properti maksimal 5000 karakter.'
    }

    if (notes.length > 5000) {
      localErrors.notes = 'Catatan properti maksimal 5000 karakter.'
    }

    if (Object.keys(localErrors).length > 0) {
      fieldErrors.value = localErrors
      return null
    }

    return {
      name,
      type: values.type,
      address,
      ownership_status: values.ownership_status,
      description: description === '' ? null : description,
      notes: notes === '' ? null : notes
    }
  }

  async function create(values: PropertyFormValues): Promise<PropertyItem | null> {
    if (submitting.value) {
      return null
    }

    const mutationEpoch = scopeEpoch.value

    submitting.value = true
    error.value = null
    errorCode.value = null
    fieldErrors.value = {}

    try {
      const payload = toPayload(values)

      if (payload === null) {
        return null
      }

      const envelope = await $fetch<{ success: boolean, data: PropertyItem }>('/api/properties', {
        method: 'POST',
        body: payload,
        credentials: 'include',
        headers: requestHeaders()
      })

      if (mutationEpoch === scopeEpoch.value) {
        upsert(envelope.data)
        await refresh()
      }

      return envelope.data
    } catch (err) {
      error.value = readError(err, 'Properti belum dapat disimpan.')
      errorCode.value = readErrorCode(err)
      fieldErrors.value = readFieldErrors(err)

      return null
    } finally {
      submitting.value = false
    }
  }

  async function update(id: string, values: PropertyFormValues): Promise<PropertyItem | null> {
    if (submitting.value) {
      return null
    }

    const mutationEpoch = scopeEpoch.value

    submitting.value = true
    error.value = null
    errorCode.value = null
    fieldErrors.value = {}

    try {
      const payload = toPayload(values)

      if (payload === null) {
        return null
      }

      const envelope = await $fetch<{ success: boolean, data: PropertyItem }>(
        `/api/properties/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          body: payload,
          credentials: 'include',
          headers: requestHeaders()
        }
      )

      if (mutationEpoch === scopeEpoch.value) {
        upsert(envelope.data)
        await refresh()
      }

      return envelope.data
    } catch (err) {
      error.value = readError(err, 'Perubahan property belum dapat disimpan.')
      errorCode.value = readErrorCode(err)
      fieldErrors.value = readFieldErrors(err)

      return null
    } finally {
      submitting.value = false
    }
  }

  async function archive(id: string): Promise<PropertyItem | null> {
    if (submitting.value) {
      return null
    }

    const mutationEpoch = scopeEpoch.value

    submitting.value = true
    error.value = null
    errorCode.value = null
    fieldErrors.value = {}

    try {
      const envelope = await $fetch<{ success: boolean, data: PropertyItem }>(
        `/api/properties/${encodeURIComponent(id)}/archive`,
        {
          method: 'POST',
          credentials: 'include',
          headers: requestHeaders()
        }
      )

      if (mutationEpoch === scopeEpoch.value) {
        upsert(envelope.data)
        await refresh()
      }

      return envelope.data
    } catch (err) {
      error.value = readError(err, 'Properti belum dapat diarsipkan.')
      errorCode.value = readErrorCode(err)
      fieldErrors.value = readFieldErrors(err)

      return null
    } finally {
      submitting.value = false
    }
  }

  async function restore(id: string): Promise<PropertyItem | null> {
    if (submitting.value) {
      return null
    }

    const mutationEpoch = scopeEpoch.value

    submitting.value = true
    error.value = null
    errorCode.value = null
    fieldErrors.value = {}

    try {
      const envelope = await $fetch<{ success: boolean, data: PropertyItem }>(
        `/api/properties/${encodeURIComponent(id)}/restore`,
        {
          method: 'POST',
          credentials: 'include',
          headers: requestHeaders()
        }
      )

      if (mutationEpoch === scopeEpoch.value) {
        upsert(envelope.data)
        await refresh()
      }

      return envelope.data
    } catch (err) {
      error.value = readError(err, 'Properti belum dapat dikembalikan.')
      errorCode.value = readErrorCode(err)
      fieldErrors.value = readFieldErrors(err)

      return null
    } finally {
      submitting.value = false
    }
  }

  return {
    items,
    filters,
    pending,
    submitting,
    error,
    errorCode,
    fieldErrors,
    load,
    refresh,
    fetchOne,
    create,
    update,
    archive,
    restore,
    clearError,
    toPayload
  }
}
