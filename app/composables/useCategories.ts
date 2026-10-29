import type { CategoryFormValues, CategoryItem } from '~/types/categories'
import { readError, readFieldErrors } from '~/composables/useApiError'

// ---------------------------------------------------------------------------
// Katalog kategori: Browser -> Nuxt /api/categories -> Laravel ->
// PostgreSQL. List berupa array terurut nama (kontrak backend, tanpa
// pagination). Tidak ada enum type / allowlist ikon di backend — ikon
// adalah string bebas yang boleh kosong.
// ---------------------------------------------------------------------------

export function useCategories() {
  const items = useState<CategoryItem[]>('categories-items', () => [])
  const pending = useState<boolean>('categories-pending', () => false)
  const submitting = useState<boolean>('categories-submitting', () => false)
  const error = useState<string | null>('categories-error', () => null)
  const fieldErrors = useState<Record<string, string>>('categories-field-errors', () => ({}))
  const inflight = useState<boolean>('categories-inflight', () => false)
  const loaded = useState<boolean>('categories-loaded', () => false)
  const requestSeq = useState<number>('categories-request-seq', () => 0)

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

  async function load(force = false): Promise<void> {
    if (inflight.value) {
      return
    }

    // Already loaded in this session (including a legitimately empty list).
    if (!force && loaded.value && !error.value) {
      return
    }

    inflight.value = true
    pending.value = true
    error.value = null
    fieldErrors.value = {}
    requestSeq.value += 1

    const current = requestSeq.value

    try {
      const envelope = await $fetch<{ success: boolean, data: CategoryItem[] }>('/api/categories', {
        credentials: 'include',
        headers: requestHeaders()
      })

      if (current !== requestSeq.value) {
        return
      }

      // Server route meneruskan envelope Laravel apa adanya (pola
      // me.get.ts); unwrap di sini.
      items.value = envelope.data
      loaded.value = true
    } catch (err) {
      if (current !== requestSeq.value) {
        return
      }

      error.value = readError(err, 'Data kategori belum dapat dimuat.')
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

  function toPayload(values: CategoryFormValues): Record<string, unknown> {
    return {
      name: values.name.trim(),
      type: values.type,
      icon: values.icon.trim() === '' ? null : values.icon.trim()
    }
  }

  async function create(values: CategoryFormValues): Promise<CategoryItem | null> {
    if (submitting.value) {
      return null
    }

    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const envelope = await $fetch<{ success: boolean, data: CategoryItem }>('/api/categories', {
        method: 'POST',
        body: toPayload(values),
        credentials: 'include',
        headers: requestHeaders()
      })

      await refresh()

      return envelope.data
    } catch (err) {
      error.value = readError(err, 'Kategori belum dapat disimpan.')
      fieldErrors.value = readFieldErrors(err)

      return null
    } finally {
      submitting.value = false
    }
  }

  async function update(id: string, values: CategoryFormValues): Promise<CategoryItem | null> {
    if (submitting.value) {
      return null
    }

    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const envelope = await $fetch<{ success: boolean, data: CategoryItem }>(
        `/api/categories/${encodeURIComponent(id)}`,
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
      await $fetch(`/api/categories/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: requestHeaders()
      })

      // Sinkronisasi ulang hanya setelah backend mengonfirmasi.
      await refresh()

      return true
    } catch (err) {
      error.value = readError(err, 'Kategori belum dapat dihapus.')

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
    loaded,
    load,
    refresh,
    create,
    update,
    remove,
    clearError
  }
}
