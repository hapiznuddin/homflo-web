import { clearNuxtState } from '#app'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ListSummary, ListItem, ListItemsResponse, ListsResponse } from '~/types/lists'
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

function listItemFormValues(overrides: Partial<ListItemFormValues> = {}): ListItemFormValues {
  return {
    title: 'Belanja Bulanan',
    amount: '50000',
    ...overrides
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
  'lists-request-seq'
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
    fetchMock.mockResolvedValueOnce({ success: true, data: { data: listItem('01JLIST00000000000000000001') } })

    const lists = await mountLists()

    await lists.loadDefaultList()

    expect(lists.defaultList.value).not.toBeNull()
    expect(lists.defaultList.value?.id).toBe('01JLIST00000000000000000001')
  })

  it('getList() mengambil /api/lists/{id}', async () => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce({ success: true, data: { data: listItem('01JLIST00000000000000000002') } })

    const lists = await mountLists()

    await lists.getList('01JLIST00000000000000000002')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/lists/01JLIST00000000000000000002')
    expect(lists.selectedList.value).not.toBeNull()
  })

  it('loadListItems() mengambil /api/lists/{id}/items', async () => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce({ success: true, data: { data: [] } })

    const lists = await mountLists()

    await lists.loadListItems('01JLIST00000000000000000001')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/lists/01JLIST00000000000000000001/items')
    expect(lists.items.value).toHaveLength(0)
  })

  it('loadListItems() dengan status active', async () => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce({ success: true, data: { data: [] } })

    const lists = await mountLists()

    await lists.loadListItems('01JLIST00000000000000000001', 'active')

    const [, options] = fetchMock.mock.calls[0] as [string, { params: Record<string, unknown> }]
    expect(options.params).toEqual({ status: 'active' })
  })

  it('loadListItems() dengan status completed', async () => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce({ success: true, data: { data: [] } })

    const lists = await mountLists()

    await lists.loadListItems('01JLIST00000000000000000001', 'completed')

    const [, options] = fetchMock.mock.calls[0] as [string, { params: Record<string, unknown> }]
    expect(options.params).toEqual({ status: 'completed' })
  })

  it('createList() POST ke /api/lists dengan body valid', async () => {
    fetchMock.mockResolvedValueOnce({ success: true, data: { data: listItem('01JLIST00000000000000000003') } })

    const lists = await mountLists()

    await lists.createList({
      title: 'Belanja Bulanan'
    })

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body: Record<string, unknown> }]
    expect(url).toBe('/api/lists')
    expect(options.method).toBe('POST')
    expect(options.body).toEqual({ title: 'Belanja Bulanan' })
  })

  it('createList() 422 validasi field errors', async () => {
    fetchMock.mockRejectedValueOnce({ statusCode: 422, data: { data: { errors: { title: ['The title field is required.'] } } } })

    const lists = await mountLists()

    const saved = await lists.createList({
      title: ''
    })

    expect(saved).toBeNull()
    expect(lists.fieldErrors.value).toEqual({ title: 'Kolom judul wajib diisi.' })
    expect(lists.error.value).toBe('Kolom judul wajib diisi.')
  })

  it('updateList() PATCH ke /api/lists/{id}', async () => {
    fetchMock.mockResolvedValueOnce({ success: true, data: { data: listItem('01JLIST00000000000000000004') } })

    const lists = await mountLists()

    await lists.updateList('01JLIST00000000000000000001', { name: 'List Baru' })

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body: Record<string, unknown> }]
    expect(url).toBe('/api/lists/01JLIST00000000000000000001')
    expect(options.method).toBe('PATCH')
    expect(options.body).toEqual({ name: 'List Baru' })
  })

  it('archiveList() POST ke /api/lists/{id}/archive', async () => {
    fetchMock.mockResolvedValueOnce({ success: true, data: { data: listItem('01JLIST00000000000000000005') } })

    const lists = await mountLists()

    await lists.archiveList('01JLIST00000000000000000001')

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body?: unknown }]
    expect(url).toBe('/api/lists/01JLIST00000000000000000001/archive')
    expect(options.method).toBe('POST')
    expect(options.body).toBeUndefined()
  })

  it('restoreList() POST ke /api/lists/{id}/restore', async () => {
    fetchMock.mockResolvedValueOnce({ success: true, data: { data: listItem('01JLIST00000000000000000006') } })

    const lists = await mountLists()

    await lists.restoreList('01JLIST00000000000000000001')

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string }]
    expect(url).toBe('/api/lists/01JLIST00000000000000000001/restore')
    expect(options.method).toBe('POST')
  })

  it('createListItem() POST ke /api/lists/{id}/items', async () => {
    fetchMock.mockResolvedValueOnce({ success: true, data: { data: { id: '01JLISTITEM00000000000000001', list_id: '01JLIST00000000000000000001', title: 'Beli Susu', quantity: '1', unit: 'pcs', estimated_price: '10000', actual_price: null, completed_at: null, created_at: '2026-10-01T00:00:00.000000Z', updated_at: '2026-10-01T00:00:00.000000Z' } } })

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

  it('getListItem() GET ke /api/lists/{id}/items/{itemId}', async () => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce({ success: true, data: { data: { id: '01JLISTITEM00000000000000001', list_id: '01JLIST00000000000000000001', title: 'Beli Susu', quantity: '1', unit: 'pcs', estimated_price: '10000', actual_price: null, completed_at: null, created_at: '2026-10-01T00:00:00.000000Z', updated_at: '2026-10-01T00:00:00.000000Z' } } })

    const lists = await mountLists()

    await lists.getListItem('01JLIST00000000000000000001', '01JLISTITEM00000000000000000001')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/lists/01JLIST00000000000000000001/items/01JLISTITEM00000000000000000001')
    expect(lists.selectedItem.value).not.toBeNull()
  })

  it('updateListItem() PATCH ke /api/lists/{id}/items/{itemId}', async () => {
    fetchMock.mockResolvedValueOnce({ success: true, data: { data: { id: '01JLISTITEM00000000000000001', list_id: '01JLIST00000000000000000001', title: 'Beli Telur', quantity: '2', unit: 'pcs', estimated_price: '10000', actual_price: null, completed_at: null, created_at: '2026-10-01T00:00:00.000000Z', updated_at: '2026-10-01T00:00:00.000000Z' } } })

    const lists = await mountLists()

    await lists.updateListItem('01JLIST00000000000000000001', '01JLISTITEM00000000000000000001', { title: 'Beli Telur', quantity: '2' })

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body: Record<string, unknown> }]
    expect(url).toBe('/api/lists/01JLIST00000000000000000001/items/01JLISTITEM00000000000000000001')
    expect(options.method).toBe('PATCH')
    expect(options.body.title).toBe('Beli Telur')
    expect(options.body.quantity).toBe('2')
  })

  it('completeListItem() POST ke /api/lists/{id}/items/{itemId}/complete', async () => {
    fetchMock.mockResolvedValueOnce({ success: true, data: { data: { id: '01JLISTITEM00000000000000001', list_id: '01JLIST00000000000000000001', title: 'Beli Susu', quantity: '1', unit: 'pcs', estimated_price: '10000', actual_price: null, completed_at: '2026-10-28T00:00:00.000000Z', created_at: '2026-10-01T00:00:00.000000Z', updated_at: '2026-10-28T00:00:00.000000Z' } } })

    const lists = await mountLists()

    await lists.completeListItem('01JLIST00000000000000000001', '01JLISTITEM00000000000000000001')

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string }]
    expect(url).toBe('/api/lists/01JLIST00000000000000000001/items/01JLISTITEM00000000000000000001/complete')
    expect(options.method).toBe('POST')
  })

  it('uncompleteListItem() POST ke /api/lists/{id}/items/{itemId}/uncomplete', async () => {
    fetchMock.mockResolvedValueOnce({ success: true, data: { data: { id: '01JLISTITEM00000000000000001', list_id: '01JLIST00000000000000000001', title: 'Beli Susu', quantity: '1', unit: 'pcs', estimated_price: '10000', actual_price: null, completed_at: null, created_at: '2026-10-01T00:00:00.000000Z', updated_at: '2026-10-28T00:00:00.000000Z' } } })

    const lists = await mountLists()

    await lists.uncompleteListItem('01JLIST00000000000000000001', '01JLISTITEM00000000000000000001')

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string }]
    expect(url).toBe('/api/lists/01JLIST00000000000000000001/items/01JLISTITEM00000000000000000001/uncomplete')
    expect(options.method).toBe('POST')
  })

  it('createListItemExpense() POST ke /api/lists/{id}/items/{itemId}/expense', async () => {
    fetchMock.mockResolvedValueOnce({ success: true, data: { data: { id: '01JLISTITEM00000000000000001', list_id: '01JLIST00000000000000000001', title: 'Beli Susu', quantity: '1', unit: 'pcs', estimated_price: '10000', actual_price: '50000', completed_at: null, created_at: '2026-10-01T00:00:00.000000Z', updated_at: '2026-10-28T00:00:00.000000Z' } } })

    const lists = await mountLists()

    await lists.createListItemExpense('01JLIST00000000000000000001', '01JLISTITEM00000000000000000001', '50000')

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body: Record<string, unknown> }]
    expect(url).toBe('/api/lists/01JLIST00000000000000000001/items/01JLISTITEM00000000000000000001/expense')
    expect(options.method).toBe('POST')
    expect(options.body.actual_price).toBe('50000')
  })

  it('createListItemExpense() tanpa actualPrice', async () => {
    fetchMock.mockResolvedValueOnce({ success: true, data: { data: { id: '01JLISTITEM00000000000000001', list_id: '01JLIST00000000000000000001', title: 'Beli Susu', quantity: '1', unit: 'pcs', estimated_price: '10000', actual_price: null, completed_at: null, created_at: '2026-10-01T00:00:00.000000Z', updated_at: '2026-10-28T00:00:00.000000Z' } } })

    const lists = await mountLists()

    await lists.createListItemExpense('01JLIST00000000000000000001', '01JLISTITEM00000000000000000001')

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body: Record<string, unknown> }]
    expect(url).toBe('/api/lists/01JLIST00000000000000000001/items/01JLISTITEM00000000000000000001/expense')
    expect(options.method).toBe('POST')
    expect(options.body).toEqual({})
  })
})