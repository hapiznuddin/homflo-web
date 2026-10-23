import type { MaybeRefOrGetter } from 'vue'
import type { VehicleMaintenanceFormValues, VehicleMaintenanceItem } from '~/types/vehicleMaintenance'
import { readError, readErrorCode, readFieldErrors } from '~/composables/useApiError'

// ---------------------------------------------------------------------------
// Riwayat servis satu kendaraan: Browser -> Nuxt
// /api/vehicles/{id}/maintenance -> Laravel -> PostgreSQL.
// List berupa array terurut backend (scheduled_date lalu id), tanpa pagination.
// vehicle_id, household_id, status, dan completed_at TIDAK PERNAH dibentuk di
// sini: kendaraan berasal dari nested route + konteks session, lifecycle hanya
// dari aksi Complete backend.
//
// State disimpan per vehicle ID agar halaman detail yang berpindah kendaraan
// tidak pernah menampilkan data kendaraan sebelumnya. Setiap ID punya
// request-sequence sendiri sehingga respons lama tidak menimpa data baru.
// ---------------------------------------------------------------------------

const EMPTY = ''

interface VehicleMaintenanceState {
  items: VehicleMaintenanceItem[]
  pending: boolean
  submitting: boolean
  error: string | null
  errorCode: string | null
  fieldErrors: Record<string, string>
  inflight: boolean
  requestSeq: number
}

function emptyState(): VehicleMaintenanceState {
  return {
    items: [],
    pending: false,
    submitting: false,
    error: null,
    errorCode: null,
    fieldErrors: {},
    inflight: false,
    requestSeq: 0
  }
}

export function useVehicleMaintenance(vehicleId: MaybeRefOrGetter<string>) {
  const currentId = computed(() => String(toValue(vehicleId) ?? ''))
  const store = useState<Record<string, VehicleMaintenanceState>>('vehicle-maintenance-store', () => ({}))

  function existingState(): VehicleMaintenanceState | undefined {
    return store.value[currentId.value]
  }

  // Kembalikan proxy reaktif dari store (bukan objek mentah yang baru dibuat)
  // agar perubahan flag/error tetap memicu render.
  function ensureState(): VehicleMaintenanceState {
    const id = currentId.value

    if (!store.value[id]) {
      store.value[id] = emptyState()
    }

    return store.value[id]!
  }

  const items = computed<VehicleMaintenanceItem[]>(() => existingState()?.items ?? [])
  const pending = computed<boolean>(() => existingState()?.pending ?? false)
  const submitting = computed<boolean>(() => existingState()?.submitting ?? false)
  const error = computed<string | null>(() => existingState()?.error ?? null)
  const errorCode = computed<string | null>(() => existingState()?.errorCode ?? null)
  const fieldErrors = computed<Record<string, string>>(() => existingState()?.fieldErrors ?? {})

  function requestHeaders(): Record<string, string> {
    // Server-side rendering has no browser cookies of its own: forward
    // them explicitly so SSR resolves the real session instead of always
    // looking like a guest (same pattern as useVehicles).
    const headers: Record<string, string> = { Accept: 'application/json' }

    if (import.meta.server) {
      const { cookie } = useRequestHeaders(['cookie'])

      if (cookie) {
        headers.Cookie = cookie
      }
    }

    return headers
  }

  function basePath(id = currentId.value): string {
    return `/api/vehicles/${encodeURIComponent(id)}/maintenance`
  }

  function recordPath(maintenanceId: string): string {
    return `${basePath()}/${encodeURIComponent(maintenanceId)}`
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
   * description kosong dikirim sebagai null; odometer kosong juga null dan
   * nilai negatif/bukan bilangan bulat ditolak sebelum request. Field
   * server-managed tidak pernah disertakan.
   */
  function toPayload(values: VehicleMaintenanceFormValues): Record<string, unknown> | null {
    const odometer = parseInteger(values.odometer, 0, 2147483647)
    const localErrors: Record<string, string> = {}

    if (odometer === 'invalid') {
      localErrors.odometer = 'Odometer harus berupa bilangan bulat 0 atau lebih.'
    }

    if (Object.keys(localErrors).length > 0) {
      ensureState().fieldErrors = localErrors

      return null
    }

    const description = values.description.trim()

    return {
      title: values.title.trim(),
      description: description === EMPTY ? null : description,
      scheduled_date: values.scheduled_date,
      odometer
    }
  }

  async function load(force = false): Promise<void> {
    if (currentId.value === EMPTY) {
      return
    }

    const state = ensureState()

    if (state.inflight) {
      return
    }

    // Already have fresh data.
    if (!force && state.items.length > 0 && !state.error) {
      return
    }

    state.inflight = true
    state.pending = true
    state.error = null
    state.errorCode = null
    state.fieldErrors = {}
    state.requestSeq += 1

    const current = state.requestSeq

    try {
      const envelope = await $fetch<{ success: boolean, data: VehicleMaintenanceItem[] }>(basePath(), {
        credentials: 'include',
        headers: requestHeaders()
      })

      if (current !== state.requestSeq) {
        return
      }

      // Server route meneruskan envelope Laravel apa adanya; unwrap di sini.
      state.items = envelope.data
    } catch (err) {
      if (current !== state.requestSeq) {
        return
      }

      state.error = readError(err, 'Riwayat servis belum dapat dimuat.')
      state.errorCode = readErrorCode(err)
    } finally {
      if (current === state.requestSeq) {
        state.pending = false
        state.inflight = false
      }
    }
  }

  async function refresh(): Promise<void> {
    await load(true)
  }

  async function fetchOne(maintenanceId: string): Promise<VehicleMaintenanceItem> {
    const envelope = await $fetch<{ success: boolean, data: VehicleMaintenanceItem }>(
      recordPath(maintenanceId),
      {
        credentials: 'include',
        headers: requestHeaders()
      }
    )

    return envelope.data
  }

  async function create(values: VehicleMaintenanceFormValues): Promise<VehicleMaintenanceItem | null> {
    if (submitting.value || currentId.value === EMPTY) {
      return null
    }

    const state = ensureState()

    state.submitting = true
    state.error = null
    state.errorCode = null
    state.fieldErrors = {}

    try {
      const payload = toPayload(values)

      if (payload === null) {
        return null
      }

      const envelope = await $fetch<{ success: boolean, data: VehicleMaintenanceItem }>(basePath(), {
        method: 'POST',
        body: payload,
        credentials: 'include',
        headers: requestHeaders()
      })

      await load(true)

      return envelope.data
    } catch (err) {
      state.error = readError(err, 'Catatan servis belum dapat disimpan.')
      state.errorCode = readErrorCode(err)
      state.fieldErrors = readFieldErrors(err)

      return null
    } finally {
      state.submitting = false
    }
  }

  async function update(
    maintenanceId: string,
    values: VehicleMaintenanceFormValues
  ): Promise<VehicleMaintenanceItem | null> {
    if (submitting.value || currentId.value === EMPTY) {
      return null
    }

    const state = ensureState()

    state.submitting = true
    state.error = null
    state.errorCode = null
    state.fieldErrors = {}

    try {
      const payload = toPayload(values)

      if (payload === null) {
        return null
      }

      const envelope = await $fetch<{ success: boolean, data: VehicleMaintenanceItem }>(
        recordPath(maintenanceId),
        {
          method: 'PATCH',
          body: payload,
          credentials: 'include',
          headers: requestHeaders()
        }
      )

      await load(true)

      return envelope.data
    } catch (err) {
      state.error = readError(err, 'Perubahan catatan servis belum dapat disimpan.')
      state.errorCode = readErrorCode(err)
      state.fieldErrors = readFieldErrors(err)

      return null
    } finally {
      state.submitting = false
    }
  }

  async function remove(maintenanceId: string): Promise<boolean> {
    if (submitting.value || currentId.value === EMPTY) {
      return false
    }

    const state = ensureState()

    state.submitting = true
    state.error = null
    state.errorCode = null
    state.fieldErrors = {}

    try {
      await $fetch(recordPath(maintenanceId), {
        method: 'DELETE',
        credentials: 'include',
        headers: requestHeaders()
      })

      // Server sudah mengonfirmasi: hilangkan record dari daftar segera,
      // lalu sinkronkan ulang dengan server.
      state.items = state.items.filter(item => item.id !== maintenanceId)

      await load(true)

      return true
    } catch (err) {
      state.error = readError(err, 'Catatan servis belum dapat dihapus.')
      state.errorCode = readErrorCode(err)

      return false
    } finally {
      state.submitting = false
    }
  }

  /**
   * Aksi lifecycle Complete: endpoint khusus (POST), tanpa body. Status baru
   * dianggap berubah setelah backend mengonfirmasi; 422
   * VEHICLE_MAINTENANCE_ALREADY_COMPLETED / 404 dipetakan readError menjadi
   * pesan jelas dan TIDAK menghasilkan sukses.
   */
  async function complete(maintenanceId: string): Promise<VehicleMaintenanceItem | null> {
    if (submitting.value || currentId.value === EMPTY) {
      return null
    }

    const state = ensureState()

    state.submitting = true
    state.error = null
    state.errorCode = null
    state.fieldErrors = {}

    try {
      const envelope = await $fetch<{ success: boolean, data: VehicleMaintenanceItem }>(
        `${recordPath(maintenanceId)}/complete`,
        {
          method: 'POST',
          credentials: 'include',
          headers: requestHeaders()
        }
      )

      // Status hanya berubah setelah server mengonfirmasi. Terapkan record
      // hasil server lebih dulu agar lifecycle tetap benar walau refresh
      // daftar berikutnya gagal.
      const index = state.items.findIndex(item => item.id === envelope.data.id)

      if (index !== -1) {
        state.items[index] = envelope.data
      }

      await load(true)

      return envelope.data
    } catch (err) {
      state.error = readError(err, 'Servis belum dapat ditandai selesai.')
      state.errorCode = readErrorCode(err)

      return null
    } finally {
      state.submitting = false
    }
  }

  function clearError(): void {
    const state = existingState()

    if (!state) {
      return
    }

    state.error = null
    state.errorCode = null
    state.fieldErrors = {}
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
    complete,
    clearError
  }
}
