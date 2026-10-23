import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { DOMWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import type { AssetItem } from '~/types/assets'
import DetailPage from '~/pages/assets/[id].vue'

// Halaman detail /assets/[id]: deep-linkable lewat GET /api/assets/{id},
// states loading/error/not-found, aksi tulis hanya owner (backend tetap
// otoritas), delete dua langkah, dan tidak ada klaim sukses palsu.

const ASSET_ID = '01J0ASSET0000000000000001'

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

interface MockAssetsApi {
  items: Ref<AssetItem[]>
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

const assetsMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useAssets', () => () => assetsMock.api)

function assetItem(overrides: Partial<AssetItem> = {}): AssetItem {
  return {
    id: ASSET_ID,
    household_id: 'h1',
    name: 'Kulkas dapur',
    description: 'Dua pintu',
    location: 'Dapur',
    acquired_on: '2026-01-15',
    acquisition_cost: '4500000.00',
    created_at: '2026-01-15T00:00:00.000000Z',
    updated_at: '2026-01-15T00:00:00.000000Z',
    ...overrides
  }
}

function setupAssetsState(
  overrides: {
    fetchOne?: ReturnType<typeof vi.fn>
    update?: ReturnType<typeof vi.fn>
    remove?: ReturnType<typeof vi.fn>
  } = {}
): MockAssetsApi {
  const api: MockAssetsApi = {
    items: ref([assetItem()]),
    pending: ref(false),
    submitting: ref(false),
    error: ref(null),
    fieldErrors: ref({}),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {}),
    fetchOne: overrides.fetchOne ?? vi.fn(async () => assetItem()),
    create: vi.fn(async () => assetItem()),
    update: overrides.update ?? vi.fn(async () => assetItem()),
    remove: overrides.remove ?? vi.fn(async () => true),
    clearError: vi.fn()
  }

  assetsMock.api = api

  return api
}

async function mountDetail() {
  return mountSuspended(DetailPage, { route: `/assets/${ASSET_ID}` })
}

async function flush(): Promise<void> {
  for (let index = 0; index < 5; index++) {
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

function bodyText(): string {
  return document.body.textContent ?? ''
}

function bodyButton(label: string): DOMWrapper<Element> {
  const element = Array.from(document.body.querySelectorAll('button'))
    .find(button => (button.textContent ?? '').trim() === label)

  if (!element) {
    throw new Error(`Tombol "${label}" tidak ditemukan di modal`)
  }

  return new DOMWrapper(element)
}

function actionButton(wrapper: Awaited<ReturnType<typeof mountDetail>>, label: string) {
  return wrapper.findAll('button').find(button => button.text() === label)
}

beforeEach(() => {
  authMock.isHouseholdOwner.value = true
  authMock.logout.mockClear()
  toastMock.add.mockClear()
  navigateToMock.mockClear()
})

// UModal me-render via teleport yang tidak selalu ikut ter-unmount bersama
// wrapper; bersihkan sisa modal antar test.
afterEach(() => {
  document.body.innerHTML = ''
})

describe('asset detail page', () => {
  it('direct navigation memuat aset sesuai ID route + tombol kembali ke /assets', async () => {
    const state = setupAssetsState()

    const wrapper = await mountDetail()

    expect(state.fetchOne).toHaveBeenCalledWith(ASSET_ID)

    const text = wrapper.text()

    expect(text).toContain('Kulkas dapur')
    expect(text).toContain('Dua pintu')
    expect(text).toContain('Dapur')
    expect(text).toContain('15 Jan 2026')
    expect(text).toContain('4.500.000')
    expect(wrapper.find('a[href="/assets"]').exists()).toBe(true)
    expect(authMock.logout).not.toHaveBeenCalled()
  })

  it('ASSET_NOT_FOUND / 404 menampilkan state not-found jujur tanpa retry', async () => {
    setupAssetsState({
      fetchOne: vi.fn(async () => {
        throw {
          statusCode: 404,
          data: {
            data: {
              message: 'Asset not found.',
              error: { code: 'ASSET_NOT_FOUND', message: 'Asset not found.' }
            }
          }
        }
      })
    })

    const wrapper = await mountDetail()
    const text = wrapper.text()

    expect(text).toContain('Aset tidak ditemukan.')
    expect(text).not.toContain('Coba lagi')
    expect(wrapper.find('a[href="/assets"]').exists()).toBe(true)
  })

  it('error memuat menampilkan alert + Coba lagi; retry memuat ulang lewat loading skeleton', async () => {
    const fetchOne = vi.fn()
      .mockRejectedValueOnce({ statusCode: 500, data: { message: 'Server error.' } })

    setupAssetsState({ fetchOne })

    const wrapper = await mountDetail()

    expect(wrapper.text()).toContain('Detail belum dapat dimuat.')
    expect(wrapper.text()).toContain('Server error.')

    let release!: (value: unknown) => void

    const gate = new Promise((resolve) => {
      release = resolve as (value: unknown) => void
    })

    fetchOne.mockReturnValueOnce(gate)

    const retryButton = wrapper.findAll('button').find(button => button.text().includes('Coba lagi'))

    expect(retryButton).toBeDefined()

    await retryButton!.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[aria-label="Memuat detail aset"]').exists()).toBe(true)

    release(assetItem())
    await flush()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Kulkas dapur')
    expect(fetchOne.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('owner memperoleh kontrol Ubah/Hapus', async () => {
    setupAssetsState()

    const wrapper = await mountDetail()

    expect(actionButton(wrapper, 'Ubah')).toBeDefined()
    expect(actionButton(wrapper, 'Hapus')).toBeDefined()
  })

  it('member tidak memperoleh kontrol write (render-only, bukan pengganti authz)', async () => {
    authMock.isHouseholdOwner.value = false
    setupAssetsState()

    const wrapper = await mountDetail()

    expect(wrapper.text()).toContain('hanya dapat dilihat')
    expect(actionButton(wrapper, 'Ubah')).toBeUndefined()
    expect(actionButton(wrapper, 'Hapus')).toBeUndefined()
  })

  it('form edit terisi data detail dan mengirim PATCH ke ID yang benar', async () => {
    const state = setupAssetsState()

    const wrapper = await mountDetail()

    await actionButton(wrapper, 'Ubah')!.trigger('click')
    await flush()

    expect(bodyText()).toContain('Ubah aset')

    const nameInput = document.body.querySelector('#asset-name') as HTMLInputElement

    expect(nameInput.value).toBe('Kulkas dapur')
    expect((document.body.querySelector('#asset-location') as HTMLInputElement).value).toBe('Dapur')
    expect((document.body.querySelector('#asset-acquired-on') as HTMLInputElement).value).toBe('2026-01-15')
    expect((document.body.querySelector('#asset-acquisition-cost') as HTMLInputElement).value).toBe('4500000.00')

    await new DOMWrapper(nameInput).setValue('Kulkas baru')
    await bodyButton('Simpan').trigger('click')
    await flush()

    expect(state.update).toHaveBeenCalledWith(ASSET_ID, {
      name: 'Kulkas baru',
      description: 'Dua pintu',
      location: 'Dapur',
      acquired_on: '2026-01-15',
      acquisition_cost: '4500000.00'
    })
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Aset diubah' })
    )
    // Detail dimuat ulang setelah simpan.
    expect(state.fetchOne.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('error update tampil di modal tanpa toast sukses palsu', async () => {
    const state = setupAssetsState()

    state.update.mockImplementation(async () => {
      state.error.value = 'Email Anda belum terverifikasi. Silakan verifikasi terlebih dahulu.'

      return null
    })

    const wrapper = await mountDetail()

    await actionButton(wrapper, 'Ubah')!.trigger('click')
    await flush()

    await bodyButton('Simpan').trigger('click')
    await flush()

    expect(bodyText()).toContain('Data belum dapat disimpan.')
    expect(bodyText()).toContain('Email Anda belum terverifikasi.')
    expect(toastMock.add).not.toHaveBeenCalled()
  })

  it('hapus memerlukan konfirmasi lalu menavigasi ke /assets setelah sukses', async () => {
    const state = setupAssetsState()

    const wrapper = await mountDetail()

    await actionButton(wrapper, 'Hapus')!.trigger('click')
    await flush()

    expect(wrapper.text()).toContain('Hapus aset ini?')
    expect(state.remove).not.toHaveBeenCalled()

    await actionButton(wrapper, 'Ya, hapus')!.trigger('click')
    await flush()

    expect(state.remove).toHaveBeenCalledWith(ASSET_ID)
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Aset dihapus' })
    )
    expect(navigateToMock).toHaveBeenCalledWith('/assets')
  })

  it('hapus gagal tidak memberi toast sukses dan tidak menavigasi', async () => {
    const state = setupAssetsState()

    state.remove.mockImplementation(async () => {
      state.error.value = 'Aset belum dapat dihapus.'

      return false
    })

    const wrapper = await mountDetail()

    await actionButton(wrapper, 'Hapus')!.trigger('click')
    await flush()
    await actionButton(wrapper, 'Ya, hapus')!.trigger('click')
    await flush()

    expect(state.remove).toHaveBeenCalledWith(ASSET_ID)
    expect(wrapper.text()).toContain('Aksi terakhir gagal.')
    expect(wrapper.text()).toContain('Aset belum dapat dihapus.')
    expect(toastMock.add).not.toHaveBeenCalled()
    expect(navigateToMock).not.toHaveBeenCalled()
  })
})
