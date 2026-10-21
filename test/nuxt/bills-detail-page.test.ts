import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import USelect from '@nuxt/ui/components/Select.vue'
import { DOMWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import type { BillDetail, BillItem, BillRecurrence } from '~/types/bills'
import type { WalletItem } from '~/types/wallets'
import BillFormModal from '~/components/bills/BillFormModal.vue'
import BillPaymentModal from '~/components/bills/BillPaymentModal.vue'
import BillRecurrenceModal from '~/components/bills/BillRecurrenceModal.vue'
import DetailPage from '~/pages/bills/[id].vue'

// Halaman detail /bills/[id] (Phase 15.3.3) — menggantikan
// BillDetailModal: deep-linkable lewat GET /bills/{id} (tanpa state tab/
// modal), states loading/error/not-found, aksi mengikuti lifecycle backend
// (unpaid/overdue → Bayar/Ubah/Hapus; paid → Arsipkan; arsip → read-only;
// owner-guard render-only — backend otoritas).

const BILL_ID = '01J0BILL00000000000000001'

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

const navigateToMock = vi.hoisted(() => vi.fn())

mockNuxtImport('navigateTo', () => navigateToMock)

const billsMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useBills', () => () => billsMock.api)

const catMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useCategories', () => () => catMock.api)

const walletsMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useWallets', () => () => walletsMock.api)

interface MockBillsApi {
  items: Ref<BillItem[]>
  pending: Ref<boolean>
  submitting: Ref<boolean>
  error: Ref<string | null>
  fieldErrors: Ref<Record<string, string>>
  refresh: ReturnType<typeof vi.fn>
  fetchOne: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
  archive: ReturnType<typeof vi.fn>
  pay: ReturnType<typeof vi.fn>
  updateRecurrence: ReturnType<typeof vi.fn>
  clearError: ReturnType<typeof vi.fn>
}

function billItem(overrides: Partial<BillItem> = {}): BillItem {
  return {
    id: BILL_ID,
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
    fetchOne?: ReturnType<typeof vi.fn>
  } = {}
): MockBillsApi {
  const items = ref(overrides.items ?? [billItem()])

  const api: MockBillsApi = {
    items,
    pending: ref(false),
    submitting: ref(false),
    error: ref(null),
    fieldErrors: ref({}),
    refresh: vi.fn(async () => {}),
    fetchOne: overrides.fetchOne ?? vi.fn(async (id: string) => ({
      ...(items.value.find(bill => bill.id === id) ?? items.value[0] ?? billItem()),
      payments: []
    })),
    update: vi.fn(async () => billItem()),
    remove: vi.fn(async () => true),
    archive: vi.fn(async () => archivedBill()),
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

function setCategories(): void {
  catMock.api = {
    items: ref([{ id: 'c1', name: 'Listrik', icon: null, type: 'expense' }]),
    pending: ref(false),
    error: ref(null),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {})
  }
}

function setWallets(): void {
  walletsMock.api = {
    items: ref(walletFixtures()),
    pending: ref(false),
    error: ref(null),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {})
  }
}

async function mountDetail() {
  return mountSuspended(DetailPage, { route: `/bills/${BILL_ID}` })
}

async function flush(): Promise<void> {
  for (let index = 0; index < 5; index++) {
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

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

function bodyText(): string {
  return document.body.textContent ?? ''
}

function actionButton(wrapper: Awaited<ReturnType<typeof mountDetail>>, label: string) {
  return wrapper.findAll('button').find(button => button.text() === label)
}

beforeEach(() => {
  authMock.logout.mockClear()
  authMock.isHouseholdOwner.value = true
  toastMock.add.mockClear()
  navigateToMock.mockClear()
  setCategories()
  setWallets()
})

// UModal me-render via teleport yang tidak selalu ikut ter-unmount bersama
// wrapper; bersihkan sisa modal antar test agar query document.body tidak
// mengenai modal basi dari test sebelumnya.
afterEach(() => {
  document.body.innerHTML = ''
})

describe('bills detail page', () => {
  it('direct navigation memuat bill sesuai ID route + tombol kembali ke /bills', async () => {
    const state = setupBillsState()

    const wrapper = await mountDetail()

    expect(state.fetchOne).toHaveBeenCalledWith(BILL_ID)

    const text = wrapper.text()

    expect(text).toContain('Tagihan Listrik')
    expect(text).toContain('Jatuh tempo')
    expect(text).toContain('Listrik')
    expect(wrapper.find('a[href="/bills"]').exists()).toBe(true)
    expect(authMock.logout).not.toHaveBeenCalled()
  })

  it('detail unpaid menawarkan Bayar/Ubah/Hapus tanpa Arsipkan/Ubah jadwal', async () => {
    setupBillsState()

    const wrapper = await mountDetail()

    expect(actionButton(wrapper, 'Bayar')).toBeDefined()
    expect(actionButton(wrapper, 'Ubah')).toBeDefined()
    expect(actionButton(wrapper, 'Hapus')).toBeDefined()
    expect(actionButton(wrapper, 'Arsipkan')).toBeUndefined()
    expect(actionButton(wrapper, 'Ubah jadwal')).toBeUndefined()
  })

  it('detail recurrence menawarkan tambahan "Ubah jadwal"', async () => {
    setupBillsState({
      items: [recurringBill()],
      fetchOne: vi.fn(async (id: string) => ({ ...recurringBill({ id }), payments: [] }))
    })

    const wrapper = await mountDetail()

    expect(actionButton(wrapper, 'Bayar')).toBeDefined()
    expect(actionButton(wrapper, 'Ubah jadwal')).toBeDefined()
  })

  it('detail lunas menawarkan Arsipkan + riwayat pembayaran; tanpa Bayar/Ubah/Hapus', async () => {
    setupBillsState({
      fetchOne: vi.fn(async (id: string) => ({ ...paidBill({ id }), payments: [paymentFixture()] }))
    })

    const wrapper = await mountDetail()
    const text = wrapper.text()

    expect(actionButton(wrapper, 'Arsipkan')).toBeDefined()
    expect(actionButton(wrapper, 'Bayar')).toBeUndefined()
    expect(actionButton(wrapper, 'Ubah')).toBeUndefined()
    expect(actionButton(wrapper, 'Hapus')).toBeUndefined()
    expect(text).toContain('Riwayat pembayaran')
    expect(text).toContain('Kas Tunai')
    expect(text).toContain('Lunas')
  })

  it('detail arsip bersifat read-only (tanpa aksi tulis)', async () => {
    setupBillsState({
      items: [archivedBill()],
      fetchOne: vi.fn(async (id: string) => ({ ...archivedBill({ id }), payments: [paymentFixture()] }))
    })

    const wrapper = await mountDetail()

    expect(wrapper.text()).toContain('hanya dapat dibaca')
    expect(actionButton(wrapper, 'Bayar')).toBeUndefined()
    expect(actionButton(wrapper, 'Ubah')).toBeUndefined()
    expect(actionButton(wrapper, 'Hapus')).toBeUndefined()
    expect(actionButton(wrapper, 'Arsipkan')).toBeUndefined()
    expect(actionButton(wrapper, 'Ubah jadwal')).toBeUndefined()
  })

  it('non-owner tidak memperoleh aksi tulis (render-only, bukan pengganti authz)', async () => {
    setupBillsState()
    authMock.isHouseholdOwner.value = false

    const wrapper = await mountDetail()

    expect(wrapper.text()).toContain('hanya dapat dilihat')
    expect(actionButton(wrapper, 'Bayar')).toBeUndefined()
    expect(actionButton(wrapper, 'Ubah')).toBeUndefined()
    expect(actionButton(wrapper, 'Hapus')).toBeUndefined()
    expect(actionButton(wrapper, 'Arsipkan')).toBeUndefined()
    expect(actionButton(wrapper, 'Ubah jadwal')).toBeUndefined()
  })

  it('hapus dua-langkah recurrence + peringatan skip permanen + periode aktif terakhir', async () => {
    const state = setupBillsState({
      items: [recurringBill({ id: BILL_ID })]
    })

    const wrapper = await mountDetail()

    await actionButton(wrapper, 'Hapus')!.trigger('click')
    await flush()

    // Konfirmasi dua langkah; remove() belum dipanggil.
    expect(state.remove).not.toHaveBeenCalled()

    const text = wrapper.text()

    expect(text).toContain('dilewati secara PERMANEN')
    expect(text).toContain('TIDAK menghentikan jadwal')
    // Satu-satunya periode aktif seri → peringatan G-1 ikut tampil.
    expect(text).toContain('periode AKTIF terakhir')

    await actionButton(wrapper, 'Ya, hapus')!.trigger('click')
    await flush()

    expect(state.remove).toHaveBeenCalledWith(BILL_ID)
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Tagihan dihapus' })
    )
    expect(navigateToMock).toHaveBeenCalledWith('/bills')
  })

  it('peringatan "periode aktif terakhir" tidak muncul bila seri masih punya periode lain', async () => {
    setupBillsState({
      items: [recurringBill({ id: BILL_ID }), recurringBill({ id: '01J0BILL00000000000000011' })]
    })

    const wrapper = await mountDetail()

    await actionButton(wrapper, 'Hapus')!.trigger('click')
    await flush()

    expect(wrapper.text()).toContain('dilewati secara PERMANEN')
    expect(wrapper.text()).not.toContain('periode AKTIF terakhir')
  })

  it('direct URL tanpa konteks daftar tidak mengklaim "periode aktif terakhir"', async () => {
    // Daftar global kosong (refresh murni / link dibagikan) — guard tidak
    // boleh mengklaim seri tanpa data.
    setupBillsState({
      items: [],
      fetchOne: vi.fn(async (id: string) => ({ ...recurringBill({ id }), payments: [] }))
    })

    const wrapper = await mountDetail()

    await actionButton(wrapper, 'Hapus')!.trigger('click')
    await flush()

    expect(wrapper.text()).toContain('dilewati secara PERMANEN')
    expect(wrapper.text()).not.toContain('periode AKTIF terakhir')
  })

  it('arsip dua-langkah: copy permanen + memanggil archive() + kembali ke daftar', async () => {
    const state = setupBillsState({
      fetchOne: vi.fn(async (id: string) => ({ ...paidBill({ id }), payments: [paymentFixture()] }))
    })

    const wrapper = await mountDetail()

    await actionButton(wrapper, 'Arsipkan')!.trigger('click')
    await flush()

    expect(state.archive).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Arsip bersifat permanen')

    await actionButton(wrapper, 'Ya, arsipkan')!.trigger('click')
    await flush()

    expect(state.archive).toHaveBeenCalledWith(BILL_ID)
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Tagihan diarsipkan' })
    )
    expect(navigateToMock).toHaveBeenCalledWith('/bills')
  })

  it('modal bayar: tanpa input nominal, sisa tagihan read-only, wallet non-aktif tak ditawarkan', async () => {
    const state = setupBillsState()
    setWallets()

    const wrapper = await mountDetail()

    await actionButton(wrapper, 'Bayar')!.trigger('click')
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
    expect(state.pay).toHaveBeenCalledWith(BILL_ID, {
      wallet_id: 'w1',
      occurred_on: ''
    })
  })

  it('sukses bayar menampilkan toast, reload detail, dan refresh dompet', async () => {
    const state = setupBillsState()
    setWallets()

    const wrapper = await mountDetail()

    await actionButton(wrapper, 'Bayar')!.trigger('click')
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

    const wrapper = await mountDetail()

    await actionButton(wrapper, 'Bayar')!.trigger('click')
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

    const wrapper = await mountDetail()

    await actionButton(wrapper, 'Bayar')!.trigger('click')
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
    expect(state.fetchOne.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('edit: form ter-prefill dari data server dan submit memanggil update() + reload', async () => {
    const state = setupBillsState()
    setCategories()

    const wrapper = await mountDetail()

    await actionButton(wrapper, 'Ubah')!.trigger('click')
    await flush()

    expect(bodyText()).toContain('Ubah tagihan')

    // Prefill dari field server (bukan tebakan frontend).
    expect((document.body.querySelector('#bill-title') as HTMLInputElement).value).toBe('Tagihan Listrik')
    expect((document.body.querySelector('#bill-amount') as HTMLInputElement).value).toBe('150000.00')

    wrapper.findComponent(BillFormModal).vm.$emit('submit', {
      title: 'Tagihan Listrik Baru',
      amount: '160000',
      due_date: '2026-10-26',
      category_id: 'c1',
      notes: '',
      recurrence: false
    })
    await flush()

    expect(state.update).toHaveBeenCalledWith(BILL_ID, expect.objectContaining({
      title: 'Tagihan Listrik Baru',
      amount: '160000'
    }))
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Tagihan diubah' })
    )
    // Detail dimuat ulang (PATCH mengembalikan BillItem tanpa payments).
    expect(state.fetchOne.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('pembuka "Ubah jadwal" membuka panel recurrence; submit memanggil updateRecurrence()', async () => {
    const state = setupBillsState({
      items: [recurringBill()],
      fetchOne: vi.fn(async (id: string) => ({ ...recurringBill({ id }), payments: [] }))
    })

    const wrapper = await mountDetail()

    await actionButton(wrapper, 'Ubah jadwal')!.trigger('click')
    await flush()

    expect(wrapper.findComponent(BillRecurrenceModal).props('open')).toBe(true)
    expect(wrapper.findComponent(BillRecurrenceModal).props('bill')?.recurrence?.id).toBe('r1')
    expect(state.updateRecurrence).not.toHaveBeenCalled()

    const changes = { frequency: 'yearly' as const, due_day: 5, is_active: true }

    wrapper.findComponent(BillRecurrenceModal).vm.$emit('submit', changes)
    await flush()

    expect(state.updateRecurrence).toHaveBeenCalledWith('r1', changes)
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Jadwal diubah' })
    )
    expect(state.fetchOne.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('404 menampilkan state not-found jujur tanpa retry', async () => {
    setupBillsState({
      fetchOne: vi.fn(async () => {
        throw {
          statusCode: 404,
          data: {
            data: {
              message: 'Bill not found.',
              error: { code: 'BILL_NOT_FOUND', message: 'Bill not found.' }
            }
          }
        }
      })
    })

    const wrapper = await mountDetail()
    const text = wrapper.text()

    expect(text).toContain('Tagihan tidak ditemukan.')
    expect(text).not.toContain('Coba lagi')
    expect(wrapper.find('a[href="/bills"]').exists()).toBe(true)
    expect(authMock.logout).not.toHaveBeenCalled()
  })

  it('error memuat menampilkan alert + Coba lagi; retry memuat ulang lewat loading skeleton', async () => {
    const fetchOne = vi.fn()
      .mockRejectedValueOnce({ statusCode: 500, data: { message: 'Server error.' } })

    setupBillsState({ fetchOne })

    const wrapper = await mountDetail()

    expect(wrapper.text()).toContain('Detail belum dapat dimuat.')
    expect(wrapper.text()).toContain('Server error.')

    // Retry berikutnya: request tertanda → skeleton loading tampil.
    let release!: (value: unknown) => void

    const gate = new Promise((resolve) => {
      release = resolve as (value: unknown) => void
    })

    fetchOne.mockReturnValueOnce(gate)

    const retryButton = wrapper.findAll('button').find(button => button.text().includes('Coba lagi'))

    expect(retryButton).toBeDefined()

    await retryButton!.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[aria-label="Memuat detail tagihan"]').exists()).toBe(true)

    release({ ...billItem(), payments: [] })
    await flush()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Tagihan Listrik')
    expect(fetchOne.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('refresh direct URL memuat ulang bill (tanpa state tab/modal)', async () => {
    const state = setupBillsState()

    await mountDetail()

    // Mount ulang = simulasi refresh/revisit URL yang sama.
    await mountDetail()

    expect(state.fetchOne.mock.calls.length).toBeGreaterThanOrEqual(2)
  })
})
