import { clearNuxtState } from '#app'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AssetFormValues, AssetItem } from '~/types/assets'
import { useAssets } from '~/composables/useAssets'

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
let latest: ReturnType<typeof useAssets> | undefined

const AssetsHarness = defineComponent({
  name: 'AssetsHarness',
  setup() {
    const api = useAssets()

    latest = api

    return api
  },
  render: () => null
})

async function mountAssets(): Promise<ReturnType<typeof useAssets>> {
  await mountSuspended(AssetsHarness, { route: false })

  return latest!
}

function assetItem(overrides: Partial<AssetItem> = {}): AssetItem {
  return {
    id: '01J0ASSET0000000000000001',
    household_id: 'h1',
    name: 'Kulkas dapur',
    description: 'Dua pintu',
    location: 'Dapur',
    acquired_on: '2026-01-15',
    acquisition_cost: '4500000.00',
    created_at: '2026-01-15T00:00:00.000000Z',
    updated_at: '2026-01-15T00:00:00.000000Z',
    property_id: null,
    property: null,
    ...overrides
  }
}

function formValues(overrides: Partial<AssetFormValues> = {}): AssetFormValues {
  return {
    name: 'Kulkas dapur',
    description: 'Dua pintu',
    location: 'Dapur',
    acquired_on: '2026-01-15',
    acquisition_cost: '4500000',
    property_id: 'none',
    ...overrides
  }
}

const STATE_KEYS = [
  'assets-items',
  'assets-pending',
  'assets-submitting',
  'assets-error',
  'assets-field-errors',
  'assets-inflight',
  'assets-request-seq'
]

beforeEach(() => {
  clearNuxtState(STATE_KEYS)
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({ success: true, data: [assetItem()] })
})

describe('useAssets', () => {
  it('load() mengambil /api/assets dan unwrap envelope', async () => {
    const assets = await mountAssets()

    await assets.load()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/assets')
    expect(assets.items.value).toEqual([assetItem()])
    expect(assets.pending.value).toBe(false)
    expect(assets.error.value).toBeNull()
  })

  it('load() mempertahankan property_id dan nested summary archived dari response', async () => {
    const assets = await mountAssets()
    const propertyId = '01J0PROPERTY00000000000001'

    fetchMock.mockResolvedValueOnce({
      success: true,
      data: [assetItem({
        property_id: propertyId,
        property: { id: propertyId, name: 'Rumah lama', archived_at: '2026-10-01T00:00:00Z' }
      })]
    })

    await assets.load()

    expect(assets.items.value[0]?.property_id).toBe(propertyId)
    expect(assets.items.value[0]?.property).toEqual({
      id: propertyId,
      name: 'Rumah lama',
      archived_at: '2026-10-01T00:00:00Z'
    })
  })

  it('load() ulang tanpa force memakai data segar (dedup)', async () => {
    const assets = await mountAssets()

    await assets.load()
    await assets.load()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('API 401 tercatat sebagai error tanpa data dan tanpa logout', async () => {
    fetchMock.mockRejectedValueOnce({ statusCode: 401, data: { message: 'Unauthenticated.' } })

    const assets = await mountAssets()

    await assets.load()

    expect(assets.items.value).toEqual([])
    expect(assets.error.value).toBe('Sesi berakhir. Silakan login kembali.')
    expect(assets.pending.value).toBe(false)
  })

  it('fetchOne() GET detail berdasarkan ID dan unwrap envelope', async () => {
    const assets = await mountAssets()

    fetchMock.mockResolvedValueOnce({ success: true, data: assetItem({ name: 'Lemari' }) })

    const detail = await assets.fetchOne('01J0ASSET0000000000000002')

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/assets/01J0ASSET0000000000000002')
    expect(detail.name).toBe('Lemari')
  })

  it('create() POST hanya field kontrak — tanpa household_id/id/timestamp', async () => {
    const assets = await mountAssets()

    fetchMock.mockResolvedValueOnce({ success: true, data: assetItem() })
    fetchMock.mockResolvedValue({ success: true, data: [assetItem()] })

    // household_id sengaja diselipkan: UI tidak boleh meneruskannya.
    const saved = await assets.create({
      ...formValues(),
      household_id: 'h-evil',
      id: 'evil',
      property: { id: '01J0PROPERTY00000000000001', name: 'Rumah utama', archived_at: null }
    } as unknown as AssetFormValues)

    expect(saved?.name).toBe('Kulkas dapur')

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body: Record<string, unknown> }]

    expect(url).toBe('/api/assets')
    expect(options.method).toBe('POST')
    expect(options.body).toEqual({
      name: 'Kulkas dapur',
      description: 'Dua pintu',
      location: 'Dapur',
      acquired_on: '2026-01-15',
      acquisition_cost: '4500000',
      property_id: null
    })
    expect(options.body).not.toHaveProperty('household_id')
    expect(options.body).not.toHaveProperty('property')
    expect(options.body).not.toHaveProperty('id')
    expect(options.body).not.toHaveProperty('created_at')
    // POST + refresh GET.
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('create() menormalkan biaya koma dan mengosongkan field opsional sebagai null', async () => {
    const assets = await mountAssets()

    fetchMock.mockResolvedValueOnce({ success: true, data: assetItem() })
    fetchMock.mockResolvedValue({ success: true, data: [assetItem()] })

    await assets.create(formValues({
      name: '  Sofa  ',
      description: '   ',
      location: '',
      acquired_on: '',
      acquisition_cost: '4500000,50'
    }))

    const options = fetchMock.mock.calls[0]?.[1] as { body: Record<string, unknown> }

    expect(options.body).toEqual({
      name: 'Sofa',
      description: null,
      location: null,
      acquired_on: null,
      acquisition_cost: '4500000.50',
      property_id: null
    })
  })

  it('create() mengirim property_id aktif yang dipilih', async () => {
    const assets = await mountAssets()

    fetchMock.mockResolvedValueOnce({
      success: true,
      data: assetItem({ property_id: '01J0PROPERTY00000000000001', property: {
        id: '01J0PROPERTY00000000000001',
        name: 'Rumah utama',
        archived_at: null
      } })
    })
    fetchMock.mockResolvedValue({ success: true, data: [] })

    await assets.create(formValues({ property_id: '01J0PROPERTY00000000000001' }))

    const options = fetchMock.mock.calls[0]?.[1] as { body: Record<string, unknown> }

    expect(options.body.property_id).toBe('01J0PROPERTY00000000000001')
  })

  it('update() "Tanpa properti" mengirim null untuk detach', async () => {
    const assets = await mountAssets()

    fetchMock.mockResolvedValueOnce({ success: true, data: assetItem() })
    fetchMock.mockResolvedValue({ success: true, data: [] })

    await assets.update('01J0ASSET0000000000000001', formValues({ property_id: 'none' }))

    const options = fetchMock.mock.calls[0]?.[1] as { body: Record<string, unknown> }

    expect(options.body.property_id).toBeNull()
  })

  it('update() relasi archived yang sama mempertahankan property_id tanpa detach', async () => {
    const assets = await mountAssets()
    const propertyId = '01J0PROPERTY00000000000001'

    fetchMock.mockResolvedValueOnce({
      success: true,
      data: assetItem({
        property_id: propertyId,
        property: { id: propertyId, name: 'Rumah lama', archived_at: '2026-10-01T00:00:00Z' }
      })
    })
    fetchMock.mockResolvedValue({ success: true, data: [] })

    await assets.update('01J0ASSET0000000000000001', formValues({ property_id: propertyId }))

    const options = fetchMock.mock.calls[0]?.[1] as { body: Record<string, unknown> }

    expect(options.body.property_id).toBe(propertyId)
  })

  it('update() 409 PROPERTY_ARCHIVED menampilkan arahan restore tanpa mengubah list', async () => {
    const assets = await mountAssets()

    await assets.load()
    fetchMock.mockReset()
    fetchMock.mockRejectedValueOnce({
      statusCode: 409,
      data: {
        data: {
          success: false,
          error: { code: 'PROPERTY_ARCHIVED', message: 'Property is archived.' }
        }
      }
    })

    const saved = await assets.update(
      '01J0ASSET0000000000000001',
      formValues({ property_id: '01J0PROPERTY00000000000002' })
    )

    expect(saved).toBeNull()
    expect(assets.error.value).toBe(
      'Properti sudah diarsipkan. Pulihkan terlebih dahulu sebelum mengubahnya.'
    )
    expect(assets.items.value).toHaveLength(1)
  })

  it('create() 404 PROPERTY_NOT_FOUND tampil jelas tanpa menyentuh auth state', async () => {
    const assets = await mountAssets()

    fetchMock.mockRejectedValueOnce({
      statusCode: 404,
      data: {
        data: {
          success: false,
          error: { code: 'PROPERTY_NOT_FOUND', message: 'Property not found.' }
        }
      }
    })

    const saved = await assets.create(formValues({ property_id: '01J0PROPERTY00000000000009' }))

    expect(saved).toBeNull()
    expect(assets.error.value).toBe('Properti tidak ditemukan.')
    expect(assets.items.value).toEqual([])
  })

  it('create() 422 property_id memetakan field error ke label properti', async () => {
    const assets = await mountAssets()

    fetchMock.mockRejectedValueOnce({
      statusCode: 422,
      data: {
        message: 'The property id must be a valid ULID.',
        errors: { property_id: ['The property_id must be a valid ULID.'] }
      }
    })

    const saved = await assets.create(formValues({ property_id: 'bukan-ulid' }))

    expect(saved).toBeNull()
    expect(assets.fieldErrors.value.property_id).toBe('Kolom properti harus berupa ID yang valid.')
    expect(assets.error.value).toBe('Kolom properti harus berupa ID yang valid.')
  })

  it('create() menolak biaya tidak valid tanpa mengirim request', async () => {
    const assets = await mountAssets()

    const saved = await assets.create(formValues({ acquisition_cost: '4.500.000' }))

    expect(saved).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(assets.fieldErrors.value.acquisition_cost).toContain('harus berupa angka')
  })

  it('create() 422 memetakan field error server dan tidak menambah item', async () => {
    const assets = await mountAssets()

    fetchMock.mockRejectedValueOnce({
      statusCode: 422,
      data: {
        message: 'The name field is required.',
        errors: { name: ['The name field is required.'] }
      }
    })

    const saved = await assets.create(formValues({ name: '' }))

    expect(saved).toBeNull()
    expect(assets.fieldErrors.value.name).toBe('Kolom nama wajib diisi.')
    expect(assets.error.value).toBe('Kolom nama wajib diisi.')
    expect(assets.items.value).toEqual([])
  })

  it('EMAIL_NOT_VERIFIED tampil sebagai pesan yang jelas', async () => {
    const assets = await mountAssets()

    fetchMock.mockRejectedValueOnce({
      statusCode: 403,
      data: {
        data: {
          success: false,
          error: { code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email address before continuing.' }
        }
      }
    })

    const saved = await assets.create(formValues())

    expect(saved).toBeNull()
    expect(assets.error.value).toBe('Email Anda belum terverifikasi. Silakan verifikasi terlebih dahulu.')
  })

  it('update() PATCH ke item dengan payload kontrak lalu refresh', async () => {
    const assets = await mountAssets()

    fetchMock.mockResolvedValueOnce({ success: true, data: assetItem({ name: 'Kulkas baru' }) })
    fetchMock.mockResolvedValue({ success: true, data: [assetItem({ name: 'Kulkas baru' })] })

    const saved = await assets.update('01J0ASSET0000000000000001', formValues({ name: 'Kulkas baru' }))

    expect(saved?.name).toBe('Kulkas baru')

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body: Record<string, unknown> }]

    expect(url).toBe('/api/assets/01J0ASSET0000000000000001')
    expect(options.method).toBe('PATCH')
    expect(options.body).toEqual({
      name: 'Kulkas baru',
      description: 'Dua pintu',
      location: 'Dapur',
      acquired_on: '2026-01-15',
      acquisition_cost: '4500000',
      property_id: null
    })
    expect(options.body).not.toHaveProperty('household_id')
  })

  it('update() gagal mempertahankan list dan mencatat error', async () => {
    const assets = await mountAssets()

    await assets.load()

    fetchMock.mockReset()
    fetchMock.mockRejectedValueOnce({
      statusCode: 404,
      data: {
        data: {
          success: false,
          error: { code: 'ASSET_NOT_FOUND', message: 'Asset not found.' }
        }
      }
    })

    const saved = await assets.update('01J0ASSET0000000000000001', formValues())

    expect(saved).toBeNull()
    expect(assets.error.value).toBe('Aset tidak ditemukan.')
    expect(assets.items.value).toHaveLength(1)
  })

  it('remove() DELETE lalu refresh; respons gagal tidak menghapus item', async () => {
    const assets = await mountAssets()

    await assets.load()

    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce({ success: true, data: { id: '01J0ASSET0000000000000001' } })
    fetchMock.mockResolvedValue({ success: true, data: [] })

    const ok = await assets.remove('01J0ASSET0000000000000001')

    expect(ok).toBe(true)
    expect(assets.items.value).toEqual([])

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string }]

    expect(url).toBe('/api/assets/01J0ASSET0000000000000001')
    expect(options.method).toBe('DELETE')
  })

  it('remove() yang ditolak mempertahankan list dan mengembalikan false', async () => {
    const assets = await mountAssets()

    await assets.load()

    fetchMock.mockReset()
    fetchMock.mockRejectedValueOnce({
      statusCode: 500,
      data: { message: 'Server error.' }
    })

    const ok = await assets.remove('01J0ASSET0000000000000001')

    expect(ok).toBe(false)
    expect(assets.error.value).toBe('Server error.')
    expect(assets.items.value).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('double submit dicegah saat request berjalan', async () => {
    const assets = await mountAssets()

    let release!: (value: unknown) => void

    const gate = new Promise((resolve) => {
      release = resolve as (value: unknown) => void
    })

    fetchMock.mockReturnValueOnce(gate)

    const first = assets.create(formValues())
    const second = await assets.create(formValues())

    expect(second).toBeNull()

    release({ success: true, data: assetItem() })
    fetchMock.mockResolvedValue({ success: true, data: [assetItem()] })

    await first

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
