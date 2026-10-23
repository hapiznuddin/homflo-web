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

// Urutan yang sama dengan backend: tipe sistem dulu, lalu nama dan id.
function sortObligationTypes(records: ObligationTypeItem[]): ObligationTypeItem[] {
  return [...records].sort((left, right) => {
    if (left.is_system !== right.is_system) {
      return left.is_system ? -1 : 1
    }

    if (left.name !== right.name) {
      return left.name < right.name ? -1 : 1
    }

    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0
  })
}

export function useObligationTypes() {
  const auth = useAuth()
  const items = useState<ObligationTypeItem[]>('obligation-types-items', () => [])
  const pending = useState<boolean>('obligation-types-pending', () => false)
  const submitting = useState<boolean>('obligation-types-submitting', () => false)
  const error = useState<string | null>('obligation-types-error', () => null)
  const errorCode = useState<string | null>('obligation-types-error-code', () => null)
  const fieldErrors = useState<Record<string, string>>('obligation-types-field-errors', () => ({}))
  const inflight = useState<boolean>('obligation-types-inflight', () => false)
  const requestSeq = useState<number>('obligation-types-request-seq', () => 0)
  const scope = useState<string>('obligation-types-scope', () => '')
  const scopeEpoch = useState<number>('obligation-types-scope-epoch', () => 0)
  const currentScope = computed(() => auth.household.value?.id ?? '')

  // Katalog custom terikat household. Tipe sistem memang global, tetapi cache
  // gabungan tetap harus dibuang saat household berganti agar tipe custom
  // rumah tangga sebelumnya tidak pernah tampil ke sesi berikutnya.
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

  // Server sudah mengonfirmasi create/update: terapkan hasilnya lebih dulu
  // agar katalog tetap benar bila refresh lanjutan gagal.
  function upsert(record: ObligationTypeItem): void {
    const next = items.value.filter(item => item.id !== record.id)

    next.push(record)
    items.value = sortObligationTypes(next)
  }

  function removeItem(id: string): void {
    items.value = items.value.filter(item => item.id !== id)
  }

  async function create(name: string): Promise<ObligationTypeItem | null> {
    if (submitting.value) {
      return null
    }

    const mutationEpoch = scopeEpoch.value

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

      if (mutationEpoch === scopeEpoch.value) {
        upsert(envelope.data)
        await refresh()
      }

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

    const mutationEpoch = scopeEpoch.value

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

      if (mutationEpoch === scopeEpoch.value) {
        upsert(envelope.data)
        await refresh()
      }

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

    const mutationEpoch = scopeEpoch.value

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

      // Hanya setelah server mengonfirmasi tipe hilang dari katalog; respons
      // refresh yang gagal tidak menghidupkan kembali tipe tersebut.
      if (mutationEpoch === scopeEpoch.value) {
        removeItem(typeId)
        await refresh()
      }

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
