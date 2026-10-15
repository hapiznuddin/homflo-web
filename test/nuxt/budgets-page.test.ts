import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import USelect from '@nuxt/ui/components/Select.vue'
import { DOMWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import type { BudgetItem } from '~/types/budgets'
import type { CategoryItem } from '~/types/categories'
import BudgetFormModal from '~/components/budgets/BudgetFormModal.vue'
import BudgetsPage from '~/pages/budgets/index.vue'

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

interface MockBudgetsState {
  items: Ref<BudgetItem[]>
  period: Ref<{ year: number, month: number, label: string }>
  pending: Ref<boolean>
  submitting: Ref<boolean>
  error: Ref<string | null>
  fieldErrors: Ref<Record<string, string>>
  load: ReturnType<typeof vi.fn>
  refresh: ReturnType<typeof vi.fn>
  setPeriod: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
  clearError: ReturnType<typeof vi.fn>
}

const bgMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useBudgets', () => () => bgMock.api)

const catMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useCategories', () => () => catMock.api)

function sampleItem(overrides: Partial<BudgetItem> = {}): BudgetItem {
  return {
    id: '01J0000000000000000000001',
    household_id: 'h1',
    category: { id: 'c1', name: 'Dapur', icon: 'i-lucide-cooking-pot' },
    year: 2026,
    month: 10,
    amount: '500000.00',
    created_at: '2026-10-01T00:00:00.000000Z',
    updated_at: '2026-10-01T00:00:00.000000Z',
    ...overrides
  }
}

function setupBudgetsState(
  overrides: {
    items?: BudgetItem[]
    pending?: boolean
    error?: string | null
  } = {}
): MockBudgetsState {
  const state: MockBudgetsState = {
    items: ref(overrides.items ?? [sampleItem()]),
    period: ref({ year: 2026, month: 10, label: 'Oktober 2026' }),
    pending: ref(overrides.pending ?? false),
    submitting: ref(false),
    error: ref(overrides.error ?? null),
    fieldErrors: ref({}),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {}),
    setPeriod: vi.fn(),
    create: vi.fn(async () => sampleItem()),
    update: vi.fn(async () => sampleItem()),
    remove: vi.fn(async () => true),
    clearError: vi.fn()
  }

  bgMock.api = state

  return state
}

function setupCategoriesState(items: CategoryItem[] = [{ id: 'c1', name: 'Dapur', icon: 'i-lucide-cooking-pot' }]): void {
  catMock.api = {
    items: ref(items),
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
}

async function mountPage() {
  return mountSuspended(BudgetsPage, { route: '/budgets' })
}

describe('budgets page', () => {
  beforeEach(() => {
    authMock.bootstrap.mockClear()
    authMock.logout.mockClear()
    toastMock.add.mockClear()
    setupCategoriesState()
  })

  // UModal me-render via teleport yang tidak selalu ikut ter-unmount
  // bersama wrapper; bersihkan sisa modal antar test agar query
  // document.body tidak mengenai modal basi dari test sebelumnya.
  afterEach(() => {
    document.body.innerHTML = ''
  })

  function bodyText(): string {
    return document.body.textContent ?? ''
  }

  async function flush(): Promise<void> {
    for (let index = 0; index < 5; index++) {
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  }

  it('menampilkan judul, baris anggaran, dan pemilih periode', async () => {
    setupBudgetsState()

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Anggaran')
    expect(text).toContain('Dapur')
    expect(text).toContain('Oktober 2026')
    expect(wrapper.find('#bg-filter-period').exists()).toBe(true)
  })

  it('state loading menampilkan skeleton tanpa konten privat', async () => {
    setupBudgetsState({ items: [], pending: true })

    const wrapper = await mountPage()

    expect(wrapper.find('[aria-label="Memuat anggaran"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Dapur')
  })

  it('state kosong menampilkan CTA tambah', async () => {
    setupBudgetsState({ items: [] })

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Belum ada anggaran periode ini.')
    expect(text).toContain('Tambah Anggaran')
  })

  it('state error saat list kosong menampilkan alert + retry tanpa logout', async () => {
    setupBudgetsState({ items: [], error: 'Koneksi terputus' })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Data anggaran belum dapat dimuat.')
    expect(wrapper.text()).toContain('Koneksi terputus')
    expect(wrapper.text()).toContain('Coba lagi')
    expect(authMock.logout).not.toHaveBeenCalled()
  })

  it('tombol "Coba lagi" memanggil refresh()', async () => {
    const state = setupBudgetsState({ items: [], error: 'Koneksi terputus' })

    const wrapper = await mountPage()
    const retryButton = wrapper.findAll('button').find(button => button.text().includes('Coba lagi'))

    expect(retryButton).toBeDefined()

    await retryButton!.trigger('click')

    expect(state.refresh).toHaveBeenCalledTimes(1)
  })

  it('error aksi dengan list utuh tidak menyembunyikan anggaran', async () => {
    setupBudgetsState({ error: 'Anggaran untuk kategori dan periode tersebut sudah ada.' })

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Dapur')
    expect(text).toContain('Aksi terakhir gagal.')
  })

  it('mengganti periode memuat ulang periode tersebut', async () => {
    const state = setupBudgetsState()

    const wrapper = await mountPage()
    const selects = wrapper.findAllComponents(USelect)

    expect(selects.length).toBeGreaterThanOrEqual(1)

    // Select pemilih periode adalah USelect pertama di halaman.
    selects[0]!.vm.$emit('update:modelValue', '2026-09')
    await selects[0]!.vm.$emit('change', new Event('change'))

    expect(state.load).toHaveBeenCalledWith(
      { year: 2026, month: 9, label: 'September 2026' },
      true
    )
  })

  it('tombol Tambah membuka form dan submit memanggil create()', async () => {
    const state = setupBudgetsState()

    const wrapper = await mountPage()
    const addButton = wrapper.findAll('button').find(button => button.text().includes('Tambah'))

    await addButton!.trigger('click')
    await flush()

    expect(bodyText()).toContain('Tambah anggaran')

    // Pilih kategori via 2 emit USelect (update:modelValue; klik DOM pada
    // option reka tidak selektif di happy-dom).
    const modal = wrapper.findComponent(BudgetFormModal)
    const modalSelects = modal.findAllComponents(USelect)

    expect(modalSelects).toHaveLength(2)

    modalSelects[0]!.vm.$emit('update:modelValue', 'c1')

    const amountInput = document.body.querySelector('#bg-amount')

    if (!amountInput) {
      throw new Error('Input nominal tidak ditemukan di modal')
    }

    await new DOMWrapper(amountInput as Element).setValue('750000')

    const submitButton = Array.from(document.body.querySelectorAll('button'))
      .find(button => (button.textContent ?? '').trim() === 'Tambah')

    if (!submitButton) {
      throw new Error('Tombol submit tidak ditemukan di modal')
    }

    await new DOMWrapper(submitButton).trigger('click')

    expect(state.create).toHaveBeenCalledTimes(1)
    expect(state.create).toHaveBeenCalledWith(
      expect.objectContaining({ category_id: 'c1', amount: '750000' })
    )
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Anggaran ditambah' })
    )
  })

  it('edit dari baris memanggil update() dengan id yang benar', async () => {
    const state = setupBudgetsState()

    const wrapper = await mountPage()
    const editButton = wrapper.find('button[aria-label="Ubah anggaran"]')

    expect(editButton.exists()).toBe(true)

    await editButton.trigger('click')
    await flush()

    expect(bodyText()).toContain('Ubah anggaran')

    const amountInput = document.body.querySelector('#bg-amount')

    if (!amountInput) {
      throw new Error('Input nominal tidak ditemukan di modal')
    }

    await new DOMWrapper(amountInput as Element).setValue('600000')

    const submitButton = Array.from(document.body.querySelectorAll('button'))
      .find(button => (button.textContent ?? '').trim() === 'Simpan')

    await new DOMWrapper(submitButton!).trigger('click')

    expect(state.update).toHaveBeenCalledWith(
      '01J0000000000000000000001',
      expect.objectContaining({ amount: '600000' })
    )
  })

  it('hapus memakai konfirmasi dua langkah; gagal tidak menghilangkan baris', async () => {
    const state = setupBudgetsState()

    state.remove.mockResolvedValueOnce(false)

    const wrapper = await mountPage()
    const deleteButton = wrapper.find('button[aria-label="Hapus anggaran"]')

    await deleteButton.trigger('click')

    expect(wrapper.text()).toContain('Ya, hapus')
    expect(state.remove).not.toHaveBeenCalled()

    const confirmButton = wrapper.findAll('button').find(button => button.text().includes('Ya, hapus'))

    await confirmButton!.trigger('click')

    expect(state.remove).toHaveBeenCalledWith('01J0000000000000000000001')
    // Baris tetap tampil karena backend menolak.
    expect(wrapper.text()).toContain('Dapur')
  })

  it('hapus sukses menutup konfirmasi dan toast', async () => {
    const state = setupBudgetsState()

    const wrapper = await mountPage()

    await wrapper.find('button[aria-label="Hapus anggaran"]').trigger('click')
    await wrapper.findAll('button').find(button => button.text().includes('Ya, hapus'))!.trigger('click')

    expect(state.remove).toHaveBeenCalledWith('01J0000000000000000000001')
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Anggaran dihapus' })
    )
  })

  it('nominal tampil sebagai Rupiah tanpa klaim progres', async () => {
    setupBudgetsState()

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Rp')
    expect(text).not.toContain('tersisa')
    expect(text).not.toContain('terpakai')
    expect(text).not.toContain('%')
  })

  it('halaman tidak memanggil logout atau bootstrap auth', async () => {
    setupBudgetsState()

    await mountPage()

    expect(authMock.logout).not.toHaveBeenCalled()
    expect(authMock.bootstrap.mock.calls.length).toBeLessThanOrEqual(1)
  })
})
