import { clearNuxtState } from '#app'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PropertyFormValues, PropertyItem } from '~/types/properties'
import { useProperties } from '~/composables/useProperties'

// $fetch auto-import Nuxt berasal dari #build/fetch.mjs (bukan global),
// sehingga vi.stubGlobal tidak mempan. Mock modulnya langsung; runtime
// lain di-spread agar mountSuspended tetap utuh.
const fetchMock = vi.hoisted(() => vi.fn())

vi.mock('#build/fetch.mjs', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>

  return { ...original, $fetch: fetchMock }
})

const authMock = vi.hoisted(() => ({
  household: { value: { id: 'h1', name: 'Rumah Budi', role: 'owner' } }
}))

mockNuxtImport('useAuth', () => () => authMock)

let latest: ReturnType<typeof useProperties> | undefined

const PropertiesHarness = defineComponent({
  name: 'PropertiesHarness',
  setup() {
    const api = useProperties()

    latest = api

    return api
  },
  render: () => null
})

async function mountProperties(): Promise<ReturnType<typeof useProperties>> {
  await mountSuspended(PropertiesHarness, { route: false })

  return latest!
}

function propertyItem(overrides: Partial<PropertyItem> = {}): PropertyItem {
  return {
    id: '01J0PROPERTY00000000000001',
    household_id: 'h1',
    name: 'Rumah utama',
    type: 'house',
    address: 'Jl. Mawar 1',
    description: 'Rumah keluarga',
    ownership_status: 'owned',
    notes: 'Kunci di pos',
    archived_at: null,
    created_at: '2026-10-01T00:00:00.000000Z',
    updated_at: '2026-10-01T00:00:00.000000Z',
    ...overrides
  }
}

function formValues(overrides: Partial<PropertyFormValues> = {}): PropertyFormValues {
  return {
    name: 'Rumah utama',
    type: 'house',
    address: 'Jl. Mawar 1',
    ownership_status: 'owned',
    description: 'Rumah keluarga',
    notes: 'Kunci di pos',
    ...overrides
  }
}

const STATE_KEYS = [
  'properties-items',
  'properties-filters',
  'properties-pending',
  'properties-submitting',
  'properties-error',
  'properties-error-code',
  'properties-field-errors',
  'properties-inflight',
  'properties-request-seq',
  'properties-scope',
  'properties-scope-epoch'
]

beforeEach(() => {
  clearNuxtState(STATE_KEYS)
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({ success: true, data: [propertyItem()] })
})

describe('useProperties', () => {
  it('load() default hanya meminta properti aktif dan unwrap envelope', async () => {
    const properties = await mountProperties()

    await properties.load()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/properties')

    const options = fetchMock.mock.calls[0]?.[1] as { params: Record<string, string> }

    expect(options.params).toEqual({})
    expect(properties.items.value).toEqual([propertyItem()])
    expect(properties.pending.value).toBe(false)
    expect(properties.error.value).toBeNull()
  })

  it('load({ include_archived: true }) meneruskan query kontrak', async () => {
    const properties = await mountProperties()

    fetchMock.mockResolvedValueOnce({
      success: true,
      data: [propertyItem(), propertyItem({ id: '01J0PROPERTY00000000000002', archived_at: '2026-10-02T00:00:00Z' })]
    })

    await properties.load({ include_archived: true })

    const options = fetchMock.mock.calls[0]?.[1] as { params: Record<string, string> }

    expect(options.params).toEqual({ include_archived: 'true' })
    expect(properties.filters.value).toEqual({ include_archived: true })
    expect(properties.items.value).toHaveLength(2)
  })

  it('load() filter yang sama memakai data segar (dedup)', async () => {
    const properties = await mountProperties()

    await properties.load()
    await properties.load()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('create() POST hanya field kontrak — household_id/id/archived_at dibuang', async () => {
    const properties = await mountProperties()

    fetchMock.mockResolvedValueOnce({ success: true, data: propertyItem() })
    fetchMock.mockResolvedValue({ success: true, data: [propertyItem()] })

    const saved = await properties.create({
      ...formValues(),
      household_id: 'h-evil',
      id: 'evil',
      archived_at: '2026-10-01T00:00:00Z'
    } as unknown as PropertyFormValues)

    expect(saved?.name).toBe('Rumah utama')

    const [url, options] = fetchMock.mock.calls[0] as [
      string,
      { method: string, body: Record<string, unknown> }
    ]

    expect(url).toBe('/api/properties')
    expect(options.method).toBe('POST')
    expect(options.body).toEqual({
      name: 'Rumah utama',
      type: 'house',
      address: 'Jl. Mawar 1',
      ownership_status: 'owned',
      description: 'Rumah keluarga',
      notes: 'Kunci di pos'
    })
    expect(options.body).not.toHaveProperty('household_id')
    expect(options.body).not.toHaveProperty('id')
    expect(options.body).not.toHaveProperty('archived_at')
    // POST + refresh GET.
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('create() memangkas field dan mengosongkan field opsional sebagai null', async () => {
    const properties = await mountProperties()

    fetchMock.mockResolvedValueOnce({ success: true, data: propertyItem() })
    fetchMock.mockResolvedValue({ success: true, data: [propertyItem()] })

    await properties.create(formValues({
      name: '  Rumah baru  ',
      address: '  Jl. Baru  ',
      description: '   ',
      notes: ''
    }))

    const options = fetchMock.mock.calls[0]?.[1] as { body: Record<string, unknown> }

    expect(options.body).toEqual({
      name: 'Rumah baru',
      type: 'house',
      address: 'Jl. Baru',
      ownership_status: 'owned',
      description: null,
      notes: null
    })
  })

  it('create() menolak field wajib/enum tidak valid tanpa mengirim request', async () => {
    const properties = await mountProperties()

    const saved = await properties.create(formValues({
      name: ' ',
      type: undefined,
      address: '',
      ownership_status: undefined
    }))

    expect(saved).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(properties.fieldErrors.value.name).toBe('Nama properti wajib diisi.')
    expect(properties.fieldErrors.value.type).toBe('Tipe properti wajib dipilih.')
    expect(properties.fieldErrors.value.address).toBe('Alamat wajib diisi.')
    expect(properties.fieldErrors.value.ownership_status).toBe('Status kepemilikan wajib dipilih.')
  })

  it('create() 422 memetakan field error server tanpa menambah item', async () => {
    const properties = await mountProperties()

    fetchMock.mockRejectedValueOnce({
      statusCode: 422,
      data: {
        message: 'The address field is required.',
        errors: { address: ['The address field is required.'] }
      }
    })

    const saved = await properties.create(formValues({ address: 'Jl. Valid 1' }))

    expect(saved).toBeNull()
    expect(properties.fieldErrors.value.address).toBe('Kolom alamat wajib diisi.')
    expect(properties.error.value).toBe('Kolom alamat wajib diisi.')
    expect(properties.items.value).toEqual([])
  })

  it('update() 409 PROPERTY_ARCHIVED mempertahankan pesan dan kode domain', async () => {
    const properties = await mountProperties()

    fetchMock.mockRejectedValueOnce({
      statusCode: 409,
      data: {
        data: {
          success: false,
          error: {
            code: 'PROPERTY_ARCHIVED',
            message: 'Property is archived and cannot be edited. Use restore endpoint to reactivate.'
          }
        }
      }
    })

    const saved = await properties.update(
      '01J0PROPERTY00000000000001',
      formValues({ name: 'Nama baru' })
    )

    expect(saved).toBeNull()
    expect(properties.errorCode.value).toBe('PROPERTY_ARCHIVED')
    expect(properties.error.value).toBe(
      'Properti sudah diarsipkan. Pulihkan terlebih dahulu sebelum mengubahnya.'
    )
    expect(properties.items.value).toEqual([])
  })

  it('archive() POST ke endpoint archive lalu memperbarui daftar', async () => {
    const properties = await mountProperties()
    const archived = propertyItem({ archived_at: '2026-10-02T00:00:00.000000Z' })

    fetchMock.mockResolvedValueOnce({ success: true, data: archived })
    fetchMock.mockResolvedValue({ success: true, data: [archived] })

    const saved = await properties.archive('01J0PROPERTY00000000000001')

    expect(saved?.archived_at).toBe('2026-10-02T00:00:00.000000Z')

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string }]

    expect(url).toBe('/api/properties/01J0PROPERTY00000000000001/archive')
    expect(options.method).toBe('POST')
    expect(properties.items.value).toEqual([archived])
  })

  it('restore() POST ke endpoint restore lalu memperbarui daftar', async () => {
    const properties = await mountProperties()

    fetchMock.mockResolvedValueOnce({ success: true, data: propertyItem() })
    fetchMock.mockResolvedValue({ success: true, data: [propertyItem()] })

    const saved = await properties.restore('01J0PROPERTY00000000000001')

    expect(saved?.archived_at).toBeNull()

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string }]

    expect(url).toBe('/api/properties/01J0PROPERTY00000000000001/restore')
    expect(options.method).toBe('POST')
    expect(properties.items.value).toEqual([propertyItem()])
  })

  it('double submit dicegah saat request berjalan', async () => {
    const properties = await mountProperties()
    let release!: (value: unknown) => void

    fetchMock.mockReturnValueOnce(new Promise((resolve) => {
      release = resolve
    }))
    fetchMock.mockResolvedValue({ success: true, data: [propertyItem()] })

    const first = properties.create(formValues())
    const second = properties.create(formValues())

    expect(await second).toBeNull()

    release({ success: true, data: propertyItem() })
    await first
  })
})
