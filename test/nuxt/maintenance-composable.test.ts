import { clearNuxtState } from '#app'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MaintenanceFormValues, MaintenanceItem } from '~/types/maintenance'
import { useMaintenance } from '~/composables/useMaintenance'

// $fetch auto-import Nuxt berasal dari #build/fetch.mjs (bukan global),
// sehingga vi.stubGlobal tidak mempan. Mock modulnya langsung; runtime
// lain di-spread agar mountSuspended tetap utuh.
const fetchMock = vi.hoisted(() => vi.fn())

vi.mock('#build/fetch.mjs', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>

  return { ...original, $fetch: fetchMock }
})

// useState hanya valid di dalam konteks app Nuxt, jadi komposable dijalankan
// lewat harness yang di-mount suspended.
let latest: ReturnType<typeof useMaintenance> | undefined

const MaintenanceHarness = defineComponent({
  name: 'MaintenanceHarness',
  setup() {
    const api = useMaintenance()

    latest = api

    return api
  },
  render: () => null
})

async function mountMaintenance(): Promise<ReturnType<typeof useMaintenance>> {
  await mountSuspended(MaintenanceHarness, { route: false })

  return latest!
}

const MAINTENANCE_ID = '01J0MAINT0000000000000001'
const ASSET_ID = '01J0ASSET0000000000000001'

function maintenanceItem(overrides: Partial<MaintenanceItem> = {}): MaintenanceItem {
  return {
    id: MAINTENANCE_ID,
    household_id: 'h1',
    asset_id: ASSET_ID,
    title: 'Cuci AC kamar',
    description: 'Rutin bulanan',
    location: 'Kamar utama',
    scheduled_date: '2026-11-01',
    completed_at: null,
    cancelled_at: null,
    priority: 'rutin',
    status: 'scheduled',
    created_at: '2026-10-01T00:00:00.000000Z',
    updated_at: '2026-10-01T00:00:00.000000Z',
    ...overrides
  }
}

function formValues(overrides: Partial<MaintenanceFormValues> = {}): MaintenanceFormValues {
  return {
    asset_id: ASSET_ID,
    title: 'Cuci AC kamar',
    description: 'Rutin bulanan',
    location: 'Kamar utama',
    scheduled_date: '2026-11-01',
    priority: 'rutin',
    ...overrides
  }
}

const STATE_KEYS = [
  'maintenance-items',
  'maintenance-pending',
  'maintenance-submitting',
  'maintenance-error',
  'maintenance-field-errors',
  'maintenance-inflight',
  'maintenance-request-seq'
]

beforeEach(() => {
  clearNuxtState(STATE_KEYS)
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({ success: true, data: [maintenanceItem()] })
})

describe('useMaintenance', () => {
  it('load() mengambil /api/maintenance tanpa query dan unwrap envelope', async () => {
    const maintenance = await mountMaintenance()

    await maintenance.load()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/maintenance')
    expect(maintenance.items.value).toEqual([maintenanceItem()])
    expect(maintenance.pending.value).toBe(false)
    expect(maintenance.error.value).toBeNull()
  })

  it('load() ulang tanpa force memakai data segar (dedup)', async () => {
    const maintenance = await mountMaintenance()

    await maintenance.load()
    await maintenance.load()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('API 401 tercatat sebagai error tanpa data dan tanpa logout', async () => {
    fetchMock.mockRejectedValueOnce({ statusCode: 401, data: { message: 'Unauthenticated.' } })

    const maintenance = await mountMaintenance()

    await maintenance.load()

    expect(maintenance.items.value).toEqual([])
    expect(maintenance.error.value).toBe('Sesi berakhir. Silakan login kembali.')
    expect(maintenance.pending.value).toBe(false)
  })

  it('fetchOne() GET detail berdasarkan ID dan unwrap envelope', async () => {
    const maintenance = await mountMaintenance()

    fetchMock.mockResolvedValueOnce({ success: true, data: maintenanceItem({ title: 'Servis kulkas' }) })

    const detail = await maintenance.fetchOne(MAINTENANCE_ID)

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`/api/maintenance/${MAINTENANCE_ID}`)
    expect(detail.title).toBe('Servis kulkas')
  })

  it('create() POST hanya field kontrak — tanpa household_id/status/timestamp', async () => {
    const maintenance = await mountMaintenance()

    fetchMock.mockResolvedValueOnce({ success: true, data: maintenanceItem() })
    fetchMock.mockResolvedValue({ success: true, data: [maintenanceItem()] })

    // Field terlarang sengaja diselipkan: UI tidak boleh meneruskannya.
    const saved = await maintenance.create({
      ...formValues(),
      household_id: 'h-evil',
      status: 'completed',
      completed_at: '2026-11-02',
      cancelled_at: '2026-11-03',
      id: 'evil'
    } as unknown as MaintenanceFormValues)

    expect(saved?.title).toBe('Cuci AC kamar')

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body: Record<string, unknown> }]

    expect(url).toBe('/api/maintenance')
    expect(options.method).toBe('POST')
    expect(options.body).toEqual({
      asset_id: ASSET_ID,
      title: 'Cuci AC kamar',
      description: 'Rutin bulanan',
      location: 'Kamar utama',
      scheduled_date: '2026-11-01',
      priority: 'rutin'
    })
    expect(options.body).not.toHaveProperty('household_id')
    expect(options.body).not.toHaveProperty('status')
    expect(options.body).not.toHaveProperty('completed_at')
    expect(options.body).not.toHaveProperty('cancelled_at')
    expect(options.body).not.toHaveProperty('id')
    // POST + refresh GET.
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('create() memangkas string dan mengosongkan deskripsi sebagai null', async () => {
    const maintenance = await mountMaintenance()

    fetchMock.mockResolvedValueOnce({ success: true, data: maintenanceItem() })
    fetchMock.mockResolvedValue({ success: true, data: [maintenanceItem()] })

    await maintenance.create(formValues({
      title: '  Servis AC  ',
      description: '   ',
      location: '  Ruang tamu  '
    }))

    const options = fetchMock.mock.calls[0]?.[1] as { body: Record<string, unknown> }

    expect(options.body).toEqual({
      asset_id: ASSET_ID,
      title: 'Servis AC',
      description: null,
      location: 'Ruang tamu',
      scheduled_date: '2026-11-01',
      priority: 'rutin'
    })
  })

  it('create() 422 memetakan field error server dan tidak menambah item', async () => {
    const maintenance = await mountMaintenance()

    fetchMock.mockRejectedValueOnce({
      statusCode: 422,
      data: {
        message: 'The title field is required.',
        errors: { title: ['The title field is required.'] }
      }
    })

    const saved = await maintenance.create(formValues({ title: '' }))

    expect(saved).toBeNull()
    expect(maintenance.fieldErrors.value.title).toBe('Kolom judul wajib diisi.')
    expect(maintenance.error.value).toBe('Kolom judul wajib diisi.')
    expect(maintenance.items.value).toEqual([])
  })

  it('EMAIL_NOT_VERIFIED tampil sebagai pesan yang jelas', async () => {
    const maintenance = await mountMaintenance()

    fetchMock.mockRejectedValueOnce({
      statusCode: 403,
      data: {
        data: {
          success: false,
          error: { code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email address before continuing.' }
        }
      }
    })

    const saved = await maintenance.create(formValues())

    expect(saved).toBeNull()
    expect(maintenance.error.value).toBe('Email Anda belum terverifikasi. Silakan verifikasi terlebih dahulu.')
  })

  it('update() PATCH ke item dengan payload kontrak lalu refresh', async () => {
    const maintenance = await mountMaintenance()

    fetchMock.mockResolvedValueOnce({ success: true, data: maintenanceItem({ title: 'Servis baru' }) })
    fetchMock.mockResolvedValue({ success: true, data: [maintenanceItem({ title: 'Servis baru' })] })

    const saved = await maintenance.update(MAINTENANCE_ID, formValues({ title: 'Servis baru' }))

    expect(saved?.title).toBe('Servis baru')

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body: Record<string, unknown> }]

    expect(url).toBe(`/api/maintenance/${MAINTENANCE_ID}`)
    expect(options.method).toBe('PATCH')
    expect(options.body).toEqual({
      asset_id: ASSET_ID,
      title: 'Servis baru',
      description: 'Rutin bulanan',
      location: 'Kamar utama',
      scheduled_date: '2026-11-01',
      priority: 'rutin'
    })
    expect(options.body).not.toHaveProperty('household_id')
  })

  it('update() gagal mempertahankan list dan mencatat error', async () => {
    const maintenance = await mountMaintenance()

    await maintenance.load()

    fetchMock.mockReset()
    fetchMock.mockRejectedValueOnce({
      statusCode: 404,
      data: {
        data: {
          success: false,
          error: { code: 'MAINTENANCE_NOT_FOUND', message: 'Maintenance not found.' }
        }
      }
    })

    const saved = await maintenance.update(MAINTENANCE_ID, formValues())

    expect(saved).toBeNull()
    expect(maintenance.error.value).toBe('Catatan perawatan tidak ditemukan.')
    expect(maintenance.items.value).toHaveLength(1)
  })

  it('remove() DELETE lalu refresh; respons gagal tidak menghapus item', async () => {
    const maintenance = await mountMaintenance()

    await maintenance.load()

    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce({ success: true, data: { id: MAINTENANCE_ID } })
    fetchMock.mockResolvedValue({ success: true, data: [] })

    const ok = await maintenance.remove(MAINTENANCE_ID)

    expect(ok).toBe(true)
    expect(maintenance.items.value).toEqual([])

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string }]

    expect(url).toBe(`/api/maintenance/${MAINTENANCE_ID}`)
    expect(options.method).toBe('DELETE')
  })

  it('remove() yang ditolak mempertahankan list dan mengembalikan false', async () => {
    const maintenance = await mountMaintenance()

    await maintenance.load()

    fetchMock.mockReset()
    fetchMock.mockRejectedValueOnce({
      statusCode: 500,
      data: { message: 'Server error.' }
    })

    const ok = await maintenance.remove(MAINTENANCE_ID)

    expect(ok).toBe(false)
    expect(maintenance.error.value).toBe('Server error.')
    expect(maintenance.items.value).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('complete() POST tanpa body ke /complete lalu refresh', async () => {
    const maintenance = await mountMaintenance()

    fetchMock.mockResolvedValueOnce({
      success: true,
      data: maintenanceItem({ status: 'completed', completed_at: '2026-11-02' })
    })
    fetchMock.mockResolvedValue({ success: true, data: [maintenanceItem({ status: 'completed' })] })

    const result = await maintenance.complete(MAINTENANCE_ID)

    expect(result?.status).toBe('completed')

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body?: unknown }]

    expect(url).toBe(`/api/maintenance/${MAINTENANCE_ID}/complete`)
    expect(options.method).toBe('POST')
    expect(options.body).toBeUndefined()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('cancel() POST tanpa body ke /cancel lalu refresh', async () => {
    const maintenance = await mountMaintenance()

    fetchMock.mockResolvedValueOnce({
      success: true,
      data: maintenanceItem({ status: 'cancelled', cancelled_at: '2026-11-03' })
    })
    fetchMock.mockResolvedValue({ success: true, data: [maintenanceItem({ status: 'cancelled' })] })

    const result = await maintenance.cancel(MAINTENANCE_ID)

    expect(result?.status).toBe('cancelled')

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body?: unknown }]

    expect(url).toBe(`/api/maintenance/${MAINTENANCE_ID}/cancel`)
    expect(options.method).toBe('POST')
    expect(options.body).toBeUndefined()
  })

  it('complete() 422 MAINTENANCE_ALREADY_COMPLETED tampil sebagai pesan jelas tanpa sukses', async () => {
    const maintenance = await mountMaintenance()

    fetchMock.mockRejectedValueOnce({
      statusCode: 422,
      data: {
        data: {
          success: false,
          error: { code: 'MAINTENANCE_ALREADY_COMPLETED', message: 'Maintenance already completed.' }
        }
      }
    })

    const result = await maintenance.complete(MAINTENANCE_ID)

    expect(result).toBeNull()
    expect(maintenance.error.value).toBe('Perawatan ini sudah ditandai selesai.')
  })

  it('cancel() 422 MAINTENANCE_ALREADY_CANCELLED tampil sebagai pesan jelas', async () => {
    const maintenance = await mountMaintenance()

    fetchMock.mockRejectedValueOnce({
      statusCode: 422,
      data: {
        data: {
          success: false,
          error: { code: 'MAINTENANCE_ALREADY_CANCELLED', message: 'Maintenance already cancelled.' }
        }
      }
    })

    const result = await maintenance.cancel(MAINTENANCE_ID)

    expect(result).toBeNull()
    expect(maintenance.error.value).toBe('Perawatan ini sudah dibatalkan.')
  })

  it('double submit dicegah saat request berjalan', async () => {
    const maintenance = await mountMaintenance()

    let release!: (value: unknown) => void

    const gate = new Promise((resolve) => {
      release = resolve as (value: unknown) => void
    })

    fetchMock.mockReturnValueOnce(gate)

    const first = maintenance.create(formValues())
    const second = await maintenance.create(formValues())

    expect(second).toBeNull()

    release({ success: true, data: maintenanceItem() })
    fetchMock.mockResolvedValue({ success: true, data: [maintenanceItem()] })

    await first

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
