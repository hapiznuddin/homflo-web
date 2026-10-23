import type { MaintenanceFormValues, MaintenanceItem } from '~/types/maintenance'
import { readError, readFieldErrors } from '~/composables/useApiError'

// ---------------------------------------------------------------------------
// Katalog maintenance: Browser -> Nuxt /api/maintenance -> Laravel ->
// PostgreSQL. List berupa array terurut backend (scheduled_date, id), tanpa
// pagination. household_id, status, completed_at, dan cancelled_at TIDAK
// PERNAH dibentuk di sini: ownership berasal dari konteks session dan
// lifecycle hanya dari aksi Complete/Cancel backend.
// ---------------------------------------------------------------------------

const EMPTY = ''

export function useMaintenance() {
  const items = useState<MaintenanceItem[]>('maintenance-items', () => [])
  const pending = useState<boolean>('maintenance-pending', () => false)
  const submitting = useState<boolean>('maintenance-submitting', () => false)
  const error = useState<string | null>('maintenance-error', () => null)
  const fieldErrors = useState<Record<string, string>>('maintenance-field-errors', () => ({}))
  const inflight = useState<boolean>('maintenance-inflight', () => false)
  const requestSeq = useState<number>('maintenance-request-seq', () => 0)

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
      return
    }

    // Already have fresh data.
    if (!force && items.value.length > 0 && !error.value) {
      return
    }

    inflight.value = true
    pending.value = true
    error.value = null
    fieldErrors.value = {}
    requestSeq.value += 1

    const current = requestSeq.value

    try {
      const envelope = await $fetch<{ success: boolean, data: MaintenanceItem[] }>('/api/maintenance', {
        credentials: 'include',
        headers: requestHeaders()
      })

      if (current !== requestSeq.value) {
        return
      }

      // Server route meneruskan envelope Laravel apa adanya; unwrap di sini.
      items.value = envelope.data
    } catch (err) {
      if (current !== requestSeq.value) {
        return
      }

      error.value = readError(err, 'Data perawatan belum dapat dimuat.')
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

  async function fetchOne(id: string): Promise<MaintenanceItem> {
    const envelope = await $fetch<{ success: boolean, data: MaintenanceItem }>(
      `/api/maintenance/${encodeURIComponent(id)}`,
      {
        credentials: 'include',
        headers: requestHeaders()
      }
    )

    return envelope.data
  }

  /**
   * Payload create/update: hanya field yang didukung FormRequest backend.
   * description kosong dikirim sebagai null (bukan string kosong).
   * household_id/id/status/timestamp tidak pernah disertakan.
   */
  function toPayload(values: MaintenanceFormValues): Record<string, unknown> {
    const description = values.description.trim()

    return {
      asset_id: values.asset_id,
      title: values.title.trim(),
      description: description === EMPTY ? null : description,
      location: values.location.trim(),
      scheduled_date: values.scheduled_date,
      priority: values.priority
    }
  }

  async function create(values: MaintenanceFormValues): Promise<MaintenanceItem | null> {
    if (submitting.value) {
      return null
    }

    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const envelope = await $fetch<{ success: boolean, data: MaintenanceItem }>('/api/maintenance', {
        method: 'POST',
        body: toPayload(values),
        credentials: 'include',
        headers: requestHeaders()
      })

      await refresh()

      return envelope.data
    } catch (err) {
      error.value = readError(err, 'Perawatan belum dapat disimpan.')
      fieldErrors.value = readFieldErrors(err)

      return null
    } finally {
      submitting.value = false
    }
  }

  async function update(id: string, values: MaintenanceFormValues): Promise<MaintenanceItem | null> {
    if (submitting.value) {
      return null
    }

    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const envelope = await $fetch<{ success: boolean, data: MaintenanceItem }>(
        `/api/maintenance/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          body: toPayload(values),
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
      await $fetch(`/api/maintenance/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: requestHeaders()
      })

      // Sinkronisasi ulang hanya setelah backend mengonfirmasi.
      await refresh()

      return true
    } catch (err) {
      error.value = readError(err, 'Perawatan belum dapat dihapus.')

      return false
    } finally {
      submitting.value = false
    }
  }

  /**
   * Aksi lifecycle Complete: endpoint khusus (POST), tanpa body. Backend
   * tetap otoritas — 422 MAINTENANCE_ALREADY_COMPLETED/CANCELLED dan 404
   * MAINTENANCE_NOT_FOUND dipetakan readError menjadi pesan jelas.
   */
  async function complete(id: string): Promise<MaintenanceItem | null> {
    return lifecycle('complete', id, 'Perawatan belum dapat ditandai selesai.')
  }

  /**
   * Aksi lifecycle Cancel: endpoint khusus (POST), tanpa body. Hanya record
   * scheduled yang diterima backend; kegagalan transisi ditampilkan apa adanya.
   */
  async function cancel(id: string): Promise<MaintenanceItem | null> {
    return lifecycle('cancel', id, 'Perawatan belum dapat dibatalkan.')
  }

  async function lifecycle(action: 'complete' | 'cancel', id: string, fallback: string): Promise<MaintenanceItem | null> {
    if (submitting.value) {
      return null
    }

    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const envelope = await $fetch<{ success: boolean, data: MaintenanceItem }>(
        `/api/maintenance/${encodeURIComponent(id)}/${action}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: requestHeaders()
        }
      )

      await refresh()

      return envelope.data
    } catch (err) {
      error.value = readError(err, fallback)

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
    complete,
    cancel,
    clearError
  }
}
