import type { MaybeRefOrGetter } from 'vue'
import type {
  VehicleObligationFormValues,
  VehicleObligationItem
} from '~/types/vehicleObligations'
import { readError, readErrorCode, readFieldErrors } from '~/composables/useApiError'
import {
  VEHICLE_OBLIGATION_STATUS_OPTIONS,
  parseObligationAmount
} from '~/utils/vehicleObligations'

// ---------------------------------------------------------------------------
// Kewajiban satu kendaraan: Browser -> Nuxt
// /api/vehicles/{id}/obligations -> Laravel -> PostgreSQL.
// List berupa array terurut backend (due_date lalu id), tanpa pagination.
// vehicle_id, household_id, id, dan timestamp TIDAK PERNAH dibentuk di sini:
// kendaraan berasal dari nested route + konteks session. Status create selalu
// server-managed (active); edit hanya boleh memilih active/inactive dan tidak
// pernah menurunkan status dari due_date.
//
// State disimpan per vehicle ID agar halaman detail yang berpindah kendaraan
// tidak pernah menampilkan data kendaraan sebelumnya. Setiap ID punya
// request-sequence sendiri sehingga respons lama tidak menimpa data baru.
// ---------------------------------------------------------------------------

const EMPTY = ''

interface VehicleObligationState {
  items: VehicleObligationItem[]
  pending: boolean
  submitting: boolean
  error: string | null
  errorCode: string | null
  fieldErrors: Record<string, string>
  inflight: boolean
  requestSeq: number
}

function emptyState(): VehicleObligationState {
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

// Urutan yang sama dengan backend (due_date lalu id) untuk hasil optimistis
// setelah create/update.
export function sortVehicleObligations(items: VehicleObligationItem[]): VehicleObligationItem[] {
  return [...items].sort((left, right) => {
    if (left.due_date !== right.due_date) {
      return left.due_date < right.due_date ? -1 : 1
    }

    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0
  })
}

function isObligationStatus(value: string): value is VehicleObligationFormValues['status'] {
  return VEHICLE_OBLIGATION_STATUS_OPTIONS.some(option => option.value === value)
}

export function useVehicleObligations(vehicleId: MaybeRefOrGetter<string>) {
  const currentId = computed(() => String(toValue(vehicleId) ?? ''))
  const store = useState<Record<string, VehicleObligationState>>('vehicle-obligations-store', () => ({}))

  function existingState(): VehicleObligationState | undefined {
    return store.value[currentId.value]
  }

  function ensureState(): VehicleObligationState {
    const id = currentId.value

    if (!store.value[id]) {
      store.value[id] = emptyState()
    }

    return store.value[id]!
  }

  const items = computed<VehicleObligationItem[]>(() => existingState()?.items ?? [])
  const pending = computed<boolean>(() => existingState()?.pending ?? false)
  const submitting = computed<boolean>(() => existingState()?.submitting ?? false)
  const error = computed<string | null>(() => existingState()?.error ?? null)
  const errorCode = computed<string | null>(() => existingState()?.errorCode ?? null)
  const fieldErrors = computed<Record<string, string>>(() => existingState()?.fieldErrors ?? {})

  function requestHeaders(): Record<string, string> {
    // Server-side rendering has no browser cookies of its own: forward
    // them explicitly so SSR resolves the real session (same pattern as
    // useVehicleMaintenance).
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
    return `/api/vehicles/${encodeURIComponent(id)}/obligations`
  }

  function recordPath(obligationId: string): string {
    return `${basePath()}/${encodeURIComponent(obligationId)}`
  }

  /**
   * Payload create/update: hanya field yang didukung FormRequest backend.
   * `status` tidak disertakan pada create (selalu active di server) dan
   * `vehicle_id`/`household_id`/id/timestamp tidak pernah dibentuk dari
   * browser. Field opsional kosong dikirim sebagai null.
   */
  function toPayload(
    values: VehicleObligationFormValues,
    mode: 'create' | 'update'
  ): Record<string, unknown> | null {
    const amount = parseObligationAmount(values.amount)
    const localErrors: Record<string, string> = {}

    if (amount.invalid) {
      localErrors.amount = 'Nominal harus berupa angka 0 atau lebih (maksimal dua desimal).'
    }

    if (values.obligation_type_id.trim() === '') {
      localErrors.obligation_type_id = 'Pilih jenis kewajiban.'
    }

    if (Object.keys(localErrors).length > 0) {
      ensureState().fieldErrors = localErrors

      return null
    }

    const description = values.description.trim()
    const payload: Record<string, unknown> = {
      obligation_type_id: values.obligation_type_id,
      title: values.title.trim(),
      description: description === EMPTY ? null : description,
      issued_date: values.issued_date === EMPTY ? null : values.issued_date,
      due_date: values.due_date,
      amount: amount.value
    }

    if (mode === 'update' && isObligationStatus(values.status)) {
      payload.status = values.status
    }

    return payload
  }

  async function load(force = false): Promise<void> {
    if (currentId.value === EMPTY) {
      return
    }

    const state = ensureState()

    if (state.inflight) {
      // Non-force loads deduplicate. A forced load (e.g. after a confirmed
      // mutation) supersedes the older request so its late response cannot
      // overwrite newer data.
      if (!force) {
        return
      }

      state.requestSeq += 1
      state.inflight = false
      state.pending = false
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
      const envelope = await $fetch<{ success: boolean, data: VehicleObligationItem[] }>(basePath(), {
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

      state.error = readError(err, 'Kewajiban belum dapat dimuat.')
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

  function upsert(record: VehicleObligationItem): void {
    const state = ensureState()
    const next = state.items.filter(item => item.id !== record.id)

    next.push(record)
    state.items = sortVehicleObligations(next)
  }

  async function create(values: VehicleObligationFormValues): Promise<VehicleObligationItem | null> {
    if (submitting.value || currentId.value === EMPTY) {
      return null
    }

    const state = ensureState()

    state.submitting = true
    state.error = null
    state.errorCode = null
    state.fieldErrors = {}

    try {
      const payload = toPayload(values, 'create')

      if (payload === null) {
        return null
      }

      const envelope = await $fetch<{ success: boolean, data: VehicleObligationItem }>(basePath(), {
        method: 'POST',
        body: payload,
        credentials: 'include',
        headers: requestHeaders()
      })

      // Server sudah mengonfirmasi: tampilkan record segera, lalu sinkronkan
      // ulang. Kegagalan refresh tidak membatalkan fakta server.
      upsert(envelope.data)
      await load(true)

      return envelope.data
    } catch (err) {
      state.error = readError(err, 'Kewajiban belum dapat disimpan.')
      state.errorCode = readErrorCode(err)
      state.fieldErrors = readFieldErrors(err)

      return null
    } finally {
      state.submitting = false
    }
  }

  async function update(
    obligationId: string,
    values: VehicleObligationFormValues
  ): Promise<VehicleObligationItem | null> {
    if (submitting.value || currentId.value === EMPTY) {
      return null
    }

    const state = ensureState()

    state.submitting = true
    state.error = null
    state.errorCode = null
    state.fieldErrors = {}

    try {
      const payload = toPayload(values, 'update')

      if (payload === null) {
        return null
      }

      const envelope = await $fetch<{ success: boolean, data: VehicleObligationItem }>(
        recordPath(obligationId),
        {
          method: 'PATCH',
          body: payload,
          credentials: 'include',
          headers: requestHeaders()
        }
      )

      upsert(envelope.data)
      await load(true)

      return envelope.data
    } catch (err) {
      state.error = readError(err, 'Perubahan kewajiban belum dapat disimpan.')
      state.errorCode = readErrorCode(err)
      state.fieldErrors = readFieldErrors(err)

      return null
    } finally {
      state.submitting = false
    }
  }

  async function remove(obligationId: string): Promise<boolean> {
    if (submitting.value || currentId.value === EMPTY) {
      return false
    }

    const state = ensureState()

    state.submitting = true
    state.error = null
    state.errorCode = null
    state.fieldErrors = {}

    try {
      await $fetch(recordPath(obligationId), {
        method: 'DELETE',
        credentials: 'include',
        headers: requestHeaders()
      })

      // Hanya setelah server mengonfirmasi record hilang dari daftar.
      state.items = state.items.filter(item => item.id !== obligationId)

      await load(true)

      return true
    } catch (err) {
      state.error = readError(err, 'Kewajiban belum dapat dihapus.')
      state.errorCode = readErrorCode(err)

      return false
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
    create,
    update,
    remove,
    clearError
  }
}
