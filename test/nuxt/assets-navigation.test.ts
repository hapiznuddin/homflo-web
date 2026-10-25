import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { AssetItem } from '~/types/assets'
import AssetsPage from '~/pages/assets/index.vue'
import DashboardQuickActions from '~/components/dashboard/DashboardQuickActions.vue'
import MobileNavbar from '~/components/MobileNavbar.vue'
import DefaultLayout from '~/layouts/default.vue'

// Navigasi Home → Assets → Asset Detail (Phase 16.2):
// - sidebar desktop "Aset" → /assets
// - quick action MobileNavbar "Aset Rumah" → /assets
// - aksi cepat Home "Tambah Aset" → /assets
// - baris daftar → /assets/{id}

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

const assetsMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useAssets', () => () => assetsMock.api)

const propertiesMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useProperties', () => () => propertiesMock.api)

// Catatan: tidak ada pembersihan document.body di sini — drawer/sidebar
// reka-ui merender sebagian node di body; menghapusnya saat komponen masih
// hidup memicu race patch Vue (insertBefore null).

async function flush(): Promise<void> {
  for (let index = 0; index < 5; index++) {
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

function assetItem(overrides: Partial<AssetItem> = {}): AssetItem {
  return {
    id: '01J0ASSET0000000000000001',
    household_id: 'h1',
    name: 'Kulkas dapur',
    description: null,
    location: 'Dapur',
    acquired_on: '2026-01-15',
    acquisition_cost: '4500000.00',
    created_at: '2026-01-15T00:00:00.000000Z',
    updated_at: '2026-01-15T00:00:00.000000Z',
    property_id: null,
    property: null,
    ...overrides
  }
}

describe('navigasi Assets', () => {
  it('sidebar desktop menampilkan item Aset → /assets', async () => {
    const wrapper = await mountSuspended(DefaultLayout, { route: '/assets' })

    const links = Array.from(wrapper.findAll('a'))
    const aset = links.find(link => (link.text() ?? '').trim() === 'Aset')

    expect(aset).toBeDefined()
    expect(aset!.attributes('href')).toBe('/assets')
  })

  it('quick action "Aset Rumah" di MobileNavbar aktif menuju /assets', async () => {
    const wrapper = await mountSuspended(MobileNavbar, { route: '/dashboard' })

    const opener = wrapper.find('button[aria-label="Catat baru"]')

    expect(opener.exists()).toBe(true)

    await opener.trigger('click')
    await flush()

    const aset = wrapper.find('a[href="/assets"]')

    expect(aset.exists()).toBe(true)
    expect(aset.text()).toContain('Aset Rumah')
    expect(aset.attributes('aria-disabled')).not.toBe('true')
    expect(aset.attributes('disabled')).toBeUndefined()

    // Tutup kembali drawer agar pembersihan DOM antar test tidak
    // bertabrakan dengan state dialog yang masih terbuka.
    await opener.trigger('click')
    await flush()
  })

  it('aksi cepat Home "Tambah Aset" → /assets; aksi tanpa rute tetap disabled jujur', async () => {
    const wrapper = await mountSuspended(DashboardQuickActions, { route: false })

    const aset = wrapper.find('a[href="/assets"]')

    expect(aset.exists()).toBe(true)
    expect(aset.text()).toContain('Tambah Aset')
    expect(aset.attributes('aria-disabled')).not.toBe('true')

    // Phase 16.4.2 mengaktifkan "Tambah Kendaraan" → /vehicles, sehingga
    // hanya "Tambah Tagihan" yang masih tanpa rute dan tetap disabled.
    const buttons = wrapper.findAll('button')

    expect(buttons).toHaveLength(1)

    for (const button of buttons) {
      expect(button.attributes('aria-disabled')).toBe('true')
      expect(button.attributes('title')).toBe('Segera hadir')
    }
  })

  it('alur Home → Assets → Detail: tautan Home dan baris daftar menuju detail', async () => {
    const home = await mountSuspended(DashboardQuickActions, { route: false })

    expect(home.find('a[href="/assets"]').exists()).toBe(true)

    const item = assetItem()

    assetsMock.api = {
      items: ref([item]),
      pending: ref(false),
      submitting: ref(false),
      error: ref(null),
      fieldErrors: ref({}),
      load: vi.fn(async () => {}),
      refresh: vi.fn(async () => {}),
      fetchOne: vi.fn(async () => item),
      create: vi.fn(async () => item),
      update: vi.fn(async () => item),
      remove: vi.fn(async () => true),
      clearError: vi.fn()
    }

    propertiesMock.api = {
      items: ref([]),
      pending: ref(false),
      error: ref(null),
      load: vi.fn(async () => {}),
      clearError: vi.fn()
    }

    const list = await mountSuspended(AssetsPage, { route: '/assets' })
    const detailLink = list.find(`a[href="/assets/${item.id}"]`)

    expect(detailLink.exists()).toBe(true)
    expect(detailLink.text()).toContain('Kulkas dapur')
  })
})
