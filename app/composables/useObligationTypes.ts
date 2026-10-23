import type { ObligationTypeItem } from '~/types/vehicleObligations'
import { readError, readErrorCode, readFieldErrors } from '~/composables/useApiError'

// ---------------------------------------------------------------------------
// Katalog jenis kewajiban household: Browser -> Nuxt /api/obligation-types
// -> Laravel -> PostgreSQL.
// GET mengembalikan tipe sistem (household_id null, is_system true) plus tipe
// custom household aktif, terurut sistem lalu nama (kontrak backend).
// Hanya owner yang dapat membuat/mengubah/menghapus custom type; tipe sistem
// tidak pernah ditawari aksi ubah/hapus. Tidak ada endpoint show — detail
// selalu berasal dari list yang sama.
// ---------------------------------------------------------------------------

export function useObligationTypes() {
  const items = useState<ObligationTypeItem[]>('obligation-types-items', () => [])
  const pending = useState<boolean>('obligation-types-pending', () => false)
  const submitting = useState<boolean>('obligation-types-submitting', () => false)
  const error = useState<string | null>('obligation-types-error', () => null)
  const errorCode = useState<string | null>('obligation-types-error-code', () => null)
  const fieldErrors = useState<Record<string, string>>('obligation-types-field-errors', () => ({}))
  const inflight = useState<boolean>('obligation-types-inflight', () => false)
  const requestSeq = useState<number>('obligation-types-request-seq', () => 0)

  function requestHeaders(): Record<string, string> {
    // Server-side rendering has no browser cookies of its own: forward
    // them explicitly so SSR resolves the real session.
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
      const envelope = await $fetch<{ success: boolean, data: ObligationTypeItem[] }>(
        '/api/obligation-types',
        {
          credentials: 'include',
          headers: requestHeaders()
        }
      )

      if (current !== requestSeq.value) {
        return
      }

      items.value = envelope.data
    } catch (err) {
      if (current !== requestSeq.value) {
        return
      }

      error.value = readError(err, 'Jenis kewajiban belum dapat dimuat.')
      errorCode.value = readErrorCode(err)
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

  async function create(name: string): Promise<ObligationTypeItem | null> {
    if (submitting.value) {
      return null
    }

    submitting.value = true
    error.value = null
    errorCode.value = null
    fieldErrors.value = {}

    try {
      const envelope = await $fetch<{ success: boolean, data: ObligationTypeItem }>(
        '/api/obligation-types',
        {
          method: 'POST',
          body: { name: name.trim() },
          credentials: 'include',
          headers: requestHeaders()
        }
      )

      await refresh()

      return envelope.data
    } catch (err) {
      error.value = readError(err, 'Jenis kewajiban belum dapat disimpan.')
      errorCode.value = readErrorCode(err)
      fieldErrors.value = readFieldErrors(err)

      return null
    } finally {
      submitting.value = false
    }
  }

  async function update(typeId: string, name: string): Promise<ObligationTypeItem | null> {
    if (submitting.value) {
      return null
    }

    submitting.value = true
    error.value = null
    errorCode.value = null
    fieldErrors.value = {}

    try {
      const envelope = await $fetch<{ success: boolean, data: ObligationTypeItem }>(
        `/api/obligation-types/${encodeURIComponent(typeId)}`,
        {
          method: 'PATCH',
          body: { name: name.trim() },
          credentials: 'include',
          headers: requestHeaders()
        }
      )

      await refresh()

      return envelope.data
    } catch (err) {
      // Termasuk OBLIGATION_TYPE_IMMUTABLE / ALREADY_EXISTS: data lama tetap
      // dipakai, tidak ada perubahan optimistis.
      error.value = readError(err, 'Perubahan jenis kewajiban belum dapat disimpan.')
      errorCode.value = readErrorCode(err)
      fieldErrors.value = readFieldErrors(err)

      return null
    } finally {
      submitting.value = false
    }
  }

  async function remove(typeId: string): Promise<boolean> {
    if (submitting.value) {
      return false
    }

    submitting.value = true
    error.value = null
    errorCode.value = null
    fieldErrors.value = {}

    try {
      await $fetch(`/api/obligation-types/${encodeURIComponent(typeId)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: requestHeaders()
      })

      await refresh()

      return true
    } catch (err) {
      // OBLIGATION_TYPE_IN_USE: server menolak; katalog tidak diubah dan
      // tidak ada obligation yang dipindahkan ke tipe lain.
      error.value = readError(err, 'Jenis kewajiban belum dapat dihapus.')
      errorCode.value = readErrorCode(err)

      return false
    } finally {
      submitting.value = false
    }
  }

  function clearError(): void {
    error.value = null
    errorCode.value = null
    fieldErrors.value = {}
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
    create,
    update,
    remove,
    clearError
  }
}
