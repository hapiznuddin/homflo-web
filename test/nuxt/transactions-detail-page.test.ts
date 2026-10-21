import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import USelect from '@nuxt/ui/components/Select.vue'
import { DOMWrapper } from '@vue/test-utils'
import TransactionFormModal from '~/components/transactions/TransactionFormModal.vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import type { TransactionItem } from '~/types/transactions'
import type { WalletItem } from '~/types/wallets'
import DetailPage from '~/pages/transactions/[id].vue'

// Halaman detail /transactions/[id] (Phase 15.2.3) — menggantikan
// TransactionDetailModal: deep-linkable, states loading/error/not-found,
// aksi Ubah/Hapus dengan guard BILL_PAYMENT_LOCKED (D-08).

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

const navigateToMock = vi.hoisted(() => vi.fn())

mockNuxtImport('navigateTo', () => navigateToMock)

const txMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useTransactions', () => () => txMock.api)

const catMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useCategories', () => () => catMock.api)

const walletsMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useWallets', () => () => walletsMock.api)

const TX_ID = '01J0000000000000000000001'

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

function sampleItem(overrides: Partial<TransactionItem> = {}): TransactionItem {
  return {
    id: TX_ID,
    household_id: 'h1',
    type: 'expense',
    amount: '685000.00',
    occurred_on: '2026-10-02',
    description: 'Belanja Supermarket',
    wallet: 'Kas Tunai',
    category: { id: 'c1', name: 'Dapur', icon: null },
    wallet_id: 'w1',
    destination_wallet_id: null,
    source_wallet: { id: 'w1', name: 'Kas Tunai', type: 'cash', is_active: true },
    destination_wallet: null,
    bill_payment: null,
    created_at: '2026-10-02T00:00:00.000000Z',
    updated_at: '2026-10-02T00:00:00.000000Z',
    ...overrides
  }
}

interface MockTx {
  fetchOne: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
  clearError: ReturnType<typeof vi.fn>
  submitting: Ref<boolean>
  error: Ref<string | null>
  fieldErrors: Ref<Record<string, string>>
}

function setupTxState(
  overrides: { fetchOne?: MockTx['fetchOne'], update?: MockTx['update'], remove?: MockTx['remove'] } = {}
): MockTx {
  const api: MockTx = {
    fetchOne: overrides.fetchOne ?? vi.fn(async (id: string) => sampleItem({ id })),
    update: overrides.update ?? vi.fn(async () => sampleItem({ description: 'revisi' })),
    remove: overrides.remove ?? vi.fn(async () => true),
    clearError: vi.fn(),
    submitting: ref(false),
    error: ref(null),
    fieldErrors: ref({})
  }

  txMock.api = api

  return api
}

function setupAuxState(): void {
  catMock.api = {
    items: ref([{ id: 'c1', name: 'Dapur', icon: null }]),
    pending: ref(false),
    error: ref(null),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {})
  }

  walletsMock.api = {
    items: ref(sampleWallets()),
    pending: ref(false),
    error: ref(null),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {})
  }
}

async function mountDetail() {
  return mountSuspended(DetailPage, { route: `/transactions/${TX_ID}` })
}

async function flush(): Promise<void> {
  for (let index = 0; index < 5; index++) {
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

describe('transactions detail page', () => {
  beforeEach(() => {
    authMock.bootstrap.mockClear()
    authMock.logout.mockClear()
    toastMock.add.mockClear()
    navigateToMock.mockClear()
    setupAuxState()
  })

  // UModal form edit me-render via teleport ke document.body.
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('memuat detail via ID rute dan menampilkan data expense (tanggal, kategori, dompet)', async () => {
    const state = setupTxState()

    const wrapper = await mountDetail()
    const text = wrapper.text()

    expect(state.fetchOne).toHaveBeenCalledWith(TX_ID)
    expect(text).toContain('Belanja Supermarket')
    expect(text).toContain('Dapur')
    expect(text).toContain('Dompet')
    expect(text).toContain('Kas Tunai')
    expect(text).toContain('Kembali ke daftar')
    expect(wrapper.find('a[href="/transactions"]').exists()).toBe(true)
    expect(text).toContain('Ubah')
    expect(text).toContain('Hapus')
  })

  it('transfer tampil netral: label "Transfer", tanpa tanda, sumber + tujuan tampil', async () => {
    setupTxState({
      fetchOne: vi.fn(async (id: string) => sampleItem({
        id,
        type: 'transfer',
        amount: '416250.00',
        description: 'Pindah dompet',
        category: null,
        destination_wallet_id: 'w3',
        destination_wallet: { id: 'w3', name: 'Rekening BCA', type: 'bank', is_active: true }
      }))
    })

    const wrapper = await mountDetail()
    const text = wrapper.text()

    expect(text).toContain('Transfer')
    expect(text).not.toContain('Pengeluaran')

    const amount = wrapper.find('p.font-bold')

    expect(amount.text()).not.toMatch(/^[-+]/)
    expect(amount.classes()).toContain('text-default')
    expect(amount.classes()).not.toContain('text-success')

    expect(text).toContain('Dompet sumber')
    expect(text).toContain('Kas Tunai')
    expect(text).toContain('Dompet tujuan')
    expect(text).toContain('Rekening BCA')
  })

  it('pembayaran tagihan (D-08): banner + tanpa aksi Ubah/Hapus', async () => {
    setupTxState({
      fetchOne: vi.fn(async (id: string) => sampleItem({
        id,
        category: { id: 'c1', name: 'Listrik', icon: null },
        bill_payment: { bill_id: 'b1', bill_title: 'Tagihan Listrik' }
      }))
    })

    const wrapper = await mountDetail()
    const text = wrapper.text()

    expect(text).toContain('Pembayaran tagihan')
    expect(text).toContain('Tagihan Listrik')

    const labels = wrapper.findAll('button').map(button => button.text().trim())

    expect(labels).not.toContain('Ubah')
    expect(labels).not.toContain('Hapus')
  })

  it('404 menampilkan state not-found jujur tanpa retry', async () => {
    setupTxState({
      fetchOne: vi.fn(async () => {
        throw {
          statusCode: 404,
          data: {
            data: {
              message: 'Transaksi tidak ditemukan.',
              error: { code: 'TRANSACTION_NOT_FOUND', message: 'Transaksi tidak ditemukan.' }
            }
          }
        }
      })
    })

    const wrapper = await mountDetail()
    const text = wrapper.text()

    expect(text).toContain('Transaksi tidak ditemukan.')
    expect(text).not.toContain('Coba lagi')
    expect(wrapper.find('a[href="/transactions"]').exists()).toBe(true)
    expect(authMock.logout).not.toHaveBeenCalled()
  })

  it('error memuat menampilkan alert + Coba lagi; retry memuat ulang lewat loading skeleton', async () => {
    const fetchOne = vi.fn()
      .mockRejectedValueOnce({ statusCode: 500, data: { message: 'Server error.' } })

    setupTxState({ fetchOne })

    const wrapper = await mountDetail()

    expect(wrapper.text()).toContain('Detail belum dapat dimuat.')
    expect(wrapper.text()).toContain('Server error.')

    // Retry berikutnya: request tertunda → skeleton loading tampil.
    let release!: (value: unknown) => void

    const gate = new Promise((resolve) => {
      release = resolve as (value: unknown) => void
    })

    fetchOne.mockReturnValueOnce(gate)

    const retryButton = wrapper.findAll('button').find(button => button.text().includes('Coba lagi'))

    expect(retryButton).toBeDefined()

    await retryButton!.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[aria-label="Memuat detail transaksi"]').exists()).toBe(true)

    release(sampleItem({ description: 'hasil retry' }))
    await flush()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('hasil retry')
    expect(fetchOne).toHaveBeenCalledTimes(2)
  })

  it('Ubah membuka form dan submit memanggil update() dengan id & values benar', async () => {
    const state = setupTxState()

    const wrapper = await mountDetail()

    const editButton = wrapper.findAll('button').find(button => button.text().includes('Ubah'))

    await editButton!.trigger('click')
    await flush()

    expect(document.body.textContent).toContain('Ubah transaksi')

    // Prefill wallet sumber dari wallet_id item (edit pindah dompet
    // didukung backend — select aktif, bukan read-only).
    const modal = wrapper.findComponent(TransactionFormModal)

    expect(modal.findAllComponents(USelect).length).toBeGreaterThanOrEqual(3)

    const submitButton = Array.from(document.body.querySelectorAll('button'))
      .find(button => (button.textContent ?? '').trim() === 'Simpan')

    if (!submitButton) {
      throw new Error('Tombol Simpan tidak ditemukan')
    }

    await new DOMWrapper(submitButton).trigger('click')
    await flush()

    expect(state.update).toHaveBeenCalledTimes(1)
    expect(state.update.mock.calls[0]?.[0]).toBe(TX_ID)

    const values = state.update.mock.calls[0]?.[1] as {
      type: string
      amount: string
      wallet_id: string
      destination_wallet_id: string
    }

    expect(values.type).toBe('expense')
    expect(values.amount).toBe('685000.00')
    expect(values.wallet_id).toBe('w1')
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Transaksi diubah' })
    )
  })

  it('hapus memakai konfirmasi dua langkah lalu remove() + redirect ke /transactions', async () => {
    const state = setupTxState()

    const wrapper = await mountDetail()

    const deleteButton = wrapper.findAll('button').find(button => button.text().includes('Hapus'))

    await deleteButton!.trigger('click')
    await wrapper.vm.$nextTick()

    // Langkah 1: konfirmasi muncul, remove() belum dipanggil.
    expect(state.remove).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Ya, hapus')

    const confirmButton = wrapper.findAll('button').find(button => button.text().includes('Ya, hapus'))

    await confirmButton!.trigger('click')
    await flush()

    expect(state.remove).toHaveBeenCalledWith(TX_ID)
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Transaksi dihapus' })
    )
    expect(navigateToMock).toHaveBeenCalledWith('/transactions')
  })

  it('error UPDATE (mis. INSUFFICIENT_FUNDS) tampil sebagai alert di form edit', async () => {
    const state = setupTxState()

    state.update.mockImplementation(async () => {
      state.error.value = 'Saldo dompet tidak cukup.'

      return null
    })

    const wrapper = await mountDetail()

    const editButton = wrapper.findAll('button').find(button => button.text().includes('Ubah'))

    await editButton!.trigger('click')
    await flush()

    const submitButton = Array.from(document.body.querySelectorAll('button'))
      .find(button => (button.textContent ?? '').trim() === 'Simpan')

    await new DOMWrapper(submitButton as Element).trigger('click')
    await flush()

    expect(document.body.textContent).toContain('Transaksi belum tersimpan.')
    expect(document.body.textContent).toContain('Saldo dompet tidak cukup.')
  })
})
