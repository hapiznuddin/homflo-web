import type { VehicleFormValues, VehicleItem } from '~/types/vehicles'
import { readError, readErrorCode, readFieldErrors } from '~/composables/useApiError'

// ---------------------------------------------------------------------------
// Katalog kendaraan: Browser -> Nuxt /api/vehicles -> Laravel -> PostgreSQL.
// List berupa array terurut nama lalu id (kontrak backend, tanpa pagination).
// household_id TIDAK PERNAH dibentuk di sini: ownership backend berasal dari
// konteks session, dan proxy hanya meneruskan field yang diizinkan.
// Label UI `license_plate` dipetakan ke kolom API `plate_number` tepat di
// batas request (toPayload), bukan di tempat lain.
// ---------------------------------------------------------------------------

const EMPTY = ''

// Urutan yang sama dengan backend (name lalu id) untuk rekonsiliasi lokal
// setelah create/update, termasuk saat refresh lanjutan gagal.
function sortVehicleItems(records: VehicleItem[]): VehicleItem[] {
  return [...records].sort((left, right) => {
    if (left.name !== right.name) {
      return left.name < right.name ? -1 : 1
    }

    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0
  })
}

export function useVehicles() {
  const auth = useAuth()
  const items = useState<VehicleItem[]>('vehicles-items', () => [])
  const pending = useState<boolean>('vehicles-pending', () => false)
  const submitting = useState<boolean>('vehicles-submitting', () => false)
  const error = useState<string | null>('vehicles-error', () => null)
  const errorCode = useState<string | null>('vehicles-error-code', () => null)
  const fieldErrors = useState<Record<string, string>>('vehicles-field-errors', () => ({}))
  const inflight = useState<boolean>('vehicles-inflight', () => false)
  const requestSeq = useState<number>('vehicles-request-seq', () => 0)
  const scope = useState<string>('vehicles-scope', () => '')
  const scopeEpoch = useState<number>('vehicles-scope-epoch', () => 0)
  const currentScope = computed(() => auth.household.value?.id ?? '')

  // Katalog kendaraan terikat pada household. Saat sesi/household berganti,
  // buang cache lama dan naikkan request sequence agar respons lama tidak
  // bisa masuk ke sesi baru.
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
      const envelope = await $fetch<{ success: boolean, data: VehicleItem[] }>('/api/vehicles', {
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

      error.value = readError(err, 'Data kendaraan belum dapat dimuat.')
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

  async function fetchOne(id: string): Promise<VehicleItem> {
    const envelope = await $fetch<{ success: boolean, data: VehicleItem }>(
      `/api/vehicles/${encodeURIComponent(id)}`,
      {
        credentials: 'include',
        headers: requestHeaders()
      }
    )

    return envelope.data
  }

  // Server sudah mengonfirmasi create/update: terapkan hasilnya ke daftar
  // sebelum refresh agar UI tetap benar bila refresh berikutnya gagal.
  function upsert(record: VehicleItem): void {
    const next = items.value.filter(item => item.id !== record.id)

    next.push(record)
    items.value = sortVehicleItems(next)
  }

  function removeItem(id: string): void {
    items.value = items.value.filter(item => item.id !== id)
  }

  /** Parsing integer form: '' -> null, tidak valid -> 'invalid'. */
  function parseInteger(raw: string, min: number, max: number): number | null | 'invalid' {
    const value = raw.trim()

    if (value === EMPTY) {
      return null
    }

    if (!/^\d+$/.test(value)) {
      return 'invalid'
    }

    const parsed = Number(value)

    return parsed < min || parsed > max ? 'invalid' : parsed
  }

  /**
   * Payload create/update: hanya field yang didukung FormRequest backend.
   * Field nullable kosong dikirim sebagai null (bukan string kosong) dan
   * `license_plate` (label UI) dipetakan ke `plate_number`. year/odometer
   * dikirim sebagai integer; household_id/id/timestamp tidak pernah
   * disertakan.
   */
  function toPayload(values: VehicleFormValues): Record<string, unknown> | null {
    const year = parseInteger(values.year, 1900, 2100)
    const odometer = parseInteger(values.odometer, 0, 2147483647)
    const localErrors: Record<string, string> = {}

    if (year === 'invalid') {
      localErrors.year = 'Tahun harus berupa angka antara 1900 dan 2100.'
    }

    if (odometer === 'invalid') {
      localErrors.odometer = 'Odometer harus berupa bilangan bulat 0 atau lebih.'
    }

    if (Object.keys(localErrors).length > 0) {
      fieldErrors.value = localErrors

      return null
    }

    const nullable = (raw: string): string | null => {
      const trimmed = raw.trim()

      return trimmed === EMPTY ? null : trimmed
    }

    return {
      name: values.name.trim(),
      brand: nullable(values.brand),
      model: nullable(values.model),
      year,
      type: nullable(values.type),
      plate_number: nullable(values.license_plate),
      odometer
    }
  }

  async function create(values: VehicleFormValues): Promise<VehicleItem | null> {
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

      const envelope = await $fetch<{ success: boolean, data: VehicleItem }>('/api/vehicles', {
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
      error.value = readError(err, 'Kendaraan belum dapat disimpan.')
      errorCode.value = readErrorCode(err)
      fieldErrors.value = readFieldErrors(err)

      return null
    } finally {
      submitting.value = false
    }
  }

  async function update(id: string, values: VehicleFormValues): Promise<VehicleItem | null> {
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

      const envelope = await $fetch<{ success: boolean, data: VehicleItem }>(
        `/api/vehicles/${encodeURIComponent(id)}`,
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
      error.value = readError(err, 'Perubahan belum dapat disimpan.')
      errorCode.value = readErrorCode(err)
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

    const mutationEpoch = scopeEpoch.value

    submitting.value = true
    error.value = null
    errorCode.value = null
    fieldErrors.value = {}

    try {
      await $fetch(`/api/vehicles/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: requestHeaders()
      })

      // Sinkronisasi ulang hanya setelah backend mengonfirmasi. Record juga
      // langsung dibuang agar daftar tetap benar walau refresh gagal.
      if (mutationEpoch === scopeEpoch.value) {
        removeItem(id)
        await refresh()
      }

      return true
    } catch (err) {
      // Konflik riwayat servis (409) tetap tercatat apa adanya; riwayat
      // TIDAK PERNAH dihapus otomatis dari sini.
      error.value = readError(err, 'Kendaraan belum dapat dihapus.')
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
    fetchOne,
    create,
    update,
    remove,
    clearError
  }
}
