import { clearNuxtState } from '#app'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ListItem, ListItemsResponse, ListSummary } from '~/types/lists'
import { useLists } from '~/composables/useLists'

// $fetch auto-import Nuxt berasal dari #build/fetch.mjs (bukan global),
// sehingga vi.stubGlobal tidak mempan. Mock modulnya langsung; runtime
// lain di-spread agar mountSuspended tetap utuh.
const fetchMock = vi.hoisted(() => vi.fn())

vi.mock('#build/fetch.mjs', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>

  return { ...original, $fetch: fetchMock }
})

// useState hanya valid di dalam konteks app Nuxt, jadi komposable dijalankan
// lewar harness yang di-mount suspended.
let latest: ReturnType<typeof useLists> | undefined

const ListsHarness = defineComponent({
  name: 'ListsHarness',
  setup() {
    const api = useLists()

    latest = api

    return api
  },
  render: () => null
})

async function mountLists(): Promise<ReturnType<typeof useLists>> {
  await mountSuspended(ListsHarness, { route: false })

  return latest!
}

function listsEnvelope(items: ListSummary[] = []): { success: boolean, data: ListSummary[] } {
  return { success: true, data: items }
}

function listItem(id: string = '01JLIST00000000000000000001'): ListSummary {
  return {
    id,
    household_id: 'h1',
    name: 'Shopping List',
    type: 'shopping',
    is_default: true,
    archived_at: null,
    counts: {
      active: 0,
      completed: 0
    },
    created_by: null,
    created_at: '2026-10-01T00:00:00.000000Z',
    updated_at: '2026-10-01T00:00:00.000000Z'
  }
}

function itemFixture(overrides: Partial<ListItem> = {}): ListItem {
  return {
    id: '01JLISTITEM00000000000000001',
    list_id: '01JLIST00000000000000000001',
    title: 'Beli Susu',
    quantity: '1',
    unit: 'pcs',
    estimated_price: '10000',
    actual_price: null,
    status: 'active',
    completed_at: null,
    completed_by: null,
    created_by: null,
    expense: null,
    created_at: '2026-10-01T00:00:00.000000Z',
    updated_at: '2026-10-01T00:00:00.000000Z',
    ...overrides
  }
}

function itemsEnvelope(
  active: ListItem[] = [],
  completed: ListItem[] = []
): { success: boolean, data: ListItemsResponse } {
  return {
    success: true,
    data: {
      list_id: '01JLIST00000000000000000001',
      counts: { active: active.length, completed: completed.length },
      active,
      completed
    }
  }
}

function expenseEnvelope(created = true): { success: boolean, data: unknown } {
  return {
    success: true,
    data: {
      created,
      expense: {
        id: '01JTRX00000000000000000001',
        household_id: 'h1',
        type: 'expense',
        amount: '50000.00',
        occurred_on: '2026-10-29',
        description: 'Beli Susu',
        wallet: 'Tunai',
        wallet_id: '01JWALLET0000000000000001',
        destination_wallet_id: null,
        source_wallet: { id: '01JWALLET0000000000000001', name: 'Tunai', type: 'cash', is_active: true },
        destination_wallet: null,
        category: null,
        bill_payment: null,
        created_at: '2026-10-29T00:00:00.000000Z',
        updated_at: '2026-10-29T00:00:00.000000Z'
      },
      item: itemFixture({ status: 'completed', actual_price: '50000.00' })
    }
  }
}

const STATE_KEYS = [
  'lists-pending',
  'lists-error',
  'lists-items',
  'lists-filters',
  'lists-submitting',
  'lists-field-errors',
  'lists-inflight',
  'lists-request-seq',
  'lists-default',
  'lists-items-detail',
  'lists-selected',
  'lists-item-selected'
]

beforeEach(() => {
  clearNuxtState(STATE_KEYS)
  fetchMock.mockReset()
  fetchMock.mockResolvedValue(listsEnvelope([listItem()]))
  latest = undefined
})

describe('useLists', () => {
  it('loadLists() mengambil /api/lists dan unwrap envelope list', async () => {
    const lists = await mountLists()

    await lists.loadLists()

    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, options] = fetchMock.mock.calls[0] as [string, { params: Record<string, unknown> }]

    expect(url).toBe('/api/lists')
    expect(options.params).toEqual({})
    expect(Array.isArray(lists.lists.value)).toBe(true)
    expect(lists.lists.value).toHaveLength(1)
    expect(lists.pending.value).toBe(false)
    expect(lists.error.value).toBeNull()
  })

  it('loadLists({include_archived:true}) mengirim param true (kontrak backend)', async () => {
    const lists = await mountLists()

    await lists.loadLists({ include_archived: true })

    const [, options] = fetchMock.mock.calls[0] as [string, { params: Record<string, unknown> }]

    expect(options.params).toEqual({ include_archived: 'true' })
    expect(lists.filters.value.include_archived).toBe(true)
  })

  it('dedupe in-flight: load ganda saat request berjalan hanya satu fetch', async () => {
    const lists = await mountLists()

    let release!: (value: unknown) => void

    const gate = new Promise((resolve) => {
      release = resolve as (value: unknown) => void
    })

    fetchMock.mockReturnValueOnce(gate)

    const first = lists.loadLists()
    const second = lists.loadLists()

    release(listsEnvelope([listItem()]))
    await Promise.all([first, second])

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('loadLists() ketiga dengan filter sama disingkat; refresh() memaksa reload', async () => {
    const lists = await mountLists()

    await lists.loadLists()
    await lists.loadLists()

    expect(fetchMock).toHaveBeenCalledTimes(1)

    await lists.refreshLists()

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('loadDefaultList() mengambil /api/lists/default dan handle LIST_REQUIRED', async () => {
    fetchMock.mockRejectedValueOnce({ statusCode: 409, data: { error: { code: 'DEFAULT_LIST_REQUIRED', message: 'Household must have a default active Shopping List.' } } })

    const lists = await mountLists()

    await lists.loadDefaultList()

    expect(lists.defaultList.value).toBeNull()
    expect(lists.error.value).toBe('List ini diarsipkan; aksi tidak diperbolehkan.')
  })

  it('loadDefaultList() sukses ketika default list ada', async () => {
    fetchMock.mockResolvedValueOnce({ success: true, data: listItem('01JLIST00000000000000000001') })

    const lists = await mountLists()

    await lists.loadDefaultList()

    expect(lists.defaultList.value).not.toBeNull()
    expect(lists.defaultList.value?.id).toBe('01JLIST00000000000000000001')
  })

  it('getList() mengambil /api/lists/{id}', async () => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce({ success: true, data: listItem('01JLIST00000000000000000002') })

    const lists = await mountLists()

    await lists.getList('01JLIST00000000000000000002')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/lists/01JLIST00000000000000000002')
    expect(lists.selectedList.value).not.toBeNull()
  })

  it('loadListItems() mengambil grup active/completed tanpa query param', async () => {
    fetchMock.mockReset()
    const active = itemFixture({ title: 'Aktif' })
    const completed = itemFixture({
      id: '01JLISTITEM00000000000000002',
      title: 'Selesai',
      status: 'completed',
      completed_at: '2026-10-28T00:00:00.000000Z'
    })
    fetchMock.mockResolvedValueOnce(itemsEnvelope([active], [completed]))

    const lists = await mountLists()

    const response = await lists.loadListItems('01JLIST00000000000000000001')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0] as [string, { params?: Record<string, unknown> }]
    expect(url).toBe('/api/lists/01JLIST00000000000000000001/items')
    expect(options.params).toBeUndefined()
    expect(response.counts).toEqual({ active: 1, completed: 1 })
    expect(response.active.map(item => item.title)).toEqual(['Aktif'])
    expect(response.completed.map(item => item.title)).toEqual(['Selesai'])
    // State datar tetap mengikuti urutan kontrak: active lalu completed.
    expect(lists.items.value.map(item => item.id)).toEqual([active.id, completed.id])
  })

  it('loadListItems() mengembalikan grup kosong saat fetch gagal', async () => {
    fetchMock.mockReset()
    fetchMock.mockRejectedValueOnce(new Error('network'))

    const lists = await mountLists()

    const response = await lists.loadListItems('01JLIST00000000000000000001')

    expect(response.counts).toEqual({ active: 0, completed: 0 })
    expect(response.active).toEqual([])
    expect(response.completed).toEqual([])
    expect(lists.error.value).toBe('Gagal memuat item list 01JLIST00000000000000000001')
  })

  it('createList() POST ke /api/lists dengan body valid', async () => {
    fetchMock.mockResolvedValueOnce({ success: true, data: listItem('01JLIST00000000000000000003') })

    const lists = await mountLists()

    await lists.createList({
      name: 'Belanja Bulanan',
      type: 'shopping'
    })

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body: Record<string, unknown> }]
    expect(url).toBe('/api/lists')
    expect(options.method).toBe('POST')
    expect(options.body).toEqual({ name: 'Belanja Bulanan', type: 'shopping' })
  })

  it('createList() 422 validasi field errors', async () => {
    fetchMock.mockRejectedValueOnce({ statusCode: 422, data: { data: { errors: { name: ['The name field is required.'] } } } })

    const lists = await mountLists()

    const saved = await lists.createList({
      name: '',
      type: 'shopping'
    })

    expect(saved).toBeNull()
    expect(lists.fieldErrors.value).toEqual({ name: 'Kolom nama wajib diisi.' })
    expect(lists.error.value).toBe('Kolom nama wajib diisi.')
  })

  it('updateList() PATCH ke /api/lists/{id}', async () => {
    fetchMock.mockResolvedValueOnce({ success: true, data: listItem('01JLIST00000000000000000004') })

    const lists = await mountLists()

    await lists.updateList('01JLIST00000000000000000001', { name: 'List Baru' })

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body: Record<string, unknown> }]
    expect(url).toBe('/api/lists/01JLIST00000000000000000001')
    expect(options.method).toBe('PATCH')
    expect(options.body).toEqual({ name: 'List Baru' })
  })

  it('archiveList() POST ke /api/lists/{id}/archive', async () => {
    fetchMock.mockResolvedValueOnce({ success: true, data: listItem('01JLIST00000000000000000005') })

    const lists = await mountLists()

    await lists.archiveList('01JLIST00000000000000000001')

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body?: unknown }]
    expect(url).toBe('/api/lists/01JLIST00000000000000000001/archive')
    expect(options.method).toBe('POST')
    expect(options.body).toBeUndefined()
  })

  it('restoreList() POST ke /api/lists/{id}/restore', async () => {
    fetchMock.mockResolvedValueOnce({ success: true, data: listItem('01JLIST00000000000000000006') })

    const lists = await mountLists()

    await lists.restoreList('01JLIST00000000000000000001')

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string }]
    expect(url).toBe('/api/lists/01JLIST00000000000000000001/restore')
    expect(options.method).toBe('POST')
  })

  it('createListItem() POST ke /api/lists/{id}/items', async () => {
    fetchMock
      .mockResolvedValueOnce({ success: true, data: itemFixture() })
      .mockResolvedValueOnce(itemsEnvelope([itemFixture()]))

    const lists = await mountLists()

    await lists.createListItem('01JLIST00000000000000000001', {
      title: 'Beli Susu',
      quantity: '1',
      unit: 'pcs'
    })

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body: Record<string, unknown> }]
    expect(url).toBe('/api/lists/01JLIST00000000000000000001/items')
    expect(options.method).toBe('POST')
    expect(options.body.title).toBe('Beli Susu')
    expect(options.body.quantity).toBe('1')
    expect(options.body.unit).toBe('pcs')
  })

  it('createListItem() 422 validasi field errors', async () => {
    fetchMock.mockRejectedValueOnce({ statusCode: 422, data: { data: { errors: { title: ['The title field is required.'] } } } })

    const lists = await mountLists()

    const created = await lists.createListItem('01JLIST00000000000000000001', {
      title: ''
    })

    expect(created).toBeNull()
    expect(lists.fieldErrors.value).toEqual({ title: 'Kolom judul wajib diisi.' })
  })

  it('getListItem() membaca item dari grup tanpa route nested', async () => {
    fetchMock.mockReset()
    const target = itemFixture()
    fetchMock.mockResolvedValueOnce(itemsEnvelope([target], []))

    const lists = await mountLists()

    const item = await lists.getListItem('01JLIST00000000000000000001', target.id)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/lists/01JLIST00000000000000000001/items')
    expect(item.id).toBe(target.id)
    expect(lists.selectedItem.value?.id).toBe(target.id)
  })

  it('getListItem() memberi error saat item tidak ada di kedua grup', async () => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce(itemsEnvelope([], []))

    const lists = await mountLists()

    const item = await lists.getListItem('01JLIST00000000000000000001', 'missing')

    expect(item.id).toBeUndefined()
    expect(lists.error.value).toBe('Item list tidak ditemukan.')
  })

  it('updateListItem() PATCH ke /api/lists/{id}/items/{itemId}', async () => {
    fetchMock
      .mockResolvedValueOnce({ success: true, data: itemFixture({ title: 'Beli Telur', quantity: '2' }) })
      .mockResolvedValueOnce(itemsEnvelope([itemFixture({ title: 'Beli Telur', quantity: '2' })]))

    const lists = await mountLists()

    await lists.updateListItem('01JLIST00000000000000000001', '01JLISTITEM00000000000000000001', { title: 'Beli Telur', quantity: '2' })

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body: Record<string, unknown> }]
    expect(url).toBe('/api/lists/01JLIST00000000000000000001/items/01JLISTITEM00000000000000000001')
    expect(options.method).toBe('PATCH')
    expect(options.body.title).toBe('Beli Telur')
    expect(options.body.quantity).toBe('2')
  })

  it('completeListItem() POST ke /api/lists/{id}/items/{itemId}/complete', async () => {
    fetchMock
      .mockResolvedValueOnce({ success: true, data: itemFixture({ status: 'completed', completed_at: '2026-10-28T00:00:00.000000Z' }) })
      .mockResolvedValueOnce(itemsEnvelope([], [itemFixture({ status: 'completed', completed_at: '2026-10-28T00:00:00.000000Z' })]))

    const lists = await mountLists()

    await lists.completeListItem('01JLIST00000000000000000001', '01JLISTITEM00000000000000000001')

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string }]
    expect(url).toBe('/api/lists/01JLIST00000000000000000001/items/01JLISTITEM00000000000000000001/complete')
    expect(options.method).toBe('POST')
  })

  it('uncompleteListItem() POST ke /api/lists/{id}/items/{itemId}/uncomplete', async () => {
    fetchMock
      .mockResolvedValueOnce({ success: true, data: itemFixture() })
      .mockResolvedValueOnce(itemsEnvelope([itemFixture()], []))

    const lists = await mountLists()

    await lists.uncompleteListItem('01JLIST00000000000000000001', '01JLISTITEM00000000000000000001')

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string }]
    expect(url).toBe('/api/lists/01JLIST00000000000000000001/items/01JLISTITEM00000000000000000001/uncomplete')
    expect(options.method).toBe('POST')
  })

  it('createListItemExpense() POST body kontrak dan unwrap {created, expense, item}', async () => {
    fetchMock
      .mockResolvedValueOnce(expenseEnvelope(true))
      .mockResolvedValueOnce(itemsEnvelope([], [itemFixture({ status: 'completed', actual_price: '50000.00' })]))

    const lists = await mountLists()

    const result = await lists.createListItemExpense('01JLIST00000000000000000001', '01JLISTITEM00000000000000000001', {
      wallet_id: '01JWALLET0000000000000001',
      actual_price: '50000'
    })

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body: Record<string, unknown> }]
    expect(url).toBe('/api/lists/01JLIST00000000000000000001/items/01JLISTITEM00000000000000000001/expense')
    expect(options.method).toBe('POST')
    expect(options.body).toEqual({
      wallet_id: '01JWALLET0000000000000001',
      actual_price: '50000'
    })
    expect(result?.created).toBe(true)
    expect(result?.expense.id).toBe('01JTRX00000000000000000001')
    expect(result?.item.id).toBe(itemFixture().id)
  })

  it('createListItemExpense() retry mengembalikan created=false', async () => {
    fetchMock
      .mockResolvedValueOnce(expenseEnvelope(false))
      .mockResolvedValueOnce(itemsEnvelope([], [itemFixture({ status: 'completed' })]))

    const lists = await mountLists()

    const result = await lists.createListItemExpense('01JLIST00000000000000000001', '01JLISTITEM00000000000000000001', {
      wallet_id: '01JWALLET0000000000000001'
    })

    const [, options] = fetchMock.mock.calls[0] as [string, { body: Record<string, unknown> }]
    expect(options.body).toEqual({ wallet_id: '01JWALLET0000000000000001' })
    expect(result?.created).toBe(false)
  })
})
