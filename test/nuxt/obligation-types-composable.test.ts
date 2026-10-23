import { clearNuxtState } from '#app'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ObligationTypeItem } from '~/types/vehicleObligations'
import { useObligationTypes } from '~/composables/useObligationTypes'

const fetchMock = vi.hoisted(() => vi.fn())

vi.mock('#build/fetch.mjs', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>

  return { ...original, $fetch: fetchMock }
})

let latest: ReturnType<typeof useObligationTypes> | undefined

const TypesHarness = defineComponent({
  name: 'ObligationTypesHarness',
  setup() {
    const api = useObligationTypes()

    latest = api

    return api
  },
  render: () => null
})

async function mountTypes(): Promise<ReturnType<typeof useObligationTypes>> {
  await mountSuspended(TypesHarness, { route: false })

  return latest!
}

const SYSTEM_ID = '01J0TYPE0000000000000001'
const CUSTOM_ID = '01J0TYPE0000000000000002'

function typeItem(overrides: Partial<ObligationTypeItem> = {}): ObligationTypeItem {
  return {
    id: SYSTEM_ID,
    household_id: null,
    code: 'tax',
    name: 'Pajak Kendaraan',
    is_system: true,
    created_at: '2026-10-01T00:00:00.000000Z',
    updated_at: '2026-10-01T00:00:00.000000Z',
    ...overrides
  }
}

function customType(overrides: Partial<ObligationTypeItem> = {}): ObligationTypeItem {
  return typeItem({
    id: CUSTOM_ID,
    household_id: 'h1',
    code: null,
    name: 'Asuransi',
    is_system: false,
    ...overrides
  })
}

const STATE_KEYS = [
  'obligation-types-items',
  'obligation-types-pending',
  'obligation-types-submitting',
  'obligation-types-error',
  'obligation-types-error-code',
  'obligation-types-field-errors',
  'obligation-types-inflight',
  'obligation-types-request-seq'
]

beforeEach(() => {
  clearNuxtState(STATE_KEYS)
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({ success: true, data: [typeItem(), customType()] })
})

describe('useObligationTypes', () => {
  it('load() GET katalog sistem + custom dan unwrap envelope', async () => {
    const types = await mountTypes()

    await types.load()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/obligation-types')
    expect(types.items.value.map(item => item.name)).toEqual(['Pajak Kendaraan', 'Asuransi'])
    expect(types.pending.value).toBe(false)
  })

  it('create() POST hanya name lalu refresh', async () => {
    const types = await mountTypes()

    fetchMock.mockResolvedValueOnce({ success: true, data: customType() })
    fetchMock.mockResolvedValue({ success: true, data: [typeItem(), customType()] })

    const created = await types.create('  Asuransi  ')

    expect(created?.name).toBe('Asuransi')

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body: Record<string, unknown> }]

    expect(url).toBe('/api/obligation-types')
    expect(options.method).toBe('POST')
    expect(options.body).toEqual({ name: 'Asuransi' })
    // POST + refresh GET.
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('create() 422 duplikat dipetakan sebagai konflik yang jelas', async () => {
    const types = await mountTypes()

    fetchMock.mockRejectedValueOnce({
      statusCode: 422,
      data: {
        data: {
          success: false,
          error: {
            code: 'OBLIGATION_TYPE_ALREADY_EXISTS',
            message: 'Obligation type already exists.'
          }
        }
      }
    })

    const created = await types.create('Pajak Kendaraan')

    expect(created).toBeNull()
    expect(types.errorCode.value).toBe('OBLIGATION_TYPE_ALREADY_EXISTS')
    expect(types.error.value).toBe('Nama jenis tersebut sudah dipakai di rumah tangga ini.')
  })

  it('update() PATCH name ke tipe custom yang benar lalu refresh', async () => {
    const types = await mountTypes()

    fetchMock.mockResolvedValueOnce({ success: true, data: customType({ name: 'Asuransi kendaraan' }) })
    fetchMock.mockResolvedValue({ success: true, data: [typeItem(), customType({ name: 'Asuransi kendaraan' })] })

    const updated = await types.update(CUSTOM_ID, 'Asuransi kendaraan')

    expect(updated?.name).toBe('Asuransi kendaraan')

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body: Record<string, unknown> }]

    expect(url).toBe(`/api/obligation-types/${CUSTOM_ID}`)
    expect(options.method).toBe('PATCH')
    expect(options.body).toEqual({ name: 'Asuransi kendaraan' })
  })

  it('update() tipe bawaan 422 IMMUTABLE tidak mengubah katalog', async () => {
    const types = await mountTypes()

    await types.load()

    fetchMock.mockReset()
    fetchMock.mockRejectedValueOnce({
      statusCode: 422,
      data: {
        data: {
          success: false,
          error: { code: 'OBLIGATION_TYPE_IMMUTABLE', message: 'Immutable.' }
        }
      }
    })

    const updated = await types.update(SYSTEM_ID, 'Pajak baru')

    expect(updated).toBeNull()
    expect(types.errorCode.value).toBe('OBLIGATION_TYPE_IMMUTABLE')
    expect(types.error.value).toBe('Jenis bawaan tidak dapat diubah atau dihapus.')
    expect(types.items.value.map(item => item.name)).toEqual(['Pajak Kendaraan', 'Asuransi'])
  })

  it('remove() DELETE tipe custom lalu refresh', async () => {
    const types = await mountTypes()

    await types.load()

    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce({ success: true, data: { id: CUSTOM_ID } })
    fetchMock.mockResolvedValue({ success: true, data: [typeItem()] })

    const removed = await types.remove(CUSTOM_ID)

    expect(removed).toBe(true)
    expect(types.items.value.map(item => item.name)).toEqual(['Pajak Kendaraan'])

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string }]

    expect(url).toBe(`/api/obligation-types/${CUSTOM_ID}`)
    expect(options.method).toBe('DELETE')
  })

  it('remove() 422 IN_USE mempertahankan data dan menampilkan error server', async () => {
    const types = await mountTypes()

    await types.load()

    fetchMock.mockReset()
    fetchMock.mockRejectedValueOnce({
      statusCode: 422,
      data: {
        data: {
          success: false,
          error: {
            code: 'OBLIGATION_TYPE_IN_USE',
            message: 'Obligation type is in use.'
          }
        }
      }
    })

    const removed = await types.remove(CUSTOM_ID)

    expect(removed).toBe(false)
    expect(types.errorCode.value).toBe('OBLIGATION_TYPE_IN_USE')
    expect(types.error.value).toBe('Jenis ini masih dipakai kewajiban sehingga tidak dapat dihapus.')
    expect(types.items.value).toHaveLength(2)
  })

  it('double submit create dicegah saat request berjalan', async () => {
    const types = await mountTypes()

    let release!: (value: unknown) => void

    const gate = new Promise((resolve) => {
      release = resolve as (value: unknown) => void
    })

    fetchMock.mockReturnValueOnce(gate)

    const first = types.create('Asuransi')
    const second = await types.create('Asuransi')

    expect(second).toBeNull()

    release({ success: true, data: customType() })
    fetchMock.mockResolvedValue({ success: true, data: [typeItem(), customType()] })

    await first

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
