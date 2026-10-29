import { clearNuxtState } from '#app'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CategoryItem } from '~/types/categories'
import { useCategories } from '~/composables/useCategories'

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
let latest: ReturnType<typeof useCategories> | undefined

const CategoriesHarness = defineComponent({
  name: 'CategoriesHarness',
  setup() {
    const api = useCategories()

    latest = api

    return api
  },
  render: () => null
})

async function mountCategories(): Promise<ReturnType<typeof useCategories>> {
  await mountSuspended(CategoriesHarness, { route: false })

  return latest!
}

function catItem(overrides: Partial<CategoryItem> = {}): CategoryItem {
  return {
    id: '01J0000000000000000000001',
    name: 'Dapur',
    icon: 'i-lucide-cooking-pot',
    type: 'expense',
    ...overrides
  }
}

const STATE_KEYS = [
  'categories-items',
  'categories-pending',
  'categories-submitting',
  'categories-error',
  'categories-field-errors',
  'categories-inflight',
  'categories-loaded',
  'categories-request-seq'
]

beforeEach(() => {
  clearNuxtState(STATE_KEYS)
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({ success: true, data: [catItem()] })
})

describe('useCategories', () => {
  it('load() mengambil /api/categories dan unwrap envelope', async () => {
    const cat = await mountCategories()

    await cat.load()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/categories')
    expect(cat.items.value).toEqual([catItem()])
    expect(cat.pending.value).toBe(false)
    expect(cat.error.value).toBeNull()
    expect(cat.loaded.value).toBe(true)
  })

  it('load() ulang tanpa force memakai data segar (dedup)', async () => {
    const cat = await mountCategories()

    await cat.load()
    await cat.load()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('daftar kosong yang berhasil dimuat tetap dianggap termuat', async () => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({ success: true, data: [] })

    const cat = await mountCategories()

    await cat.load()
    await cat.load()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(cat.items.value).toEqual([])
    expect(cat.loaded.value).toBe(true)
  })

  it('API 401 tercatat sebagai error tanpa data dan tanpa logout', async () => {
    fetchMock.mockRejectedValueOnce({ statusCode: 401, data: { message: 'Unauthenticated.' } })

    const cat = await mountCategories()

    await cat.load()

    expect(cat.items.value).toEqual([])
    expect(cat.error.value).toBe('Sesi berakhir. Silakan login kembali.')
    expect(cat.pending.value).toBe(false)
    expect(cat.loaded.value).toBe(false)
  })

  it('create() POST name/type/icon lalu refresh daftar', async () => {
    const cat = await mountCategories()

    await cat.load()

    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce({ success: true, data: catItem({ id: '01J0000000000000000000002', name: 'Transport' }) })
    fetchMock.mockResolvedValue({ success: true, data: [catItem(), catItem({ id: '01J0000000000000000000002', name: 'Transport' })] })

    const saved = await cat.create({ name: '  Transport  ', icon: '', type: 'expense' })

    expect(saved?.name).toBe('Transport')

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body: Record<string, unknown> }]

    expect(url).toBe('/api/categories')
    expect(options.method).toBe('POST')
    expect(options.body).toEqual({ name: 'Transport', icon: null, type: 'expense' })
    // POST + refresh GET.
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(cat.items.value).toHaveLength(2)
  })

  it('create() duplikat memetakan field error tanpa menambah item', async () => {
    const cat = await mountCategories()

    fetchMock.mockRejectedValueOnce({
      statusCode: 422,
      data: {
        data: {
          success: false,
          error: { code: 'CATEGORY_ALREADY_EXISTS', message: 'Category already exists in this household.' }
        }
      }
    })

    const saved = await cat.create({ name: 'Dapur', icon: '', type: 'expense' })

    expect(saved).toBeNull()
    expect(cat.error.value).toContain('sudah dipakai')
    expect(cat.items.value).toEqual([])
  })

  it('update() PATCH ke item dan refresh', async () => {
    const cat = await mountCategories()

    fetchMock.mockResolvedValueOnce({ success: true, data: catItem({ name: 'Dapur Bersih', type: 'income' }) })
    fetchMock.mockResolvedValue({ success: true, data: [catItem({ name: 'Dapur Bersih', type: 'income' })] })

    const saved = await cat.update('01J0000000000000000000001', { name: 'Dapur Bersih', icon: 'i-lucide-sparkles', type: 'income' })

    expect(saved?.name).toBe('Dapur Bersih')

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body: Record<string, unknown> }]

    expect(url).toBe('/api/categories/01J0000000000000000000001')
    expect(options.method).toBe('PATCH')
    expect(options.body).toEqual({ name: 'Dapur Bersih', icon: 'i-lucide-sparkles', type: 'income' })
  })

  it('remove() DELETE lalu refresh; gagal tidak menghilangkan item', async () => {
    const cat = await mountCategories()

    await cat.load()
    expect(cat.items.value).toHaveLength(1)

    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce({ success: true, data: { id: '01J0000000000000000000001' } })
    fetchMock.mockResolvedValue({ success: true, data: [] })

    const ok = await cat.remove('01J0000000000000000000001')

    expect(ok).toBe(true)
    expect(cat.items.value).toEqual([])
  })

  it('remove() yang ditolak budget menjelaskan tanpa menghapus list', async () => {
    const cat = await mountCategories()

    await cat.load()

    fetchMock.mockReset()
    fetchMock.mockRejectedValueOnce({
      statusCode: 422,
      data: {
        data: {
          success: false,
          error: { code: 'CATEGORY_IN_USE', message: 'Category is still used by a budget.' }
        }
      }
    })

    const ok = await cat.remove('01J0000000000000000000001')

    expect(ok).toBe(false)
    expect(cat.error.value).toContain('anggaran')
    // List lokal dipertahankan; sinkronisasi ulang tidak terjadi.
    expect(cat.items.value).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('double submit dicegah saat request berjalan', async () => {
    const cat = await mountCategories()

    let release!: (value: unknown) => void

    const gate = new Promise((resolve) => {
      release = resolve as (value: unknown) => void
    })

    fetchMock.mockReturnValueOnce(gate)

    const first = cat.create({ name: 'Baru', icon: '', type: 'expense' })
    const second = await cat.create({ name: 'Baru', icon: '', type: 'expense' })

    expect(second).toBeNull()

    release({ success: true, data: catItem() })
    await first

    // Satu POST + satu refresh; submit kedua tertolak saat submitting.
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
