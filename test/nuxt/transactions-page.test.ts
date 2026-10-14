import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { DOMWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import type { TransactionFilters, TransactionItem, TransactionListMeta } from '~/types/transactions'
import TransactionsPage from '~/pages/transactions/index.vue'

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
  bootstrap: vi.fn(async () => 'authenticated'),
  logout: vi.fn()
}))

mockNuxtImport('useAuth', () => () => authMock)

const toastMock = vi.hoisted(() => ({ add: vi.fn() }))

mockNuxtImport('useToast', () => () => toastMock)

interface MockTransactionsState {
  items: Ref<TransactionItem[]>
  meta: Ref<TransactionListMeta>
  filters: Ref<TransactionFilters>
  pending: Ref<boolean>
  submitting: Ref<boolean>
  error: Ref<string | null>
  fieldErrors: Ref<Record<string, string>>
  load: ReturnType<typeof vi.fn>
  refresh: ReturnType<typeof vi.fn>
  fetchOne: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
  clearError: ReturnType<typeof vi.fn>
}

const txMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useTransactions', () => () => txMock.api)

function sampleItem(overrides: Partial<TransactionItem> = {}): TransactionItem {
  return {
    id: '01J0000000000000000000001',
    household_id: 'h1',
    type: 'expense',
    amount: '685000.00',
    occurred_on: '2026-10-02',
    description: 'Belanja Supermarket',
    wallet: 'Kas Tunai',
    category: null,
    created_at: '2026-10-02T00:00:00.000000Z',
    updated_at: '2026-10-02T00:00:00.000000Z',
    ...overrides
  }
}

function setupTransactionsState(
  overrides: {
    items?: TransactionItem[]
    meta?: Partial<TransactionListMeta>
    pending?: boolean
    error?: string | null
  } = {}
): MockTransactionsState {
  const state: MockTransactionsState = {
    items: ref(overrides.items ?? [sampleItem()]),
    meta: ref({
      current_page: 1,
      per_page: 15,
      total: overrides.items === undefined ? 1 : overrides.items.length,
      last_page: 1,
      ...overrides.meta
    }),
    filters: ref({}),
    pending: ref(overrides.pending ?? false),
    submitting: ref(false),
    error: ref(overrides.error ?? null),
    fieldErrors: ref({}),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {}),
    fetchOne: vi.fn(async (id: string) => sampleItem({ id })),
    create: vi.fn(async () => sampleItem()),
    update: vi.fn(async () => sampleItem()),
    remove: vi.fn(async () => true),
    clearError: vi.fn()
  }

  txMock.api = state

  return state
}

async function mountPage() {
  return mountSuspended(TransactionsPage, { route: '/transactions' })
}

describe('transactions page', () => {
  beforeEach(() => {
    authMock.bootstrap.mockClear()
    authMock.logout.mockClear()
    toastMock.add.mockClear()
  })

  // UModal me-render via teleport yang tidak selalu ikut ter-unmount
  // bersama wrapper; bersihkan sisa modal antar test agar query
  // document.body tidak mengenai modal basi dari test sebelumnya.
  afterEach(() => {
    document.body.innerHTML = ''
  })

  // UModal me-render via teleport ke document.body, sehingga tombol di
  // dalam modal dicari di body, bukan di dalam wrapper halaman.
  function bodyButton(label: string): DOMWrapper<Element> {
    const element = Array.from(document.body.querySelectorAll('button'))
      .find(button => (button.textContent ?? '').includes(label))

    if (!element) {
      throw new Error(`Tombol "${label}" tidak ditemukan di modal`)
    }

    return new DOMWrapper(element)
  }

  function bodyText(): string {
    return document.body.textContent ?? ''
  }

  it('menampilkan judul, baris transaksi, dan info halaman', async () => {
    setupTransactionsState()

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Transaksi')
    expect(text).toContain('Belanja Supermarket')
    expect(text).toContain('Halaman 1 dari 1')
    expect(text).toContain('1 transaksi')
  })

  it('state loading menampilkan skeleton tanpa konten privat', async () => {
    setupTransactionsState({ items: [], pending: true })

    const wrapper = await mountPage()

    expect(wrapper.find('[aria-label="Memuat transaksi"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Belanja Supermarket')
  })

  it('state kosong tanpa filter menampilkan CTA tambah', async () => {
    setupTransactionsState({ items: [] })

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Belum ada transaksi tercatat.')
    expect(text).toContain('Tambah Transaksi')
  })

  async function flush(): Promise<void> {
    for (let index = 0; index < 5; index++) {
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  }

  it('state kosong dengan filter menampilkan pesan filter', async () => {
    setupTransactionsState({ items: [] })

    const wrapper = await mountPage()
    const dateInputs = wrapper.findAll('input[type="date"]')

    await dateInputs[1]!.setValue('2026-10-31')
    await dateInputs[1]!.trigger('change')

    expect(wrapper.text()).toContain('Tidak ada transaksi yang cocok dengan filter.')
  })

  it('state error menampilkan alert jujur + tombol coba lagi tanpa logout', async () => {
    setupTransactionsState({ items: [], error: 'Koneksi terputus' })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Data transaksi belum dapat dimuat.')
    expect(wrapper.text()).toContain('Koneksi terputus')
    expect(wrapper.text()).toContain('Coba lagi')
    expect(authMock.logout).not.toHaveBeenCalled()
  })

  it('tombol "Coba lagi" memanggil refresh()', async () => {
    const state = setupTransactionsState({ items: [], error: 'Koneksi terputus' })

    const wrapper = await mountPage()
    const retryButton = wrapper.findAll('button').find(button => button.text().includes('Coba lagi'))

    expect(retryButton).toBeDefined()

    await retryButton!.trigger('click')

    expect(state.refresh).toHaveBeenCalledTimes(1)
  })

  it('paginasi memanggil load() dengan nomor halaman', async () => {
    const state = setupTransactionsState({
      meta: { current_page: 1, per_page: 1, total: 2, last_page: 2 }
    })

    const wrapper = await mountPage()
    const nextButton = wrapper.findAll('button').find(button => button.text().includes('Berikutnya'))

    expect(nextButton).toBeDefined()

    await nextButton!.trigger('click')

    expect(state.load).toHaveBeenCalledWith({ page: 2 }, true)
  })

  it('mengubah filter tanggal memanggil load() dengan filter', async () => {
    const state = setupTransactionsState()

    const wrapper = await mountPage()
    const dateInputs = wrapper.findAll('input[type="date"]')

    expect(dateInputs).toHaveLength(2)

    await dateInputs[1]!.setValue('2026-10-31')
    await dateInputs[1]!.trigger('change')

    expect(state.load).toHaveBeenCalledWith({ date_to: '2026-10-31' }, true)
  })

  it('tombol atur ulang membersihkan filter dan reload', async () => {
    const state = setupTransactionsState()

    const wrapper = await mountPage()
    const dateInputs = wrapper.findAll('input[type="date"]')

    await dateInputs[1]!.setValue('2026-10-31')
    await dateInputs[1]!.trigger('change')

    const resetButton = wrapper.findAll('button').find(button => button.text().includes('Atur ulang'))

    expect(resetButton).toBeDefined()

    await resetButton!.trigger('click')

    expect(state.load).toHaveBeenCalledWith({}, true)
  })

  it('klik baris membuka detail via fetchOne()', async () => {
    const state = setupTransactionsState()

    const wrapper = await mountPage()
    const row = wrapper.find('ul button')

    expect(row.exists()).toBe(true)

    await row.trigger('click')

    expect(state.fetchOne).toHaveBeenCalledWith('01J0000000000000000000001')
  })

  it('hapus dari detail memakai konfirmasi dua langkah lalu memanggil remove()', async () => {
    const state = setupTransactionsState()

    const wrapper = await mountPage()

    await wrapper.find('ul button').trigger('click')
    await flush()

    expect(bodyText()).toContain('Hapus')

    await bodyButton('Hapus').trigger('click')

    // Konfirmasi dua langkah muncul; remove() belum dipanggil.
    expect(state.remove).not.toHaveBeenCalled()
    expect(bodyText()).toContain('Ya, hapus')

    await bodyButton('Ya, hapus').trigger('click')

    expect(state.remove).toHaveBeenCalledWith('01J0000000000000000000001')
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Transaksi dihapus' })
    )
  })

  it('tombol Tambah membuka form dan submit memanggil create()', async () => {
    const state = setupTransactionsState()

    const wrapper = await mountPage()
    const addButton = wrapper.findAll('button').find(button => button.text().includes('Tambah'))

    await addButton!.trigger('click')
    await flush()

    expect(bodyText()).toContain('Tambah transaksi')

    const amountInput = document.body.querySelector('#tx-amount')

    if (!amountInput) {
      throw new Error('Input nominal tidak ditemukan di modal')
    }

    await new DOMWrapper(amountInput as Element).setValue('150000')

    const submitButton = Array.from(document.body.querySelectorAll('button'))
      .find(button => (button.textContent ?? '').trim() === 'Tambah')

    if (!submitButton) {
      throw new Error('Tombol submit tidak ditemukan di modal')
    }

    await new DOMWrapper(submitButton).trigger('click')

    expect(state.create).toHaveBeenCalledTimes(1)

    const values = state.create.mock.calls[0]?.[0] as { amount: string, type: string }

    expect(values.amount).toBe('150000')
    expect(values.type).toBe('expense')
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Transaksi ditambah' })
    )
  })

  it('halaman tidak memanggil logout atau bootstrap auth', async () => {
    setupTransactionsState()

    await mountPage()

    expect(authMock.logout).not.toHaveBeenCalled()
    expect(authMock.bootstrap.mock.calls.length).toBeLessThanOrEqual(1)
  })
})
