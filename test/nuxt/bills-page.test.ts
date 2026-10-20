import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import USelect from '@nuxt/ui/components/Select.vue'
import { DOMWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import type { CategoryItem } from '~/types/categories'
import type { BillDetail, BillItem, BillRecurrence } from '~/types/bills'
import type { WalletItem } from '~/types/wallets'
import BillPaymentModal from '~/components/bills/BillPaymentModal.vue'
import BillRecurrenceModal from '~/components/bills/BillRecurrenceModal.vue'
import BillsPage from '~/pages/bills/index.vue'

// Halaman Bills: state/mutasi lewat composable yang di-mock (pola
// transactions-page) — assertions pada perilaku tampilan, navigasi tab,
// aksi lifecycle, dan payload turunan yang diteruskan ke composable.
// Kepatuhan payload jaringan sesungguhnya diuji di bills-composable.test.ts.

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

const billsMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useBills', () => () => billsMock.api)

const catMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useCategories', () => () => catMock.api)

const walletsMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useWallets', () => () => walletsMock.api)

interface MockBillsApi {
  items: Ref<BillItem[]>
  filters: Ref<{ include_archived?: boolean }>
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
  archive: ReturnType<typeof vi.fn>
  pay: ReturnType<typeof vi.fn>
  updateRecurrence: ReturnType<typeof vi.fn>
  clearError: ReturnType<typeof vi.fn>
}

function billItem(overrides: Partial<BillItem> = {}): BillItem {
  return {
    id: '01J0BILL00000000000000001',
    household_id: 'h1',
    category: { id: 'c1', name: 'Listrik', icon: null },
    title: 'Tagihan Listrik',
    amount: '150000.00',
    due_date: '2026-10-25',
    is_active: true,
    notes: null,
    recurrence: null,
    recurrence_period: null,
    paid_amount: '0.00',
    remaining_amount: '150000.00',
    payment_count: 0,
    status: 'unpaid',
    overdue: false,
    created_at: '2026-10-01T00:00:00.000000Z',
    updated_at: '2026-10-01T00:00:00.000000Z',
    ...overrides
  }
}

function recurringBill(overrides: Partial<BillItem> = {}): BillItem {
  return billItem({
    id: '01J0BILL00000000000000010',
    title: 'Iuran Keamanan',
    recurrence: { id: 'r1', frequency: 'monthly', due_day: 25, is_active: true },
    recurrence_period: '2026-10-25',
    ...overrides
  })
}

function paidBill(overrides: Partial<BillItem> = {}): BillItem {
  return billItem({
    id: '01J0BILL00000000000000020',
    title: 'Tagihan PDAM',
    status: 'paid',
    paid_amount: '150000.00',
    remaining_amount: '0.00',
    payment_count: 1,
    ...overrides
  })
}

function archivedBill(overrides: Partial<BillItem> = {}): BillItem {
  return paidBill({
    id: '01J0BILL00000000000000030',
    title: 'Tagihan Lama',
    is_active: false,
    ...overrides
  })
}

function paymentFixture(): BillDetail['payments'][number] {
  return {
    id: 'p1',
    amount: '150000.00',
    occurred_on: '2026-10-25',
    description: null,
    wallet: { id: 'w1', name: 'Kas Tunai', type: 'cash', is_active: true },
    created_at: '2026-10-25T00:00:00.000000Z'
  }
}

function walletFixtures(): WalletItem[] {
  return [
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
    },
    {
      id: 'w2',
      household_id: 'h1',
      name: 'Dompet Mati',
      type: 'cash',
      opening_balance: '0.00',
      is_active: false,
      balance: '10000.00',
      created_at: '2026-10-01T00:00:00.000000Z',
      updated_at: '2026-10-01T00:00:00.000000Z'
    }
  ]
}

function setupBillsState(
  overrides: {
    items?: BillItem[]
    pending?: boolean
    error?: string | null
  } = {}
): MockBillsApi {
  const items = ref(overrides.items ?? [billItem()])

  const api: MockBillsApi = {
    items,
    filters: ref({}),
    pending: ref(overrides.pending ?? false),
    submitting: ref(false),
    error: ref(overrides.error ?? null),
    fieldErrors: ref({}),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {}),
    fetchOne: vi.fn(async (id: string) => ({
      ...(items.value.find(bill => bill.id === id) ?? items.value[0] ?? billItem()),
      payments: []
    })),
    create: vi.fn(async () => billItem()),
    update: vi.fn(async () => billItem()),
    remove: vi.fn(async () => true),
    archive: vi.fn(async () => billItem({ is_active: false, status: 'paid' })),
    pay: vi.fn(async () => ({ payment: { id: 't1' }, bill: paidBill() })),
    updateRecurrence: vi.fn(async (): Promise<BillRecurrence> => ({
      id: 'r1',
      household_id: 'h1',
      title: 'Iuran Keamanan',
      amount: '150000.00',
      notes: null,
      frequency: 'monthly',
      due_day: 25,
      is_active: true,
      category: null,
      created_at: '2026-10-01T00:00:00.000000Z',
      updated_at: '2026-10-01T00:00:00.000000Z'
    })),
    clearError: vi.fn()
  }

  billsMock.api = api

  return api
}

function setCategories(items: CategoryItem[] = [], error: string | null = null): void {
  catMock.api = {
    items: ref(items),
    pending: ref(false),
    error: ref(error),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {})
  }
}

function setWallets(items: WalletItem[] = walletFixtures()): void {
  walletsMock.api = {
    items: ref(items),
    pending: ref(false),
    error: ref(null),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {})
  }
}

async function mountPage() {
  return mountSuspended(BillsPage, { route: '/bills' })
}

async function flush(): Promise<void> {
  for (let index = 0; index < 5; index++) {
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

beforeEach(() => {
  authMock.logout.mockClear()
  authMock.isHouseholdOwner.value = true
  toastMock.add.mockClear()
  setCategories()
  setWallets()
})

// UModal me-render via teleport yang tidak selalu ikut ter-unmount bersama
// wrapper; bersihkan sisa modal antar test agar query document.body tidak
// mengenai modal basi dari test sebelumnya.
afterEach(() => {
  document.body.innerHTML = ''
})

// UModal me-render via teleport ke document.body, sehingga tombol di dalam
// modal dicari di body, bukan di dalam wrapper halaman.
function bodyButton(label: string): DOMWrapper<Element> {
  const element = Array.from(document.body.querySelectorAll('button'))
    .find(button => (button.textContent ?? '').trim() === label)

  if (!element) {
    throw new Error(`Tombol "${label}" tidak ditemukan di modal`)
  }

  return new DOMWrapper(element)
}

function bodyButtonContaining(label: string): DOMWrapper<Element> {
  const element = Array.from(document.body.querySelectorAll('button'))
    .find(button => (button.textContent ?? '').includes(label))

  if (!element) {
    throw new Error(`Tombol berisi "${label}" tidak ditemukan di modal`)
  }

  return new DOMWrapper(element)
}

function bodyText(): string {
  return document.body.textContent ?? ''
}

function bodyLabels(): string[] {
  return Array.from(document.body.querySelectorAll('button'))
    .map(button => (button.textContent ?? '').trim())
}

describe('bills page', () => {
  it('state loading menampilkan skeleton tanpa konten privat', async () => {
    setupBillsState({ items: [], pending: true })

    const wrapper = await mountPage()

    expect(wrapper.find('[aria-label="Memuat tagihan"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Belum ada tagihan')
  })

  it('state error menampilkan alert jujur + Coba lagi memanggil refresh tanpa logout', async () => {
    const state = setupBillsState({ items: [], error: 'Koneksi terputus' })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Data tagihan belum dapat dimuat.')
    expect(wrapper.text()).toContain('Koneksi terputus')
    expect(authMock.logout).not.toHaveBeenCalled()

    const retry = wrapper.findAll('button').find(button => button.text().includes('Coba lagi'))

    expect(retry).toBeDefined()

    await retry!.trigger('click')

    expect(state.refresh).toHaveBeenCalledTimes(1)
  })

  it('state kosong tab Berjalan menampilkan CTA tambah (owner)', async () => {
    setupBillsState({ items: [] })

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Belum ada tagihan berjalan.')
    expect(text).toContain('Tambah Tagihan')
  })

  it('baris menampilkan chip status dari field backend (unpaid + lunas)', async () => {
    setupBillsState({ items: [billItem(), paidBill()] })

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Tagihan Listrik')
    expect(text).toContain('Belum dibayar')
    expect(text).toContain('Tagihan PDAM')
    expect(text).toContain('Lunas')
  })

  it('detail baris unpaid menawarkan Bayar/Ubah/Hapus tanpa Arsipkan', async () => {
    setupBillsState()

    const wrapper = await mountPage()

    await wrapper.find('ul button').trigger('click')
    await flush()

    const labels = bodyLabels()

    expect(labels).toContain('Bayar')
    expect(labels).toContain('Ubah')
    expect(labels).toContain('Hapus')
    expect(labels).not.toContain('Arsipkan')
    expect(labels).not.toContain('Ubah jadwal')
  })

  it('detail baris lunas menawarkan Arsipkan + riwayat pembayaran; tanpa Bayar/Ubah/Hapus', async () => {
    const state = setupBillsState({ items: [paidBill()] })

    state.fetchOne.mockImplementation(async (id: string) => ({
      ...paidBill({ id }),
      payments: [paymentFixture()]
    }))

    const wrapper = await mountPage()

    await wrapper.find('ul button').trigger('click')
    await flush()

    const labels = bodyLabels()

    expect(labels).toContain('Arsipkan')
    expect(labels).not.toContain('Bayar')
    expect(labels).not.toContain('Ubah')
    expect(labels).not.toContain('Hapus')
    expect(bodyText()).toContain('Riwayat pembayaran')
    expect(bodyText()).toContain('Lunas')
  })

  it('hapus dua-langkah + peringatan skip permanen untuk baris recurrence', async () => {
    const state = setupBillsState({ items: [recurringBill()] })

    const wrapper = await mountPage()

    await wrapper.find('ul button').trigger('click')
    await flush()

    expect(bodyLabels()).toContain('Ubah jadwal')

    await bodyButton('Hapus').trigger('click')

    // Konfirmasi dua langkah; remove() belum dipanggil.
    expect(state.remove).not.toHaveBeenCalled()
    expect(bodyText()).toContain('dilewati secara PERMANEN')
    expect(bodyText()).toContain('TIDAK menghentikan jadwal')
    // Satu-satunya periode aktif seri → peringatan G-1 ikut tampil.
    expect(bodyText()).toContain('periode AKTIF terakhir')

    await bodyButton('Ya, hapus').trigger('click')

    expect(state.remove).toHaveBeenCalledWith('01J0BILL00000000000000010')
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Tagihan dihapus' })
    )
  })

  it('peringatan "periode aktif terakhir" tidak muncul bila seri masih punya periode lain', async () => {
    setupBillsState({ items: [recurringBill(), recurringBill({ id: '01J0BILL00000000000000011' })] })

    const wrapper = await mountPage()

    await wrapper.find('ul button').trigger('click')
    await flush()
    await bodyButton('Hapus').trigger('click')

    expect(bodyText()).toContain('dilewati secara PERMANEN')
    expect(bodyText()).not.toContain('periode AKTIF terakhir')
  })

  it('arsip dua-langkah: copy permanen + memanggil archive()', async () => {
    const state = setupBillsState({ items: [paidBill()] })

    const wrapper = await mountPage()

    await wrapper.find('ul button').trigger('click')
    await flush()

    await bodyButton('Arsipkan').trigger('click')

    expect(state.archive).not.toHaveBeenCalled()
    expect(bodyText()).toContain('Arsip bersifat permanen')

    await bodyButton('Ya, arsipkan').trigger('click')

    expect(state.archive).toHaveBeenCalledWith('01J0BILL00000000000000020')
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Tagihan diarsipkan' })
    )
  })

  it('tab Arsip memuat include_archived=true dan menyaring baris is_active=false', async () => {
    const state = setupBillsState({ items: [billItem(), archivedBill()] })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Tagihan Listrik')
    expect(wrapper.text()).not.toContain('Tagihan Lama')

    const archiveTab = wrapper.findAll('button').find(button => button.text().includes('Arsip'))

    expect(archiveTab).toBeDefined()

    await archiveTab!.trigger('click')
    await flush()

    expect(state.load).toHaveBeenCalledWith({ include_archived: true }, true)

    const text = wrapper.text()

    expect(text).toContain('Tagihan Lama')
    expect(text).not.toContain('Tagihan Listrik')
  })

  it('tab Arsip kosong menampilkan pesan kosong tab arsip', async () => {
    setupBillsState({ items: [] })

    const wrapper = await mountPage()

    const archiveTab = wrapper.findAll('button').find(button => button.text().includes('Arsip'))

    await archiveTab!.trigger('click')
    await flush()

    expect(wrapper.text()).toContain('Belum ada tagihan diarsipkan.')
    expect(wrapper.text()).not.toContain('Belum ada tagihan berjalan.')
  })

  it('tombol Tambah membuka form dan submit memanggil create() dengan nilai form', async () => {
    const state = setupBillsState()
    setCategories([
      { id: 'c1', name: 'Listrik', icon: null, type: 'expense' },
      { id: 'c2', name: 'Gaji', icon: null, type: 'income' }
    ])

    const wrapper = await mountPage()

    const addButton = wrapper.findAll('button').find(button => button.text().includes('Tambah Tagihan'))

    await addButton!.trigger('click')
    await flush()

    expect(bodyText()).toContain('Tambah tagihan')

    // Form Bills hanya menawarkan kategori expense (kontrak backend).
    await new DOMWrapper(document.body.querySelector('#bill-category') as Element).trigger('click')
    await flush()

    const optionLabels = Array.from(document.body.querySelectorAll('[role="option"]'))
      .map(element => element.textContent?.trim())

    expect(optionLabels).toContain('Listrik')
    expect(optionLabels).toContain('Tanpa kategori')
    expect(optionLabels).not.toContain('Gaji')

    await new DOMWrapper(document.body.querySelector('#bill-title') as Element).setValue('Tagihan Air')
    await new DOMWrapper(document.body.querySelector('#bill-amount') as Element).setValue('75000')

    const submitButton = Array.from(document.body.querySelectorAll('button'))
      .find(button => (button.textContent ?? '').trim() === 'Tambah')

    await new DOMWrapper(submitButton as Element).trigger('click')

    expect(state.create).toHaveBeenCalledTimes(1)

    const values = state.create.mock.calls[0]?.[0] as Record<string, unknown>

    expect(values.title).toBe('Tagihan Air')
    expect(values.amount).toBe('75000')
    expect(values.recurrence).toBe(false)
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Tagihan ditambah' })
    )
  })

  it('modal bayar: tanpa input nominal, sisa tagihan read-only, wallet non-aktif tak ditawarkan', async () => {
    const state = setupBillsState()
    setWallets()

    const wrapper = await mountPage()

    await wrapper.find('ul button').trigger('click')
    await flush()

    await bodyButton('Bayar').trigger('click')
    await flush()

    // Read-only: tidak ada input nominal sama sekali di modal.
    expect(document.body.querySelector('#pay-date')).not.toBeNull()
    expect(document.body.querySelectorAll('[inputmode="decimal"]')).toHaveLength(0)
    expect(bodyText()).toContain('Sisa tagihan')

    // Wallet non-aktif tidak muncul di opsi.
    await new DOMWrapper(document.body.querySelector('#pay-wallet') as Element).trigger('click')
    await flush()

    const optionLabels = Array.from(document.body.querySelectorAll('[role="option"]'))
      .map(element => element.textContent?.trim())

    expect(optionLabels.some(label => label?.includes('Kas Tunai'))).toBe(true)
    expect(optionLabels.some(label => label?.includes('Dompet Mati'))).toBe(false)

    const modal = wrapper.findComponent(BillPaymentModal)
    const selects = modal.findAllComponents(USelect)

    selects[0]!.vm.$emit('update:modelValue', 'w1')
    await flush()

    await bodyButton('Bayar sekarang').trigger('click')
    await flush()

    // Pemilihan dompet diteruskan apa adanya; payload amount/category_id
    // dibentuk (dan divalidasi) di composable — lihat bills-composable.test.
    expect(state.pay).toHaveBeenCalledWith('01J0BILL00000000000000001', {
      wallet_id: 'w1',
      occurred_on: ''
    })
    // Membuka modal bayar TIDAK memicu reload daftar bills (hanya load
    // dompet yang dimuat saat dibutuhkan).
    expect(state.load).toHaveBeenCalledTimes(1)
  })

  it('sukses bayar menampilkan toast, reload detail, dan refresh dompet', async () => {
    const state = setupBillsState()
    setWallets()

    const wrapper = await mountPage()

    await wrapper.find('ul button').trigger('click')
    await flush()
    await bodyButton('Bayar').trigger('click')
    await flush()

    const modal = wrapper.findComponent(BillPaymentModal)
    const selects = modal.findAllComponents(USelect)

    selects[0]!.vm.$emit('update:modelValue', 'w1')
    await flush()

    await bodyButton('Bayar sekarang').trigger('click')
    await flush()

    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Tagihan dibayar' })
    )
    // fetchOne dipanggil lagi (detail segar) dan dompet disegarkan.
    expect(state.fetchOne.mock.calls.length).toBeGreaterThanOrEqual(2)

    const wallets = walletsMock.api as { refresh: ReturnType<typeof vi.fn> }

    expect(wallets.refresh).toHaveBeenCalled()
  })

  it('INSUFFICIENT_FUNDS tampil sebagai alert di modal bayar', async () => {
    const state = setupBillsState()
    setWallets()

    const wrapper = await mountPage()

    await wrapper.find('ul button').trigger('click')
    await flush()
    await bodyButton('Bayar').trigger('click')
    await flush()

    state.pay.mockImplementation(async () => {
      state.error.value = 'Saldo dompet tidak cukup.'

      return null
    })

    const modal = wrapper.findComponent(BillPaymentModal)
    const selects = modal.findAllComponents(USelect)

    selects[0]!.vm.$emit('update:modelValue', 'w1')
    await flush()

    await bodyButton('Bayar sekarang').trigger('click')
    await flush()

    expect(bodyText()).toContain('Pembayaran gagal.')
    expect(bodyText()).toContain('Saldo dompet tidak cukup.')
  })

  it('BILL_ALREADY_PAID tampil sebagai alert; menutup modal memicu refresh (data disegarkan)', async () => {
    const state = setupBillsState()
    setWallets()

    const wrapper = await mountPage()

    await wrapper.find('ul button').trigger('click')
    await flush()
    await bodyButton('Bayar').trigger('click')
    await flush()

    state.pay.mockImplementation(async () => {
      state.error.value = 'Tagihan ini sudah dibayar.'

      return null
    })

    const modal = wrapper.findComponent(BillPaymentModal)
    const selects = modal.findAllComponents(USelect)

    selects[0]!.vm.$emit('update:modelValue', 'w1')
    await flush()

    await bodyButton('Bayar sekarang').trigger('click')
    await flush()

    expect(bodyText()).toContain('Tagihan ini sudah dibayar.')

    // Tutup modal → error modal dibuang dan daftar+detail disegarkan.
    wrapper.findComponent(BillPaymentModal).vm.$emit('update:open', false)
    await flush()

    expect(state.clearError).toHaveBeenCalled()
    expect(state.refresh).toHaveBeenCalled()
  })

  it('pembuka "Ubah jadwal" dari detail membuka panel recurrence', async () => {
    const state = setupBillsState({ items: [recurringBill()] })

    const wrapper = await mountPage()

    await wrapper.find('ul button').trigger('click')
    await flush()

    await bodyButtonContaining('Ubah jadwal').trigger('click')
    await flush()

    expect(wrapper.findComponent(BillRecurrenceModal).props('open')).toBe(true)
    expect(wrapper.findComponent(BillRecurrenceModal).props('bill')?.recurrence?.id).toBe('r1')
    expect(state.updateRecurrence).not.toHaveBeenCalled()
  })

  it('non-owner: aksi tulis disembunyikan (render-only, bukan pengganti authz)', async () => {
    setupBillsState()
    authMock.isHouseholdOwner.value = false

    const wrapper = await mountPage()

    expect(wrapper.text()).not.toContain('Tambah Tagihan')

    await wrapper.find('ul button').trigger('click')
    await flush()

    const labels = bodyLabels()

    expect(labels).not.toContain('Bayar')
    expect(labels).not.toContain('Ubah')
    expect(labels).not.toContain('Hapus')
    expect(labels).not.toContain('Arsipkan')
    expect(labels).not.toContain('Ubah jadwal')
    expect(bodyText()).toContain('hanya dapat dilihat')
  })

  it('detail gagal memuat menampilkan alert + Coba lagi memanggil reload', async () => {
    const state = setupBillsState()

    state.fetchOne.mockRejectedValueOnce(new Error('fetch failed'))

    const wrapper = await mountPage()

    await wrapper.find('ul button').trigger('click')
    await flush()

    expect(bodyText()).toContain('Detail belum dapat dimuat.')

    await bodyButton('Coba lagi').trigger('click')
    await flush()

    expect(state.fetchOne.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('skeleton detail tampil selama fetchOne berjalan', async () => {
    const state = setupBillsState()

    let release!: (value: unknown) => void

    const gate = new Promise((resolve) => {
      release = resolve as (value: unknown) => void
    })

    state.fetchOne.mockReturnValueOnce(gate)

    const wrapper = await mountPage()

    await wrapper.find('ul button').trigger('click')
    await flush()

    expect(document.body.querySelector('[aria-label="Memuat detail tagihan"]')).not.toBeNull()

    release({ ...billItem(), payments: [] })
    await flush()

    expect(bodyText()).toContain('Tagihan Listrik')
  })

  it('halaman tidak memanggil logout', async () => {
    setupBillsState()

    await mountPage()

    expect(authMock.logout).not.toHaveBeenCalled()
  })
})
