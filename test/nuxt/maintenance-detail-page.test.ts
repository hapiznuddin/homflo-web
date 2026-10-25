import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { DOMWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import type { AssetItem } from '~/types/assets'
import type { MaintenanceItem } from '~/types/maintenance'
import DetailPage from '~/pages/maintenance/[id].vue'
import { formatYmd } from '~/utils/format'

// Halaman detail /maintenance/[id]: deep-linkable lewat GET
// /api/maintenance/{id}, states loading/error/not-found, aksi tulis hanya
// owner mengikuti status backend (scheduled → Selesai/Ubah/Batalkan/Hapus;
// completed & cancelled → final hanya Hapus). Kegagalan lifecycle tidak
// pernah diklaim sukses.

const MAINTENANCE_ID = '01J0MAINT0000000000000001'
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

interface MockMaintenanceApi {
  items: Ref<MaintenanceItem[]>
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
  complete: ReturnType<typeof vi.fn>
  cancel: ReturnType<typeof vi.fn>
  clearError: ReturnType<typeof vi.fn>
}

const maintenanceMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useMaintenance', () => () => maintenanceMock.api)

const assetsMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useAssets', () => () => assetsMock.api)

function maintenanceItem(overrides: Partial<MaintenanceItem> = {}): MaintenanceItem {
  return {
    id: MAINTENANCE_ID,
    household_id: 'h1',
    asset_id: ASSET_ID,
    title: 'Cuci AC kamar',
    description: 'Rutin bulanan',
    location: 'Kamar utama',
    scheduled_date: '2026-11-01',
    completed_at: null,
    cancelled_at: null,
    priority: 'sedang',
    status: 'scheduled',
    created_at: '2026-10-01T00:00:00.000000Z',
    updated_at: '2026-10-01T00:00:00.000000Z',
    ...overrides
  }
}

function assetItem(overrides: Partial<AssetItem> = {}): AssetItem {
  return {
    id: ASSET_ID,
    household_id: 'h1',
    name: 'Mesin cuci dapur',
    description: null,
    location: 'Kamar utama',
    acquired_on: '2026-01-15',
    acquisition_cost: '4500000.00',
    created_at: '2026-01-15T00:00:00.000000Z',
    updated_at: '2026-01-15T00:00:00.000000Z',
    property_id: null,
    property: null,
    ...overrides
  }
}

function setupState(
  overrides: {
    fetchOne?: ReturnType<typeof vi.fn>
    update?: ReturnType<typeof vi.fn>
    remove?: ReturnType<typeof vi.fn>
    complete?: ReturnType<typeof vi.fn>
    cancel?: ReturnType<typeof vi.fn>
  } = {}
): MockMaintenanceApi {
  const api: MockMaintenanceApi = {
    items: ref([maintenanceItem()]),
    pending: ref(false),
    submitting: ref(false),
    error: ref(null),
    fieldErrors: ref({}),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {}),
    fetchOne: overrides.fetchOne ?? vi.fn(async () => maintenanceItem()),
    create: vi.fn(async () => maintenanceItem()),
    update: overrides.update ?? vi.fn(async () => maintenanceItem()),
    remove: overrides.remove ?? vi.fn(async () => true),
    complete: overrides.complete ?? vi.fn(async () => maintenanceItem({ status: 'completed' })),
    cancel: overrides.cancel ?? vi.fn(async () => maintenanceItem({ status: 'cancelled' })),
    clearError: vi.fn()
  }

  maintenanceMock.api = api

  assetsMock.api = {
    items: ref([assetItem()]),
    pending: ref(false),
    error: ref(null),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {}),
    clearError: vi.fn()
  }

  return api
}

async function mountDetail() {
  return mountSuspended(DetailPage, { route: `/maintenance/${MAINTENANCE_ID}` })
}

async function flush(): Promise<void> {
  for (let index = 0; index < 5; index++) {
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

function actionButton(wrapper: Awaited<ReturnType<typeof mountDetail>>, label: string) {
  return wrapper.findAll('button').find(button => button.text() === label)
}

function bodyButton(label: string): DOMWrapper<Element> {
  const element = Array.from(document.body.querySelectorAll('button'))
    .find(button => (button.textContent ?? '').trim() === label)

  if (!element) {
    throw new Error(`Tombol "${label}" tidak ditemukan di modal`)
  }

  return new DOMWrapper(element)
}

beforeEach(() => {
  authMock.isHouseholdOwner.value = true
  authMock.logout.mockClear()
  toastMock.add.mockClear()
  navigateToMock.mockClear()
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('maintenance detail page', () => {
  it('direct navigation memuat detail sesuai ID + tombol kembali ke /maintenance', async () => {
    const state = setupState()

    const wrapper = await mountDetail()

    expect(state.fetchOne).toHaveBeenCalledWith(MAINTENANCE_ID)

    const text = wrapper.text()

    expect(text).toContain('Cuci AC kamar')
    expect(text).toContain('Rutin bulanan')
    expect(text).toContain('Mesin cuci dapur')
    expect(text).toContain('Kamar utama')
    expect(text).toContain(formatYmd('2026-11-01'))
    expect(text).toContain('Sedang')
    expect(text).toContain('Terjadwal')
    expect(wrapper.find('a[href="/maintenance"]').exists()).toBe(true)
    expect(authMock.logout).not.toHaveBeenCalled()
  })

  it('asset_id null menampilkan "Tanpa aset" tanpa membocorkan nama aset', async () => {
    setupState({ fetchOne: vi.fn(async () => maintenanceItem({ asset_id: null })) })

    const wrapper = await mountDetail()

    expect(wrapper.text()).toContain('Tanpa aset')
    expect(wrapper.text()).not.toContain('Mesin cuci dapur')
  })

  it('MAINTENANCE_NOT_FOUND / 404 menampilkan state not-found tanpa retry', async () => {
    setupState({
      fetchOne: vi.fn(async () => {
        throw {
          statusCode: 404,
          data: {
            data: {
              message: 'Maintenance not found.',
              error: { code: 'MAINTENANCE_NOT_FOUND', message: 'Maintenance not found.' }
            }
          }
        }
      })
    })

    const wrapper = await mountDetail()
    const text = wrapper.text()

    expect(text).toContain('Perawatan tidak ditemukan.')
    expect(text).not.toContain('Coba lagi')
    expect(wrapper.find('a[href="/maintenance"]').exists()).toBe(true)
    expect(authMock.logout).not.toHaveBeenCalled()
  })

  it('error memuat menampilkan alert + Coba lagi yang memuat ulang', async () => {
    const fetchOne = vi.fn()
      .mockRejectedValueOnce({ statusCode: 500, data: { message: 'Server error.' } })

    setupState({ fetchOne })

    const wrapper = await mountDetail()

    expect(wrapper.text()).toContain('Detail belum dapat dimuat.')
    expect(wrapper.text()).toContain('Server error.')

    fetchOne.mockResolvedValueOnce(maintenanceItem())

    await wrapper.findAll('button').find(button => button.text().includes('Coba lagi'))!.trigger('click')
    await flush()

    expect(wrapper.text()).toContain('Cuci AC kamar')
    expect(fetchOne.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('owner + scheduled memperoleh Selesai/Ubah/Batalkan/Hapus', async () => {
    setupState()

    const wrapper = await mountDetail()

    expect(actionButton(wrapper, 'Selesai')).toBeDefined()
    expect(actionButton(wrapper, 'Ubah')).toBeDefined()
    expect(actionButton(wrapper, 'Batalkan')).toBeDefined()
    expect(actionButton(wrapper, 'Hapus')).toBeDefined()
  })

  it('completed bersifat final: tanpa Selesai/Batalkan, menampilkan tanggal selesai', async () => {
    setupState({
      fetchOne: vi.fn(async () => maintenanceItem({ status: 'completed', completed_at: '2026-10-20' }))
    })

    const wrapper = await mountDetail()

    expect(actionButton(wrapper, 'Selesai')).toBeUndefined()
    expect(actionButton(wrapper, 'Batalkan')).toBeUndefined()
    expect(actionButton(wrapper, 'Ubah')).toBeUndefined()
    expect(actionButton(wrapper, 'Hapus')).toBeDefined()
    expect(wrapper.text()).toContain('Tanggal selesai')
    expect(wrapper.text()).toContain(formatYmd('2026-10-20'))
  })

  it('cancelled bersifat final: tanpa Selesai/Batalkan, menampilkan tanggal pembatalan', async () => {
    setupState({
      fetchOne: vi.fn(async () => maintenanceItem({ status: 'cancelled', cancelled_at: '2026-10-21' }))
    })

    const wrapper = await mountDetail()

    expect(actionButton(wrapper, 'Selesai')).toBeUndefined()
    expect(actionButton(wrapper, 'Batalkan')).toBeUndefined()
    expect(actionButton(wrapper, 'Hapus')).toBeDefined()
    expect(wrapper.text()).toContain('Tanggal pembatalan')
    expect(wrapper.text()).toContain(formatYmd('2026-10-21'))
  })

  it('member tidak memperoleh kontrol write (render-only, bukan pengganti authz)', async () => {
    authMock.isHouseholdOwner.value = false
    setupState()

    const wrapper = await mountDetail()

    expect(wrapper.text()).toContain('hanya dapat dilihat')
    expect(actionButton(wrapper, 'Selesai')).toBeUndefined()
    expect(actionButton(wrapper, 'Ubah')).toBeUndefined()
    expect(actionButton(wrapper, 'Hapus')).toBeUndefined()
  })

  it('form edit terisi detail dan mengirim PATCH ke ID yang benar', async () => {
    const state = setupState()

    const wrapper = await mountDetail()

    await actionButton(wrapper, 'Ubah')!.trigger('click')
    await flush()

    expect(document.body.textContent ?? '').toContain('Ubah perawatan')

    const titleInput = document.body.querySelector('#maintenance-title') as HTMLInputElement

    expect(titleInput.value).toBe('Cuci AC kamar')
    expect((document.body.querySelector('#maintenance-location') as HTMLInputElement).value).toBe('Kamar utama')
    expect((document.body.querySelector('#maintenance-scheduled-date') as HTMLInputElement).value).toBe('2026-11-01')

    await new DOMWrapper(titleInput).setValue('Servis AC kamar')
    await bodyButton('Simpan').trigger('click')
    await flush()

    expect(state.update).toHaveBeenCalledWith(MAINTENANCE_ID, {
      asset_id: ASSET_ID,
      title: 'Servis AC kamar',
      description: 'Rutin bulanan',
      location: 'Kamar utama',
      scheduled_date: '2026-11-01',
      priority: 'sedang'
    })
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Perawatan diubah' })
    )
    expect(state.fetchOne.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('error update tampil di modal tanpa toast sukses palsu', async () => {
    const state = setupState()

    state.update.mockImplementation(async () => {
      state.error.value = 'Kolom judul wajib diisi.'

      return null
    })

    const wrapper = await mountDetail()

    await actionButton(wrapper, 'Ubah')!.trigger('click')
    await flush()

    await bodyButton('Simpan').trigger('click')
    await flush()

    expect(document.body.textContent ?? '').toContain('Data belum dapat disimpan.')
    expect(toastMock.add).not.toHaveBeenCalled()
  })

  it('Selesai memerlukan konfirmasi lalu memanggil complete() dan refresh', async () => {
    const state = setupState()

    const wrapper = await mountDetail()

    await actionButton(wrapper, 'Selesai')!.trigger('click')
    await flush()

    expect(wrapper.text()).toContain('Tandai perawatan ini selesai?')
    expect(state.complete).not.toHaveBeenCalled()

    await actionButton(wrapper, 'Ya, selesaikan')!.trigger('click')
    await flush()

    expect(state.complete).toHaveBeenCalledWith(MAINTENANCE_ID)
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Perawatan selesai' })
    )
    expect(state.fetchOne.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('kegagalan complete menampilkan pesan error tanpa klaim sukses', async () => {
    const state = setupState()

    state.complete.mockImplementation(async () => {
      state.error.value = 'Perawatan ini sudah ditandai selesai.'

      return null
    })

    const wrapper = await mountDetail()

    await actionButton(wrapper, 'Selesai')!.trigger('click')
    await flush()
    await actionButton(wrapper, 'Ya, selesaikan')!.trigger('click')
    await flush()

    expect(state.complete).toHaveBeenCalledWith(MAINTENANCE_ID)
    expect(wrapper.text()).toContain('Aksi terakhir gagal.')
    expect(wrapper.text()).toContain('Perawatan ini sudah ditandai selesai.')
    expect(toastMock.add).not.toHaveBeenCalled()
  })

  it('Batalkan memerlukan konfirmasi lalu memanggil cancel()', async () => {
    const state = setupState()

    const wrapper = await mountDetail()

    await actionButton(wrapper, 'Batalkan')!.trigger('click')
    await flush()

    expect(wrapper.text()).toContain('Batalkan perawatan ini?')
    expect(state.cancel).not.toHaveBeenCalled()

    await actionButton(wrapper, 'Ya, batalkan')!.trigger('click')
    await flush()

    expect(state.cancel).toHaveBeenCalledWith(MAINTENANCE_ID)
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Perawatan dibatalkan' })
    )
  })

  it('hapus memerlukan konfirmasi lalu menavigasi ke /maintenance setelah sukses', async () => {
    const state = setupState()

    const wrapper = await mountDetail()

    await actionButton(wrapper, 'Hapus')!.trigger('click')
    await flush()

    expect(wrapper.text()).toContain('Hapus perawatan ini?')
    expect(state.remove).not.toHaveBeenCalled()

    await actionButton(wrapper, 'Ya, hapus')!.trigger('click')
    await flush()

    expect(state.remove).toHaveBeenCalledWith(MAINTENANCE_ID)
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Perawatan dihapus' })
    )
    expect(navigateToMock).toHaveBeenCalledWith('/maintenance')
  })

  it('hapus gagal tidak memberi toast sukses dan tidak menavigasi', async () => {
    const state = setupState()

    state.remove.mockImplementation(async () => {
      state.error.value = 'Perawatan belum dapat dihapus.'

      return false
    })

    const wrapper = await mountDetail()

    await actionButton(wrapper, 'Hapus')!.trigger('click')
    await flush()
    await actionButton(wrapper, 'Ya, hapus')!.trigger('click')
    await flush()

    expect(state.remove).toHaveBeenCalledWith(MAINTENANCE_ID)
    expect(wrapper.text()).toContain('Aksi terakhir gagal.')
    expect(wrapper.text()).toContain('Perawatan belum dapat dihapus.')
    expect(toastMock.add).not.toHaveBeenCalled()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('halaman tidak memanggil logout atau bootstrap auth', async () => {
    setupState()

    await mountDetail()

    expect(authMock.logout).not.toHaveBeenCalled()
    expect(authMock.bootstrap.mock.calls.length).toBeLessThanOrEqual(1)
  })
})
