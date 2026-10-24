import type { PropertyItem, PropertyFormValues } from '~/types/properties'
import { readError, readErrorCode, readFieldErrors } from '~/composables/useApiError'

// ---------------------------------------------------------------------------
// Katalog Property: Browser -> Nuxt /api/properties -> Laravel -> PostgreSQL.
// List default hanya menampilkan Property aktif (tanpa include_archived).
// include_archived=true menampilkan Property aktif + arsip.
// household_id TIDAK PERNAH dibentuk di sini: ownership backend berasal dari
// konteks session, dan proxy hanya meneruskan field yang diizinkan.
// ---------------------------------------------------------------------------

export function useProperties() {
  const auth = useAuth()
  const items = useState<PropertyItem[]>('properties-items', () => [])
  const pending = useState<boolean>('properties-pending', () => false)
  const submitting = useState<boolean>('properties-submitting', () => false)
  const error = useState<string | null>('properties-error', () => null)
  const errorCode = useState<string | null>('properties-error-code', () => null)
  const fieldErrors = useState<Record<string, string>>('properties-field-errors', () => ({}))
  const inflight = useState<boolean>('properties-inflight', () => false)
  const requestSeq = useState<number>('properties-request-seq', () => 0)
  const scope = useState<string>('properties-scope', () => '')
  const scopeEpoch = useState<number>('properties-scope-epoch', () => 0)
  const currentScope = computed(() => auth.household.value?.id ?? '')

  // Bind ke household saat sesi berganti — buang cache lama dan naikkan
  // request sequence agar respons lama tidak bisa masuk ke sesi baru.
  watch(currentScope, (nextScope) => {
    if (scope.value === nextScope) {
      return
    }

    scope.value = nextScope
    scopeEpoch.value += 1
    items.value = []
    pending.value = false
    submitting.value = false
    error.value = null
    errorCode.value = null
    fieldErrors.value = {}
    inflight.value = false
    requestSeq.value += 1
  }, { immediate: true, flush: 'sync' })

  function requestHeaders(): Record<string, string> {
    // Server-side rendering has no browser cookies of its own: forward
    // them explicitly so SSR resolves the real session instead of always
    // looking like a guest (same pattern as useAssets).
    const headers: Record<string, string> = { Accept: 'application/json' }

    if (import.meta.server) {
      const { cookie } = useRequestHeaders(['cookie'])

      if (cookie) {
        headers.Cookie = cookie
      }
    }

    return headers
  }

  async function load(force = false): Promise<void> {
    if (inflight.value) {
      // Non-force loads deduplicate. A forced load (e.g. after a confirmed
      // mutation) supersedes the older request so its late response cannot
      // overwrite newer data.
      if (!force) {
        return
      }

      requestSeq.value += 1
      inflight.value = false
      pending.value = false
    }

    // Already have fresh data.
    if (!force && items.value.length > 0 && !error.value) {
      return
    }

    inflight.value = true
    pending.value = true
    error.value = null
    errorCode.value = null
    fieldErrors.value = {}
    requestSeq.value += 1

    const current = requestSeq.value

    try {
      const params: Record<string, string> = {}

      // Kontrak backend: include_archived=true mengembalikan property aktif +
      // terarsip (bukan hanya arsip); tanpa param = hanya aktif.
      if ($route.query.include_archived) {
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
      // Daftar property TANPA pagination (kontrak backend: array flat).
      items.value = envelope.data
    } catch (err) {
      if (current !== requestSeq.value) {
        return
      }

      error.value = readError(err, 'Data property belum dapat dimuat.')
    } finally {
      if (current === requestSeq.value) {
        pending.value = false
        inflight.value = false
      }
    }
  }

  async function refresh(): Promise<void> {
    await load(true)
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

  // Server sudah mengonfirmasi create/update: terapkan hasilnya ke daftar
  // sebelum refresh agar UI tetap benar bila refresh berikutnya gagal.
  function upsert(record: PropertyItem): void {
    const next = items.value.filter(item => item.id !== record.id)
    next.push(record)
    // Sort by name ASC like backend
    items.value = [...next].sort((left, right) => (left.name ?? '').localeCompare(right.name ?? ''))
  }

  function clearError(): void {
    error.value = null
    errorCode.value = null
    fieldErrors.value = {}
  }

  /** Payload create/update: hanya field yang didukung FormRequest backend.
   * household_id/id/timestamp/archived_at tidak pernah disertikan.
   */
  function toPayload(values: PropertyFormValues): Record<string, unknown> | null {
    const localErrors: Record<string, string> = {}

    // Validate name
    if (!values.name?.trim()) {
      localErrors.name = 'Nama property wajib diisi.'
    } else if (values.name.trim().length > 255) {
      localErrors.name = 'Nama property maksimal 255 karakter.'
    }

    // Validate type (closed enum)
    const validTypes = ['house', 'apartment', 'land', 'shophouse', 'other']
    if (!values.type || !validTypes.includes(values.type)) {
      localErrors.type = 'Tipe property wajib salah satu: house, apartment, land, shophouse, other.'
    }

    // Validate address
    if (!values.address?.trim()) {
      localErrors.address = 'Alamat wajib diisi.'
    } else if (values.address.trim().length > 500) {
      localErrors.address = 'Alamat maksimal 500 karakter.'
    }

    // Validate ownership_status (closed enum)
    const validStatuses = ['owned', 'rented']
    if (!values.ownership_status || !validStatuses.includes(values.ownership_status)) {
      localErrors.ownership_status = 'Status kepemilikan wajib salah satu: owned, rented.'
    }

    // Validate description (optional, max 5000)
    if (values.description !== undefined && values.description.trim().length > 5000) {
      localErrors.description = 'Deskripsi maksimal 5000 karakter.'
    }

    // Validate notes (optional, max 5000)
    if (values.notes !== undefined && values.notes.trim().length > 5000) {
      localErrors.notes = 'Catatan maksimal 5000 karakter.'
    }

    if (Object.keys(localErrors).length > 0) {
      fieldErrors.value = localErrors
      return null
    }

    return {
      name: values.name.trim(),
      type: values.type,
      address: values.address.trim(),
      ownership_status: values.ownership_status,
      description: values.description?.trim() ?? null,
      notes: values.notes?.trim() ?? null
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
      error.value = readError(err, 'Property belum dapat disimpan.')
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
        // Remove from active list if present, or mark as archived
        const index = items.value.findIndex(item => item.id === id)
        if (index !== -1) {
          items.value.splice(index, 1)
        }
        // Refresh to get updated list
        await refresh()
      }

      return envelope.data
    } catch (err) {
      error.value = readError(err, 'Property belum dapat diarsipkan.')
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
        // Add back to list and refresh
        await refresh()
      }

      return envelope.data
    } catch (err) {
      error.value = readError(err, 'Property belum dapat dikembalikan.')
      errorCode.value = readErrorCode(err)
      fieldErrors.value = readFieldErrors(err)

      return null
    } finally {
      submitting.value = false
    }
  }

  return {
    items,
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
