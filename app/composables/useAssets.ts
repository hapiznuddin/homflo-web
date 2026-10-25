import type { AssetFormValues, AssetItem } from '~/types/assets'
import { readError, readFieldErrors } from '~/composables/useApiError'
import { ASSET_NO_PROPERTY } from '~/utils/assets'
import { normalizeAmountInput } from '~/utils/transactions'

// ---------------------------------------------------------------------------
// Katalog aset: Browser -> Nuxt /api/assets -> Laravel -> PostgreSQL.
// List berupa array terurut nama (kontrak backend, tanpa pagination).
// household_id TIDAK PERNAH dibentuk di sini: ownership backend berasal
// dari konteks session, dan proxy hanya meneruskan field yang diizinkan.
// ---------------------------------------------------------------------------

const EMPTY = ''

export function useAssets() {
  const items = useState<AssetItem[]>('assets-items', () => [])
  const pending = useState<boolean>('assets-pending', () => false)
  const submitting = useState<boolean>('assets-submitting', () => false)
  const error = useState<string | null>('assets-error', () => null)
  const fieldErrors = useState<Record<string, string>>('assets-field-errors', () => ({}))
  const inflight = useState<boolean>('assets-inflight', () => false)
  const requestSeq = useState<number>('assets-request-seq', () => 0)

  function requestHeaders(): Record<string, string> {
    // Server-side rendering has no browser cookies of its own: forward
    // them explicitly so SSR resolves the real session instead of always
    // looking like a guest (same pattern as useCategories).
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
      const envelope = await $fetch<{ success: boolean, data: AssetItem[] }>('/api/assets', {
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

      error.value = readError(err, 'Data aset belum dapat dimuat.')
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

  async function fetchOne(id: string): Promise<AssetItem> {
    const envelope = await $fetch<{ success: boolean, data: AssetItem }>(
      `/api/assets/${encodeURIComponent(id)}`,
      {
        credentials: 'include',
        headers: requestHeaders()
      }
    )

    return envelope.data
  }

  /**
   * Payload create/update: hanya field yang didukung FormRequest backend.
   * Nullable field kosong dikirim sebagai null (bukan string kosong) dan
   * biaya dinormalisasi ke dot-form. household_id/id/timestamp serta nested
   * `property` tidak pernah disertakan.
   */
  function toPayload(values: AssetFormValues): Record<string, unknown> | null {
    const costInput = values.acquisition_cost.trim()
    const cost = costInput === EMPTY ? null : normalizeAmountInput(costInput)

    if (costInput !== EMPTY && cost === null) {
      fieldErrors.value = {
        acquisition_cost: 'Biaya perolehan harus berupa angka, mis. 4500000 atau 4500000,50.'
      }

      return null
    }

    const propertyId = values.property_id?.trim() ?? EMPTY

    return {
      name: values.name.trim(),
      description: values.description.trim() === EMPTY ? null : values.description.trim(),
      location: values.location.trim() === EMPTY ? null : values.location.trim(),
      acquired_on: values.acquired_on === EMPTY ? null : values.acquired_on,
      acquisition_cost: cost,
      // Selalu eksplisit: sentinel/kosong = detach, ID = relasi (termasuk
      // ID archived yang sama pada edit sehingga backend menganggap unchanged).
      property_id: propertyId === EMPTY || propertyId === ASSET_NO_PROPERTY ? null : propertyId
    }
  }

  async function create(values: AssetFormValues): Promise<AssetItem | null> {
    if (submitting.value) {
      return null
    }

    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const payload = toPayload(values)

      if (payload === null) {
        return null
      }

      const envelope = await $fetch<{ success: boolean, data: AssetItem }>('/api/assets', {
        method: 'POST',
        body: payload,
        credentials: 'include',
        headers: requestHeaders()
      })

      await refresh()

      return envelope.data
    } catch (err) {
      error.value = readError(err, 'Aset belum dapat disimpan.')
      fieldErrors.value = readFieldErrors(err)

      return null
    } finally {
      submitting.value = false
    }
  }

  async function update(id: string, values: AssetFormValues): Promise<AssetItem | null> {
    if (submitting.value) {
      return null
    }

    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const payload = toPayload(values)

      if (payload === null) {
        return null
      }

      const envelope = await $fetch<{ success: boolean, data: AssetItem }>(
        `/api/assets/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          body: payload,
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
      await $fetch(`/api/assets/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: requestHeaders()
      })

      // Sinkronisasi ulang hanya setelah backend mengonfirmasi.
      await refresh()

      return true
    } catch (err) {
      error.value = readError(err, 'Aset belum dapat dihapus.')

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
