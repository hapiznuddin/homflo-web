import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { VehicleItem } from '~/types/vehicles'
import VehiclesPage from '~/pages/vehicles/index.vue'
import DashboardQuickActions from '~/components/dashboard/DashboardQuickActions.vue'
import MobileNavbar from '~/components/MobileNavbar.vue'
import DefaultLayout from '~/layouts/default.vue'

// Navigasi Home → Vehicles → Vehicle Detail (Phase 16.4.2):
// - sidebar desktop "Kendaraan" → /vehicles
// - aksi cepat Home "Tambah Kendaraan" → /vehicles
// - baris daftar → /vehicles/{id}
// - menu mobile "Kendaraan & BBM" tetap disabled (BBM belum operasional)

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

const vehiclesMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useVehicles', () => () => vehiclesMock.api)

// Catatan: tidak ada pembersihan document.body di sini — drawer/sidebar
// reka-ui merender sebagian node di body; menghapusnya saat komponen masih
// hidup memicu race patch Vue (insertBefore null).

async function flush(): Promise<void> {
  for (let index = 0; index < 5; index++) {
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

function vehicleItem(overrides: Partial<VehicleItem> = {}): VehicleItem {
  return {
    id: '01J0VEHICLE000000000000001',
    household_id: 'h1',
    name: 'Motor Beat',
    brand: 'Honda',
    model: 'Beat FI',
    year: 2019,
    type: 'Sepeda motor',
    plate_number: 'B 1234 XYZ',
    odometer: 24000,
    created_at: '2026-01-15T00:00:00.000000Z',
    updated_at: '2026-01-15T00:00:00.000000Z',
    ...overrides
  }
}

describe('navigasi Vehicles', () => {
  it('sidebar desktop menampilkan item Kendaraan → /vehicles', async () => {
    const wrapper = await mountSuspended(DefaultLayout, { route: '/vehicles' })

    const links = Array.from(wrapper.findAll('a'))
    const kendaraan = links.find(link => (link.text() ?? '').trim() === 'Kendaraan')

    expect(kendaraan).toBeDefined()
    expect(kendaraan!.attributes('href')).toBe('/vehicles')
  })

  it('aksi cepat Home "Tambah Kendaraan" → /vehicles', async () => {
    const wrapper = await mountSuspended(DashboardQuickActions, { route: false })

    const link = wrapper.find('a[href="/vehicles"]')

    expect(link.exists()).toBe(true)
    expect(link.text()).toContain('Tambah Kendaraan')
    expect(link.attributes('aria-disabled')).not.toBe('true')
  })

  it('menu mobile "Kendaraan & BBM" tetap disabled (BBM bukan fitur operasional)', async () => {
    const wrapper = await mountSuspended(MobileNavbar, { route: '/dashboard' })

    const opener = wrapper.find('button[aria-label="Catat baru"]')

    await opener.trigger('click')
    await flush()

    const vehicle = Array.from(wrapper.findAll('button'))
      .find(button => (button.text() ?? '').includes('Kendaraan & BBM'))

    expect(vehicle).toBeDefined()
    expect(vehicle!.attributes('aria-disabled')).toBe('true')

    await opener.trigger('click')
    await flush()
  })

  it('alur Home → Vehicles → Detail: tautan Home dan baris daftar menuju detail', async () => {
    const home = await mountSuspended(DashboardQuickActions, { route: false })

    expect(home.find('a[href="/vehicles"]').exists()).toBe(true)

    const item = vehicleItem()

    vehiclesMock.api = {
      items: ref([item]),
      pending: ref(false),
      submitting: ref(false),
      error: ref(null),
      errorCode: ref(null),
      fieldErrors: ref({}),
      load: vi.fn(async () => {}),
      refresh: vi.fn(async () => {}),
      fetchOne: vi.fn(async () => item),
      create: vi.fn(async () => item),
      update: vi.fn(async () => item),
      remove: vi.fn(async () => true),
      clearError: vi.fn()
    }

    const list = await mountSuspended(VehiclesPage, { route: '/vehicles' })
    const detailLink = list.find(`a[href="/vehicles/${item.id}"]`)

    expect(detailLink.exists()).toBe(true)
    expect(detailLink.text()).toContain('Motor Beat')
  })
})
