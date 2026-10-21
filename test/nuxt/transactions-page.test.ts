import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import USelect from '@nuxt/ui/components/Select.vue'
import { DOMWrapper } from '@vue/test-utils'
import TransactionFormModal from '~/components/transactions/TransactionFormModal.vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import type { TransactionFilters, TransactionItem, TransactionListMeta } from '~/types/transactions'
import type { WalletItem } from '~/types/wallets'
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

const catMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useCategories', () => () => catMock.api)

const walletsMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useWallets', () => () => walletsMock.api)

// Satu dompet aktif (ditawarkan form) + satu non-aktif (harus
// disaring client — pola BillPaymentModal) + dompet aktif kedua untuk
// alur transfer (sumber≠tujuan).
function sampleWallets(): WalletItem[] {
  return [
    {
      id: 'w1',
      household_id: 'h1',
      name: 'Kas Tunai',
      type: 'cash',
      opening_balance: '0',
      is_active: true,
      balance: '250000.00',
      created_at: '2026-10-01T00:00:00.000000Z',
      updated_at: '2026-10-01T00:00:00.000000Z'
    },
    {
      id: 'w2',
      household_id: 'h1',
      name: 'Rekening Nonaktif',
      type: 'bank',
      opening_balance: '0',
      is_active: false,
      balance: '0.00',
      created_at: '2026-10-01T00:00:00.000000Z',
      updated_at: '2026-10-01T00:00:00.000000Z'
    },
    {
      id: 'w3',
      household_id: 'h1',
      name: 'Rekening BCA',
      type: 'bank',
      opening_balance: '0',
      is_active: true,
      balance: '1500000.00',
      created_at: '2026-10-01T00:00:00.000000Z',
      updated_at: '2026-10-01T00:00:00.000000Z'
    }
  ]
}

function setupWalletsState(
  overrides: { items?: WalletItem[], pending?: boolean, error?: string | null } = {}
): { load: ReturnType<typeof vi.fn>, refresh: ReturnType<typeof vi.fn> } {
  const api = {
    items: ref(overrides.items ?? sampleWallets()),
    pending: ref(overrides.pending ?? false),
    error: ref(overrides.error ?? null),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {})
  }

  walletsMock.api = api

  return api
}

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
    bill_payment: null,
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

function setCategories(
  items: Array<{ id: string, name: string, icon: string | null }>,
  error: string | null = null
): void {
  const api = catMock.api as {
    items: Ref<Array<{ id: string, name: string, icon: string | null }>>
    error: Ref<string | null>
  }

  api.items.value = items
  api.error.value = error
}

describe('transactions page', () => {
  beforeEach(() => {
    authMock.bootstrap.mockClear()
    authMock.logout.mockClear()
    toastMock.add.mockClear()
    setupWalletsState()
    catMock.api = {
      items: ref([]),
      pending: ref(false),
      submitting: ref(false),
      error: ref(null),
      fieldErrors: ref({}),
      load: vi.fn(async () => {}),
      refresh: vi.fn(async () => {}),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      clearError: vi.fn()
    }
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

  it('baris adalah deep-link ke /transactions/{id} (detail route, Phase 15.2.3)', async () => {
    setupTransactionsState()

    const wrapper = await mountPage()
    const rowLink = wrapper.find('ul a[href="/transactions/01J0000000000000000000001"]')

    expect(rowLink.exists()).toBe(true)
    expect(rowLink.text()).toContain('Belanja Supermarket')
  })

  it('tombol Tambah membuka form dan submit memanggil create() dengan dompet terpilih', async () => {
    const state = setupTransactionsState()

    const wrapper = await mountPage()
    const addButton = wrapper.findAll('button').find(button => button.text().includes('Tambah'))

    await addButton!.trigger('click')
    await flush()

    expect(bodyText()).toContain('Tambah transaksi')

    // Pilih dompet aktif "Kas Tunai" (w1) — form tanpa default otomatis.
    const modal = wrapper.findComponent(TransactionFormModal)
    const modalSelects = modal.findAllComponents(USelect)

    expect(modalSelects).toHaveLength(3)

    modalSelects[1]!.vm.$emit('update:modelValue', 'w1')

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

    const values = state.create.mock.calls[0]?.[0] as { amount: string, type: string, wallet_id: string, wallet: string }

    expect(values.amount).toBe('150000')
    expect(values.type).toBe('expense')
    expect(values.wallet_id).toBe('w1')
    expect(values.wallet).toBe('Kas Tunai')
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

  it('filter kategori memuat ulang dengan category_id dan tanpa page', async () => {
    const state = setupTransactionsState()

    setCategories([{ id: 'c1', name: 'Dapur', icon: null }])

    const wrapper = await mountPage()
    // USelect ke-2 di halaman adalah filter kategori (pertama: filter jenis).
    const selects = wrapper.findAllComponents(USelect)

    expect(selects.length).toBeGreaterThanOrEqual(2)

    // Simulasi persis 2 emit yang dihasilkan USelect saat opsi dipilih
    // (update:modelValue lalu change, sesuai implementasi Select.vue).
    selects[1]!.vm.$emit('update:modelValue', 'c1')
    await selects[1]!.vm.$emit('change', new Event('change'))

    expect(state.load).toHaveBeenCalledWith({ category_id: 'c1' }, true)
  })

  it('form menampilkan opsi kategori dan submit meneruskan ID', async () => {
    const state = setupTransactionsState()

    setCategories([{ id: 'c1', name: 'Dapur', icon: null }])

    const wrapper = await mountPage()
    const addButton = wrapper.findAll('button').find(button => button.text().includes('Tambah'))

    await addButton!.trigger('click')
    await flush()

    await new DOMWrapper(document.body.querySelector('#tx-category') as Element).trigger('click')
    await flush()

    const labels = Array.from(document.body.querySelectorAll('[role="option"]'))
      .map(el => el.textContent?.trim())

    expect(labels).toContain('Tanpa kategori')
    expect(labels).toContain('Dapur')

    // Pilih via 2 emit USelect (update:modelValue; change tidak relevan
    // di form karena submit membaca model). Klik DOM pada option reka
    // tidak selektif di happy-dom, jadi emit dipanggil langsung —
    // setara dengan yang dihasilkan USelect saat opsi dipilih.
    // Select dalam modal yang di-teleport dicari dari subtree modal.
    const modal = wrapper.findComponent(TransactionFormModal)
    const modalSelects = modal.findAllComponents(USelect)

    // Urutan select form: jenis, dompet, kategori.
    expect(modalSelects).toHaveLength(3)

    modalSelects[2]!.vm.$emit('update:modelValue', 'c1')

    const amountInput = document.body.querySelector('#tx-amount')

    await new DOMWrapper(amountInput as Element).setValue('50000')

    const submitButton = Array.from(document.body.querySelectorAll('button'))
      .find(button => (button.textContent ?? '').trim() === 'Tambah')

    await new DOMWrapper(submitButton as Element).trigger('click')

    expect(state.create).toHaveBeenCalledWith(
      expect.objectContaining({ category_id: 'c1', amount: '50000' })
    )
  })

  // Phase 15.2.2 — kontrak create baru & state dompet.
  it('kegagalan saldo (INSUFFICIENT_FUNDS) tampil sebagai alert di form, tidak disamarkan', async () => {
    const state = setupTransactionsState()

    // Meniru composable: create gagal → error terisi, hasil null, form
    // tetap terbuka — alert submitError wajib menampilkan penyebabnya.
    state.create.mockImplementation(async () => {
      state.error.value = 'Saldo dompet tidak cukup.'

      return null
    })

    const wrapper = await mountPage()
    const addButton = wrapper.findAll('button').find(button => button.text().includes('Tambah'))

    await addButton!.trigger('click')
    await flush()

    const amountInput = document.body.querySelector('#tx-amount')

    await new DOMWrapper(amountInput as Element).setValue('999999999')

    const submitButton = Array.from(document.body.querySelectorAll('button'))
      .find(button => (button.textContent ?? '').trim() === 'Tambah')

    await new DOMWrapper(submitButton as Element).trigger('click')
    await flush()

    expect(state.create).toHaveBeenCalledTimes(1)
    expect(bodyText()).toContain('Transaksi belum tersimpan.')
    expect(bodyText()).toContain('Saldo dompet tidak cukup.')
  })

  it('error validasi 422 wallet_id dirender pada field dompet', async () => {
    const state = setupTransactionsState()

    state.fieldErrors.value = { wallet_id: 'Kolom dompet wajib diisi.' }

    const wrapper = await mountPage()
    const addButton = wrapper.findAll('button').find(button => button.text().includes('Tambah'))

    await addButton!.trigger('click')
    await flush()

    expect(bodyText()).toContain('Kolom dompet wajib diisi.')
  })

  it('form tanpa dompet aktif menampilkan empty state jujur tanpa pilihan', async () => {
    setupTransactionsState()

    setupWalletsState({ items: [] })

    const wrapper = await mountPage()
    const addButton = wrapper.findAll('button').find(button => button.text().includes('Tambah'))

    await addButton!.trigger('click')
    await flush()

    expect(bodyText()).toContain('Belum ada dompet aktif. Tambahkan dompet terlebih dahulu.')
    expect(bodyText()).toContain('Pilih dompet')
  })

  it('kegagalan memuat dompet menampilkan pesan + Coba lagi yang memanggil refresh', async () => {
    setupTransactionsState()

    const wallets = setupWalletsState({ error: 'Koneksi terputus' })

    const wrapper = await mountPage()
    const addButton = wrapper.findAll('button').find(button => button.text().includes('Tambah'))

    await addButton!.trigger('click')
    await flush()

    expect(bodyText()).toContain('Koneksi terputus')

    await bodyButton('Coba lagi').trigger('click')

    expect(wallets.refresh).toHaveBeenCalledTimes(1)
  })

  // Phase 15.2.3 — form transfer: dua select dompet, kategori
  // disembunyikan, guard sumber≠tujuan.
  it('memilih jenis Transfer menampilkan sumber+tujuan dan menyembunyikan kategori', async () => {
    setupTransactionsState()

    const wrapper = await mountPage()
    const addButton = wrapper.findAll('button').find(button => button.text().includes('Tambah'))

    await addButton!.trigger('click')
    await flush()

    const modal = wrapper.findComponent(TransactionFormModal)
    const typeSelect = modal.findAllComponents(USelect)[0]!

    typeSelect.vm.$emit('update:modelValue', 'transfer')
    await flush()

    // Kategori disembunyikan (prohibited_if backend); tujuan muncul.
    expect(document.body.querySelector('#tx-destination')).not.toBeNull()
    expect(document.body.querySelector('#tx-category')).toBeNull()
    expect(bodyText()).toContain('Dompet sumber')
    expect(bodyText()).toContain('Dompet tujuan')
    // Tanpa default otomatis: tujuan belum dipilih.
    expect(bodyText()).toContain('Pilih dompet tujuan')
  })

  it('guard menolak transfer dengan sumber = tujuan sebelum memanggil create()', async () => {
    const state = setupTransactionsState()

    const wrapper = await mountPage()
    const addButton = wrapper.findAll('button').find(button => button.text().includes('Tambah'))

    await addButton!.trigger('click')
    await flush()

    const modal = wrapper.findComponent(TransactionFormModal)
    const modalSelects = modal.findAllComponents(USelect)

    modalSelects[0]!.vm.$emit('update:modelValue', 'transfer')
    await flush()

    const afterType = wrapper.findComponent(TransactionFormModal)
    const selectsAfterType = afterType.findAllComponents(USelect)

    // jenis, sumber, tujuan (kategori tersembunyi).
    selectsAfterType[1]!.vm.$emit('update:modelValue', 'w1')
    selectsAfterType[2]!.vm.$emit('update:modelValue', 'w1')

    const amountInput = document.body.querySelector('#tx-amount')

    await new DOMWrapper(amountInput as Element).setValue('416250')

    const submitButton = Array.from(document.body.querySelectorAll('button'))
      .find(button => (button.textContent ?? '').trim() === 'Tambah')

    await new DOMWrapper(submitButton as Element).trigger('click')
    await flush()

    // Guard lokal: create() TIDAK dipanggil, pesan jelas tampil.
    expect(state.create).not.toHaveBeenCalled()
    expect(bodyText()).toContain('Dompet sumber dan tujuan harus berbeda.')
  })

  it('submit transfer memanggil create() dengan destination_wallet_id', async () => {
    const state = setupTransactionsState()

    const wrapper = await mountPage()
    const addButton = wrapper.findAll('button').find(button => button.text().includes('Tambah'))

    await addButton!.trigger('click')
    await flush()

    const modal = wrapper.findComponent(TransactionFormModal)
    const modalSelects = modal.findAllComponents(USelect)

    modalSelects[0]!.vm.$emit('update:modelValue', 'transfer')
    await flush()

    const selectsAfterType = wrapper.findComponent(TransactionFormModal).findAllComponents(USelect)

    selectsAfterType[1]!.vm.$emit('update:modelValue', 'w1')
    selectsAfterType[2]!.vm.$emit('update:modelValue', 'w3')

    const amountInput = document.body.querySelector('#tx-amount')

    await new DOMWrapper(amountInput as Element).setValue('416250')

    const submitButton = Array.from(document.body.querySelectorAll('button'))
      .find(button => (button.textContent ?? '').trim() === 'Tambah')

    await new DOMWrapper(submitButton as Element).trigger('click')

    expect(state.create).toHaveBeenCalledTimes(1)

    const values = state.create.mock.calls[0]?.[0] as {
      type: string
      wallet_id: string
      destination_wallet_id: string
      category_id: string
    }

    expect(values.type).toBe('transfer')
    expect(values.wallet_id).toBe('w1')
    expect(values.destination_wallet_id).toBe('w3')
    // Kategori kosong utk transfer (payload create tanpa key category_id).
    expect(values.category_id).toBe('')
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Transaksi ditambah' })
    )
  })

  it('transaksi dengan kategori menampilkan chip nama; tanpa kategori tidak', async () => {
    setupTransactionsState({
      items: [
        sampleItem({ id: 'a', description: 'Ikan', category: { id: 'c1', name: 'Dapur', icon: null } }),
        sampleItem({ id: 'b', description: 'Parkir', category: null })
      ]
    })

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Dapur')
    expect(text).toContain('Ikan')
    expect(text).toContain('Parkir')
  })

  // Phase 15.2.1 — representasi transfer netral (bukan income/expense).
  it('baris transfer tampil netral: label "Transfer", tanpa tanda, warna netral', async () => {
    setupTransactionsState({
      items: [sampleItem({ id: 'tf1', type: 'transfer', description: null, category: null })]
    })

    const wrapper = await mountPage()
    const amount = wrapper.find('li span.font-semibold')
    const amountText = amount.text().trim()

    expect(wrapper.text()).toContain('Transfer')
    expect(wrapper.text()).not.toContain('Pengeluaran')
    expect(amountText.startsWith('Rp')).toBe(true)
    expect(amountText).not.toMatch(/^[-+]/)
    expect(amount.classes()).toContain('text-default')
    expect(amount.classes()).not.toContain('text-success')
  })

  it('filter jenis dengan Transfer memuat ulang dengan type=transfer', async () => {
    const state = setupTransactionsState()

    const wrapper = await mountPage()
    const selects = wrapper.findAllComponents(USelect)

    expect(selects.length).toBeGreaterThanOrEqual(1)

    // Simulasi 2 emit USelect saat opsi dipilih (update:modelValue lalu
    // change), sama seperti test filter kategori.
    selects[0]!.vm.$emit('update:modelValue', 'transfer')
    await selects[0]!.vm.$emit('change', new Event('change'))

    expect(state.load).toHaveBeenCalledWith({ type: 'transfer' }, true)
  })

  it('baris pembayaran tagihan menampilkan label "Pembayaran tagihan" di daftar', async () => {
    setupTransactionsState({
      items: [
        sampleItem({
          id: 'bp-list',
          description: null,
          category: { id: 'c1', name: 'Listrik', icon: null },
          bill_payment: { bill_id: 'b1', bill_title: 'Tagihan Listrik' }
        })
      ]
    })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Pembayaran tagihan')
    expect(wrapper.text()).toContain('Listrik')
  })

  it('kegagalan kategori menampilkan retry tanpa fixture dan tanpa blokir form', async () => {
    const state = setupTransactionsState()

    setCategories([], 'Koneksi terputus')

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Koneksi terputus')

    const retryButton = wrapper.findAll('button').find(button => button.text().includes('Coba lagi'))

    expect(retryButton).toBeDefined()

    await retryButton!.trigger('click')

    const api = catMock.api as { refresh: ReturnType<typeof vi.fn> }

    expect(api.refresh).toHaveBeenCalledTimes(1)
    // Daftar transaksi tetap tampil; tidak diganti fixture kategori.
    expect(wrapper.text()).toContain('Belanja Supermarket')
    expect(state.load).toHaveBeenCalled()
  })
})
