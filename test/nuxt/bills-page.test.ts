import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { DOMWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import type { CategoryItem } from '~/types/categories'
import type { BillItem } from '~/types/bills'
import BillsPage from '~/pages/bills/index.vue'

// Halaman Bills Overview (Phase 15.3.3): empat tab status (Akan Datang
// default/Terlambat/Lunas/Arsip) yang semuanya kelompok field status
// server (billUiStatus) — tanpa kalkulasi tanggal di browser. Baris adalah
// anchor ke /bills/{id} (deep-link), bukan pembuka modal. Aksi lifecycle
// pindah ke halaman detail (lihat bills-detail-page.test.ts); Kepatuhan
// payload jaringan sesungguhnya diuji di bills-composable.test.ts.

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

interface MockBillsApi {
  items: Ref<BillItem[]>
  pending: Ref<boolean>
  submitting: Ref<boolean>
  error: Ref<string | null>
  fieldErrors: Ref<Record<string, string>>
  load: ReturnType<typeof vi.fn>
  refresh: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
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

function overdueBill(overrides: Partial<BillItem> = {}): BillItem {
  return billItem({
    id: '01J0BILL00000000000000031',
    title: 'Tagihan Internet',
    due_date: '2026-10-01',
    overdue: true,
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

function setupBillsState(
  overrides: {
    items?: BillItem[]
    pending?: boolean
    error?: string | null
  } = {}
): MockBillsApi {
  const api: MockBillsApi = {
    items: ref(overrides.items ?? [billItem()]),
    pending: ref(overrides.pending ?? false),
    submitting: ref(false),
    error: ref(overrides.error ?? null),
    fieldErrors: ref({}),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {}),
    create: vi.fn(async () => billItem()),
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

async function mountPage() {
  return mountSuspended(BillsPage, { route: '/bills' })
}

async function flush(): Promise<void> {
  for (let index = 0; index < 5; index++) {
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

function tabButton(wrapper: Awaited<ReturnType<typeof mountPage>>, label: string) {
  return wrapper.findAll('button').find(button => button.text() === label)
}

beforeEach(() => {
  authMock.logout.mockClear()
  authMock.isHouseholdOwner.value = true
  toastMock.add.mockClear()
  setCategories()
})

// UModal me-render via teleport yang tidak selalu ikut ter-unmount bersama
// wrapper; bersihkan sisa modal antar test agar query document.body tidak
// mengenai modal basi dari test sebelumnya.
afterEach(() => {
  document.body.innerHTML = ''
})

// UModal me-render via teleport ke document.body, sehingga tombol di dalam
// modal dicari di body, bukan di dalam wrapper halaman.
function bodyText(): string {
  return document.body.textContent ?? ''
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

  it('tab default adalah Akan Datang (tab status server, tanpa kalkulasi tanggal)', async () => {
    setupBillsState({ items: [billItem(), overdueBill(), paidBill(), archivedBill()] })

    const wrapper = await mountPage()

    expect(tabButton(wrapper, 'Akan Datang')!.attributes('aria-pressed')).toBe('true')
    expect(wrapper.text()).toContain('Tagihan Listrik')
    expect(wrapper.text()).not.toContain('Tagihan Internet')
    expect(wrapper.text()).not.toContain('Tagihan PDAM')
    expect(wrapper.text()).not.toContain('Tagihan Lama')
  })

  it('tab Terlambat menampilkan bill overdue dari field server (tanpa request baru)', async () => {
    const state = setupBillsState({ items: [billItem(), overdueBill()] })

    const wrapper = await mountPage()

    // Initial load hanya sekali; pindah antar tab status tidak memicu
    // request (tiga tab berbagi data aktif yang sama).
    expect(state.load).toHaveBeenCalledTimes(1)

    await tabButton(wrapper, 'Terlambat')!.trigger('click')
    await flush()

    const text = wrapper.text()

    expect(text).toContain('Tagihan Internet')
    expect(text).not.toContain('Tagihan Listrik')
    expect(state.load).toHaveBeenCalledTimes(1)
  })

  it('tab Lunas menampilkan bill paid dari field server', async () => {
    setupBillsState({ items: [billItem(), paidBill()] })

    const wrapper = await mountPage()

    await tabButton(wrapper, 'Lunas')!.trigger('click')
    await flush()

    const text = wrapper.text()

    expect(text).toContain('Tagihan PDAM')
    expect(text).toContain('Lunas')
    expect(text).not.toContain('Tagihan Listrik')
  })

  it('baris adalah anchor ke /bills/{id} (deep-link), bukan tombol modal', async () => {
    setupBillsState({ items: [billItem(), paidBill(), archivedBill()] })

    const wrapper = await mountPage()

    expect(wrapper.find('ul a[href="/bills/01J0BILL00000000000000001"]').exists()).toBe(true)
    expect(wrapper.find('ul button').exists()).toBe(false)

    // Setiap kelompok membuka detail berdasarkan ID yang sama.
    await tabButton(wrapper, 'Lunas')!.trigger('click')
    await flush()

    expect(wrapper.find('ul a[href="/bills/01J0BILL00000000000000020"]').exists()).toBe(true)
  })

  it('bill tanpa due_date mengikuti status server (unpaid → tab Akan Datang)', async () => {
    setupBillsState({ items: [billItem({ due_date: null })] })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Tagihan Listrik')
    expect(wrapper.text()).toContain('Tanpa tanggal jatuh tempo')
    expect(wrapper.text()).toContain('Belum dibayar')
  })

  it('state kosong tab Akan Datang menampilkan CTA tambah (owner)', async () => {
    setupBillsState({ items: [] })

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Belum ada tagihan yang akan datang.')
    expect(text).toContain('Tambah Tagihan')
  })

  it('state kosong tab Terlambat menampilkan copy khusus tab tanpa CTA kosong ganda', async () => {
    setupBillsState({ items: [] })

    const wrapper = await mountPage()

    await tabButton(wrapper, 'Terlambat')!.trigger('click')
    await flush()

    expect(wrapper.text()).toContain('Tidak ada tagihan terlambat.')
    expect(wrapper.text()).not.toContain('Belum ada tagihan yang akan datang.')
    // Hanya tombol header; empty-state tidak menambah CTA di tab ini.
    expect(wrapper.findAll('button').filter(button => button.text().includes('Tambah Tagihan'))).toHaveLength(1)
  })

  it('baris menampilkan chip status dari field backend (unpaid + lunas per tab)', async () => {
    setupBillsState({ items: [billItem(), paidBill()] })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Tagihan Listrik')
    expect(wrapper.text()).toContain('Belum dibayar')

    await tabButton(wrapper, 'Lunas')!.trigger('click')
    await flush()

    expect(wrapper.text()).toContain('Tagihan PDAM')
    expect(wrapper.text()).toContain('Lunas')
  })

  it('tab Arsip memuat include_archived=true dan menyaring baris is_active=false', async () => {
    const state = setupBillsState({ items: [billItem(), archivedBill()] })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Tagihan Listrik')
    expect(wrapper.text()).not.toContain('Tagihan Lama')

    await tabButton(wrapper, 'Arsip')!.trigger('click')
    await flush()

    expect(state.load).toHaveBeenCalledWith({ include_archived: true }, true)

    const text = wrapper.text()

    expect(text).toContain('Tagihan Lama')
    expect(text).not.toContain('Tagihan Listrik')
  })

  it('pindah dari tab Arsip ke tab status memuat ulang data aktif', async () => {
    const state = setupBillsState({ items: [archivedBill()] })

    const wrapper = await mountPage()

    await tabButton(wrapper, 'Arsip')!.trigger('click')
    await flush()
    await tabButton(wrapper, 'Akan Datang')!.trigger('click')
    await flush()

    expect(state.load).toHaveBeenLastCalledWith({ include_archived: false }, true)
  })

  it('tab Arsip kosong menampilkan pesan kosong tab arsip', async () => {
    setupBillsState({ items: [] })

    const wrapper = await mountPage()

    await tabButton(wrapper, 'Arsip')!.trigger('click')
    await flush()

    expect(wrapper.text()).toContain('Belum ada tagihan diarsipkan.')
    expect(wrapper.text()).not.toContain('Belum ada tagihan yang akan datang.')
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

  it('non-owner: CTA tambah disembunyikan; baris tetap terbuka sebagai anchor (render-only)', async () => {
    setupBillsState()
    authMock.isHouseholdOwner.value = false

    const wrapper = await mountPage()

    expect(wrapper.text()).not.toContain('Tambah Tagihan')
    expect(wrapper.find('ul a[href="/bills/01J0BILL00000000000000001"]').exists()).toBe(true)
  })

  it('halaman tidak memanggil logout', async () => {
    setupBillsState()

    await mountPage()

    expect(authMock.logout).not.toHaveBeenCalled()
  })
})
