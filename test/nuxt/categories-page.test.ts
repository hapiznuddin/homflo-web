import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { DOMWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import type { CategoryItem } from '~/types/categories'
import CategoriesPage from '~/pages/categories/index.vue'

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
  isHouseholdOwner: { value: true },
  onboarding: { value: { required: false } },
  bootstrap: vi.fn(async () => 'authenticated'),
  logout: vi.fn()
}))

mockNuxtImport('useAuth', () => () => authMock)

const toastMock = vi.hoisted(() => ({ add: vi.fn() }))

mockNuxtImport('useToast', () => () => toastMock)

interface MockCategoriesState {
  items: Ref<CategoryItem[]>
  pending: Ref<boolean>
  submitting: Ref<boolean>
  error: Ref<string | null>
  fieldErrors: Ref<Record<string, string>>
  loaded: Ref<boolean>
  load: ReturnType<typeof vi.fn>
  refresh: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
  clearError: ReturnType<typeof vi.fn>
}

const catMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useCategories', () => () => catMock.api)

function sampleItem(overrides: Partial<CategoryItem> = {}): CategoryItem {
  return {
    id: '01J0000000000000000000001',
    name: 'Dapur',
    icon: 'i-lucide-cooking-pot',
    type: 'expense',
    ...overrides
  }
}

function setupCategoriesState(
  overrides: {
    items?: CategoryItem[]
    pending?: boolean
    error?: string | null
    loaded?: boolean
  } = {}
): MockCategoriesState {
  const items = overrides.items ?? [sampleItem()]
  const state: MockCategoriesState = {
    items: ref(items),
    pending: ref(overrides.pending ?? false),
    submitting: ref(false),
    error: ref(overrides.error ?? null),
    fieldErrors: ref({}),
    loaded: ref(overrides.loaded ?? (items.length > 0 || (!overrides.pending && !overrides.error))),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {}),
    create: vi.fn(async () => sampleItem()),
    update: vi.fn(async () => sampleItem()),
    remove: vi.fn(async () => true),
    clearError: vi.fn()
  }

  catMock.api = state

  return state
}

async function mountPage() {
  return mountSuspended(CategoriesPage, { route: '/categories' })
}

describe('categories page', () => {
  beforeEach(() => {
    authMock.bootstrap.mockClear()
    authMock.logout.mockClear()
    toastMock.add.mockClear()
    authMock.isHouseholdOwner.value = true
  })

  // UModal me-render via teleport yang tidak selalu ikut ter-unmount
  // bersama wrapper; bersihkan sisa modal antar test agar query
  // document.body tidak mengenai modal basi dari test sebelumnya.
  afterEach(() => {
    document.body.innerHTML = ''
  })

  // UModal me-render via teleport ke document.body, sehingga tombol di
  // dalam modal dicari di body, bukan di dalam wrapper halaman.
  function bodyText(): string {
    return document.body.textContent ?? ''
  }

  async function flush(): Promise<void> {
    for (let index = 0; index < 5; index++) {
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  }

  it('menampilkan judul dan baris kategori dengan ikon', async () => {
    setupCategoriesState()

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Kategori')
    expect(text).toContain('Dapur')
  })

  it('state loading menampilkan skeleton tanpa konten privat', async () => {
    setupCategoriesState({ items: [], pending: true })

    const wrapper = await mountPage()

    expect(wrapper.find('[aria-label="Memuat kategori"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Dapur')
  })

  it('state kosong menampilkan CTA tambah', async () => {
    setupCategoriesState({ items: [] })

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Belum ada kategori tercatat.')
    expect(text).toContain('Tambah Kategori')
  })

  it('member dapat membaca kategori tetapi tidak melihat kontrol mutasi owner', async () => {
    authMock.isHouseholdOwner.value = false
    setupCategoriesState()

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Dapur')
    expect(wrapper.find('button[aria-label="Ubah kategori"]').exists()).toBe(false)
    expect(wrapper.find('button[aria-label="Hapus kategori"]').exists()).toBe(false)
    expect(wrapper.findAll('button').some(button => button.text().includes('Tambah'))).toBe(false)
  })

  it('state error saat list kosong menampilkan alert + retry tanpa logout', async () => {
    setupCategoriesState({ items: [], error: 'Koneksi terputus' })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Data kategori belum dapat dimuat.')
    expect(wrapper.text()).toContain('Koneksi terputus')
    expect(wrapper.text()).toContain('Coba lagi')
    expect(authMock.logout).not.toHaveBeenCalled()
  })

  it('tombol "Coba lagi" memanggil refresh()', async () => {
    const state = setupCategoriesState({ items: [], error: 'Koneksi terputus' })

    const wrapper = await mountPage()
    const retryButton = wrapper.findAll('button').find(button => button.text().includes('Coba lagi'))

    expect(retryButton).toBeDefined()

    await retryButton!.trigger('click')

    expect(state.refresh).toHaveBeenCalledTimes(1)
  })

  it('error aksi dengan list utuh tidak menyembunyikan kategori', async () => {
    setupCategoriesState({ error: 'Kategori masih dipakai' })

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Dapur')
    expect(text).toContain('Aksi terakhir gagal.')
  })

  it('error aksi pada daftar kosong tetap menampilkan empty state, bukan error muat', async () => {
    setupCategoriesState({ items: [], error: 'Kategori masih dipakai', loaded: true })

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Belum ada kategori tercatat.')
    expect(text).toContain('Aksi terakhir gagal.')
    expect(text).not.toContain('Data kategori belum dapat dimuat.')
  })

  it('tombol Tambah membuka form dan submit memanggil create()', async () => {
    const state = setupCategoriesState()

    const wrapper = await mountPage()
    const addButton = wrapper.findAll('button').find(button => button.text().includes('Tambah'))

    await addButton!.trigger('click')
    await flush()

    expect(bodyText()).toContain('Tambah kategori')

    const nameInput = document.body.querySelector('#cat-name')

    if (!nameInput) {
      throw new Error('Input nama tidak ditemukan di modal')
    }

    await new DOMWrapper(nameInput as Element).setValue('Transport')

    const submitButton = Array.from(document.body.querySelectorAll('button'))
      .find(button => (button.textContent ?? '').trim() === 'Tambah')

    if (!submitButton) {
      throw new Error('Tombol submit tidak ditemukan di modal')
    }

    await new DOMWrapper(submitButton).trigger('click')

    expect(state.create).toHaveBeenCalledTimes(1)
    expect(state.create).toHaveBeenCalledWith({ name: 'Transport', icon: 'i-lucide-tag', type: 'expense' })
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Kategori ditambah' })
    )
  })

  it('tombol ikon tidak mengirim form dan pilihan tanpa ikon mengirim null', async () => {
    const state = setupCategoriesState()

    const wrapper = await mountPage()

    await wrapper.findAll('button').find(button => button.text().includes('Tambah'))!.trigger('click')
    await flush()

    const nameInput = document.body.querySelector('#cat-name')

    if (!nameInput) {
      throw new Error('Input nama tidak ditemukan di modal')
    }

    await new DOMWrapper(nameInput as Element).setValue('Transport')

    const iconButton = document.body.querySelector('button[aria-label="Pilih ikon wallet"]')

    if (!iconButton) {
      throw new Error('Tombol ikon tidak ditemukan di modal')
    }

    await new DOMWrapper(iconButton as Element).trigger('click')
    await flush()

    // Tombol pemilih ikon berada di dalam form; tanpa type="button" klik
    // akan ikut men-submit kategori.
    expect(state.create).not.toHaveBeenCalled()

    const noIconButton = Array.from(document.body.querySelectorAll('button'))
      .find(button => (button.textContent ?? '').trim() === 'Tanpa ikon')

    if (!noIconButton) {
      throw new Error('Tombol tanpa ikon tidak ditemukan di modal')
    }

    await new DOMWrapper(noIconButton).trigger('click')

    const submitButton = Array.from(document.body.querySelectorAll('button'))
      .find(button => (button.textContent ?? '').trim() === 'Tambah')

    await new DOMWrapper(submitButton!).trigger('click')

    expect(state.create).toHaveBeenCalledWith({ name: 'Transport', icon: '', type: 'expense' })
  })

  it('memilih jenis income di form ikut dikirim ke create()', async () => {
    const state = setupCategoriesState()

    const wrapper = await mountPage()

    await wrapper.findAll('button').find(button => button.text().includes('Tambah'))!.trigger('click')
    await flush()

    const nameInput = document.body.querySelector('#cat-name')

    if (!nameInput) {
      throw new Error('Input nama tidak ditemukan di modal')
    }

    await new DOMWrapper(nameInput as Element).setValue('Gaji freelance')

    const typeSelect = document.body.querySelector('#cat-type')

    if (!typeSelect) {
      throw new Error('Select jenis tidak ditemukan di modal')
    }

    await new DOMWrapper(typeSelect as Element).setValue('income')

    const submitButton = Array.from(document.body.querySelectorAll('button'))
      .find(button => (button.textContent ?? '').trim() === 'Tambah')

    if (!submitButton) {
      throw new Error('Tombol submit tidak ditemukan di modal')
    }

    await new DOMWrapper(submitButton).trigger('click')

    // Pilihan jenis pada form harus ikut terkirim, bukan hanya nama.
    expect(state.create).toHaveBeenCalledTimes(1)
    expect(state.create).toHaveBeenCalledWith({
      name: 'Gaji freelance',
      icon: 'i-lucide-tag',
      type: 'income'
    })
  })

  it('edit dari baris memanggil update() dengan id yang benar', async () => {
    const state = setupCategoriesState()

    const wrapper = await mountPage()
    const editButton = wrapper.find('button[aria-label="Ubah kategori"]')

    expect(editButton.exists()).toBe(true)

    await editButton.trigger('click')
    await flush()

    expect(bodyText()).toContain('Ubah kategori')

    const nameInput = document.body.querySelector('#cat-name')

    if (!nameInput) {
      throw new Error('Input nama tidak ditemukan di modal')
    }

    await new DOMWrapper(nameInput as Element).setValue('Dapur Bersih')

    const submitButton = Array.from(document.body.querySelectorAll('button'))
      .find(button => (button.textContent ?? '').trim() === 'Simpan')

    await new DOMWrapper(submitButton!).trigger('click')

    expect(state.update).toHaveBeenCalledWith(
      '01J0000000000000000000001',
      expect.objectContaining({ name: 'Dapur Bersih' })
    )
  })

  it('hapus memakai konfirmasi dua langkah; gagal tidak menghilangkan baris', async () => {
    const state = setupCategoriesState()

    state.remove.mockResolvedValueOnce(false)

    const wrapper = await mountPage()
    const deleteButton = wrapper.find('button[aria-label="Hapus kategori"]')

    await deleteButton.trigger('click')

    expect(wrapper.text()).toContain('Hapus kategori ini?')
    expect(state.remove).not.toHaveBeenCalled()

    const confirmButton = wrapper.findAll('button').find(button => button.text().includes('Ya, hapus'))

    await confirmButton!.trigger('click')

    expect(state.remove).toHaveBeenCalledWith('01J0000000000000000000001')
    // Baris tetap tampil karena backend menolak.
    expect(wrapper.text()).toContain('Dapur')
  })

  it('hapus sukses menutup konfirmasi dan toast', async () => {
    const state = setupCategoriesState()

    const wrapper = await mountPage()

    await wrapper.find('button[aria-label="Hapus kategori"]').trigger('click')
    await wrapper.findAll('button').find(button => button.text().includes('Ya, hapus'))!.trigger('click')

    expect(state.remove).toHaveBeenCalledWith('01J0000000000000000000001')
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Kategori dihapus' })
    )
  })

  it('halaman tidak memanggil logout atau bootstrap auth', async () => {
    setupCategoriesState()

    await mountPage()

    expect(authMock.logout).not.toHaveBeenCalled()
    expect(authMock.bootstrap.mock.calls.length).toBeLessThanOrEqual(1)
  })
})
