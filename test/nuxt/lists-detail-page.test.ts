import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { DOMWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import type { ListItem, ListItemsResponse, ListSummary } from '~/types/lists'
import DetailPage from '~/pages/lists/[id].vue'

// Halaman detail /lists/[id] (Phase 3): render item dua grup, CRUD item,
// complete/uncomplete, read-only untuk list arsip, Expense owner-only dan
// immutable. Backend tetap otoritas (LIST_ARCHIVED, LIST_ITEM_HAS_EXPENSE,
// LIST_ITEM_PRICE_LOCKED, FORBIDDEN).

const LIST_ID = '01JLIST00000000000000000001'

const authMock = vi.hoisted(() => ({
  user: {
    value: {
      id: 'u1',
      username: 'budi',
      name: 'Budi Santoso',
      email: 'budi@example.com',
      email_verified_at: '2026-01-01T00:00:00.000Z'
    }
  },
  household: { value: { id: 'h1', name: 'Rumah Budi', role: 'owner' } },
  onboarding: { value: { required: false } },
  isHouseholdOwner: { value: true },
  bootstrap: vi.fn(async () => 'authenticated'),
  logout: vi.fn()
}))

mockNuxtImport('useAuth', () => () => authMock)

const toastMock = vi.hoisted(() => ({ add: vi.fn() }))

mockNuxtImport('useToast', () => () => toastMock)

const listsMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useLists', () => () => listsMock.api)

const walletsMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useWallets', () => () => walletsMock.api)

const categoriesMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useCategories', () => () => categoriesMock.api)

interface MockListsApi {
  getList: Ref<unknown> | ReturnType<typeof vi.fn>
  loadListItems: ReturnType<typeof vi.fn>
  createListItem: ReturnType<typeof vi.fn>
  updateListItem: ReturnType<typeof vi.fn>
  deleteListItem: ReturnType<typeof vi.fn>
  completeListItem: ReturnType<typeof vi.fn>
  uncompleteListItem: ReturnType<typeof vi.fn>
  createListItemExpense: ReturnType<typeof vi.fn>
  clearError: ReturnType<typeof vi.fn>
  submitting: Ref<boolean>
  error: Ref<string | null>
  errorCode: Ref<string | null>
  fieldErrors: Ref<Record<string, string>>
  LIST_ERROR_CODES: Record<string, string>
}

function sampleList(overrides: Partial<ListSummary> = {}): ListSummary {
  return {
    id: LIST_ID,
    household_id: 'h1',
    name: 'Shopping List',
    type: 'shopping',
    is_default: true,
    archived_at: null,
    counts: { active: 1, completed: 1 },
    created_by: null,
    created_at: '2026-10-01T00:00:00.000000Z',
    updated_at: '2026-10-01T00:00:00.000000Z',
    ...overrides
  }
}

function itemFixture(overrides: Partial<ListItem> = {}): ListItem {
  return {
    id: '01JLISTITEM00000000000000001',
    list_id: LIST_ID,
    title: 'Beli Susu',
    quantity: '1',
    unit: 'pcs',
    estimated_price: '10000.00',
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

function completedItem(overrides: Partial<ListItem> = {}): ListItem {
  return itemFixture({
    id: '01JLISTITEM00000000000000002',
    title: 'Beli Telur',
    status: 'completed',
    completed_at: '2026-10-28T00:00:00.000000Z',
    ...overrides
  })
}

function itemsResponse(active: ListItem[], completed: ListItem[]): ListItemsResponse {
  return {
    list_id: LIST_ID,
    counts: { active: active.length, completed: completed.length },
    active,
    completed
  }
}

function setupListsState(overrides: {
  list?: ListSummary | null
  items?: ListItemsResponse | null
} = {}): MockListsApi {
  const list = overrides.list === undefined ? sampleList() : overrides.list
  const items = overrides.items === undefined
    ? itemsResponse([itemFixture()], [completedItem()])
    : overrides.items

  const api: MockListsApi = {
    getList: vi.fn(async () => list),
    loadListItems: vi.fn(async () => items as ListItemsResponse),
    createListItem: vi.fn(async () => itemFixture()),
    updateListItem: vi.fn(async () => itemFixture()),
    deleteListItem: vi.fn(async () => true),
    completeListItem: vi.fn(async () => completedItem()),
    uncompleteListItem: vi.fn(async () => itemFixture()),
    createListItemExpense: vi.fn(async () => ({
      created: true,
      expense: {},
      item: completedItem()
    })),
    clearError: vi.fn(),
    submitting: ref(false),
    error: ref(null),
    errorCode: ref(null),
    fieldErrors: ref({}),
    LIST_ERROR_CODES: {
      NOT_FOUND: 'LIST_NOT_FOUND',
      ARCHIVED: 'LIST_ARCHIVED'
    }
  }

  listsMock.api = api

  return api
}

function setWallets(): void {
  walletsMock.api = {
    items: ref([
      {
        id: 'w1',
        household_id: 'h1',
        name: 'Kas Tunai',
        type: 'cash',
        opening_balance: '0.00',
        is_active: true,
        balance: '250000.00',
        created_at: '2026-10-01T00:00:00.000000Z',
        updated_at: '2026-10-01T00:00:00.000000Z'
      }
    ]),
    pending: ref(false),
    error: ref(null),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {})
  }
}

function setCategories(): void {
  categoriesMock.api = {
    items: ref([
      { id: 'c1', name: 'Sembako', icon: null, type: 'expense' },
      { id: 'c2', name: 'Gaji', icon: null, type: 'income' }
    ]),
    pending: ref(false),
    error: ref(null),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {})
  }
}

async function mountDetail() {
  return mountSuspended(DetailPage, { route: `/lists/${LIST_ID}` })
}

async function flush(): Promise<void> {
  for (let index = 0; index < 5; index++) {
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

// UModal me-render via teleport ke document.body.
function bodyButton(label: string): DOMWrapper<Element> {
  const element = Array.from(document.body.querySelectorAll('button'))
    .find(button => (button.textContent ?? '').trim() === label)

  if (!element) {
    throw new Error(`Tombol "${label}" tidak ditemukan di modal`)
  }

  return new DOMWrapper(element)
}

function bodyText(): string {
  return document.body.textContent ?? ''
}

beforeEach(() => {
  authMock.isHouseholdOwner.value = true
  toastMock.add.mockClear()
  setWallets()
  setCategories()
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('lists detail page', () => {
  it('render item dua grup dengan status dan tombol aksi aktif', async () => {
    setupListsState()

    const wrapper = await mountDetail()
    const text = wrapper.text()

    expect(text).toContain('Shopping List')
    expect(text).toContain('Aktif (1)')
    expect(text).toContain('Completed (1)')
    expect(text).toContain('Beli Susu')
    expect(text).toContain('Beli Telur')

    const labels = wrapper.findAll('button').map(button => button.text())
    expect(labels.join(' ')).toContain('Tambah Item')
    expect(labels.join(' ')).toContain('Selesai')
    expect(labels.join(' ')).toContain('Hapus')
  })

  it('empty state menampilkan tombol tambah item', async () => {
    setupListsState({ items: itemsResponse([], []) })

    const wrapper = await mountDetail()

    expect(wrapper.text()).toContain('Belum ada item di list ini.')
    expect(wrapper.findAll('button').some(button => button.text().includes('Tambah Item'))).toBe(true)
  })

  it('list arsip read-only: tanpa Tambah/Edit/Selesai/Hapus', async () => {
    setupListsState({
      list: sampleList({ archived_at: '2026-10-30T00:00:00.000000Z' })
    })

    const wrapper = await mountDetail()

    const labels = wrapper.findAll('button').map(button => button.text()).join(' ')
    expect(wrapper.text()).toContain('List diarsipkan')
    expect(labels).not.toContain('Tambah Item')
    expect(labels).not.toContain('Edit')
    expect(labels).not.toContain('Hapus')
    expect(labels).not.toContain('Batalkan selesai')
    // Item dan expense tetap terbaca.
    expect(wrapper.text()).toContain('Beli Susu')
  })

  it('klik Selesai membuka modal dan submit memanggil completeListItem dengan actual_price', async () => {
    const state = setupListsState()

    const wrapper = await mountDetail()

    const complete = wrapper.findAll('button').find(button => button.text().trim() === 'Selesai')

    if (!complete) {
      throw new Error('Tombol Selesai tidak ditemukan')
    }

    await complete.trigger('click')
    await flush()

    // Modal complete terisi harga aktual opsional (kosong); submit langsung.
    const submit = bodyButton('Selesaikan')
    await submit.trigger('submit')
    await flush()

    expect(state.completeListItem).toHaveBeenCalledWith(LIST_ID, '01JLISTITEM00000000000000001', {
      actual_price: undefined
    })
  })

  it('complete item memanggil complete dengan form kosong diizinkan', async () => {
    const state = setupListsState({ items: itemsResponse([itemFixture()], []) })

    const wrapper = await mountDetail()

    const complete = wrapper.findAll('button').find(button => button.text().trim() === 'Selesai')

    await complete!.trigger('click')
    await flush()
    await bodyButton('Selesaikan').trigger('submit')
    await flush()

    expect(state.completeListItem).toHaveBeenCalledTimes(1)
  })

  it('batalkan selesai memanggil uncompleteListItem tanpa modal', async () => {
    const state = setupListsState()

    const wrapper = await mountDetail()

    const uncomplete = wrapper.findAll('button').find(button => button.text().includes('Batalkan selesai'))

    await uncomplete!.trigger('click')
    await flush()

    expect(state.uncompleteListItem).toHaveBeenCalledWith(LIST_ID, '01JLISTITEM00000000000000002')
  })

  it('hapus item dengan konfirmasi memanggil deleteListItem', async () => {
    const state = setupListsState()

    const wrapper = await mountDetail()

    const remove = wrapper.findAll('button').find(button => button.text().trim() === 'Hapus')

    await remove!.trigger('click')
    await flush()

    const confirm = bodyButton('Hapus')
    await confirm.trigger('click')
    await flush()

    expect(state.deleteListItem).toHaveBeenCalledWith(LIST_ID, '01JLISTITEM00000000000000001')
  })

  it('item yang memiliki expense: tanpa Hapus/Expense, expense tampil terkunci', async () => {
    setupListsState({
      items: itemsResponse([], [completedItem({
        expense: {
          id: '01JTRX00000000000000001',
          amount: '12000.00',
          occurred_on: '2026-10-29',
          wallet: { id: 'w1', name: 'Kas Tunai', type: 'cash', is_active: true },
          category: { id: 'c1', name: 'Sembako', icon: null },
          created_at: '2026-10-29T00:00:00.000000Z'
        },
        actual_price: '12000.00'
      })])
    })

    const wrapper = await mountDetail()
    const labels = wrapper.findAll('button').map(button => button.text()).join(' ')

    expect(wrapper.text()).toContain('Expense Rp 12.000,00')
    expect(wrapper.text()).toContain('terkunci')
    expect(labels).not.toContain('Hapus')
    expect(labels).not.toContain('Catat Expense')
    expect(labels).not.toContain('Harga aktual')
  })

  it('expense owner-only: anggota tidak melihat tombol Catat Expense', async () => {
    authMock.isHouseholdOwner.value = false
    setupListsState({ items: itemsResponse([], [completedItem()]) })

    const wrapper = await mountDetail()
    const labels = wrapper.findAll('button').map(button => button.text()).join(' ')

    expect(labels).not.toContain('Catat Expense')
    // Member tetap bisa mengubah harga aktual dan status item.
    expect(labels).toContain('Batalkan selesai')
  })

  it('owner membuka modal Expense; tanpa dompet aktif submit tidak terkirim', async () => {
    const state = setupListsState({ items: itemsResponse([], [completedItem()]) })

    const wrapper = await mountDetail()

    const expenseButton = wrapper.findAll('button').find(button => button.text().includes('Catat Expense'))

    await expenseButton!.trigger('click')
    await flush()

    expect(state.createListItemExpense).not.toHaveBeenCalled()
    // Submit button dinonaktifkan karena wallet belum dipilih.
    const submit = bodyButton('Catat Expense')
    expect((submit.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('list tidak ditemukan menampilkan state not-found', async () => {
    const state = setupListsState({ list: null })
    state.errorCode.value = 'LIST_NOT_FOUND'
    state.error.value = 'List tidak ditemukan.'

    const wrapper = await mountDetail()

    expect(wrapper.text()).toContain('List tidak ditemukan.')
    expect(wrapper.text()).toContain('Kembali ke daftar')
  })

  it('kegagalan non-404 menawarkan coba lagi', async () => {
    setupListsState({ list: null })

    const wrapper = await mountDetail()

    expect(wrapper.text()).toContain('Detail list tidak dapat dimuat.')
    expect(wrapper.text()).toContain('Coba lagi')
  })

  it('mutasi gagal menampilkan banner error di modal dengan errorCode konsisten', async () => {
    const state = setupListsState({ items: itemsResponse([itemFixture()], []) })
    state.deleteListItem = vi.fn(async () => false)
    state.error = ref('Item sudah memiliki Expense sehingga tidak dapat dihapus.')
    state.errorCode = ref('LIST_ITEM_HAS_EXPENSE')

    const wrapper = await mountDetail()

    const remove = wrapper.findAll('button').find(button => button.text().trim() === 'Hapus')

    await remove!.trigger('click')
    await flush()
    await bodyButton('Hapus').trigger('click')
    await flush()

    expect(bodyText()).toContain('Item sudah memiliki Expense sehingga tidak dapat dihapus.')
  })
})
