import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import MobileNavbar from '~/components/MobileNavbar.vue'
import DefaultLayout from '~/layouts/default.vue'

// Aksesibilitas halaman Perawatan dari navigasi utama (Phase 16.3.3):
// - sidebar desktop "Perawatan" → /maintenance (aktif saat di /maintenance)
// - quick action MobileNavbar "Maintenance" kini aktif → /maintenance
// - tidak ada item /maintenance duplikat; Kendaraan & BBM tetap disabled.

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

// Catatan: tidak ada pembersihan document.body di sini — drawer/sidebar
// reka-ui merender sebagian node di body; menghapusnya saat komponen masih
// hidup memicu race patch Vue (insertBefore null).

async function flush(): Promise<void> {
  for (let index = 0; index < 5; index++) {
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

describe('navigasi Maintenance', () => {
  it('sidebar desktop menampilkan item Perawatan → /maintenance', async () => {
    const wrapper = await mountSuspended(DefaultLayout, { route: '/maintenance' })

    const links = Array.from(wrapper.findAll('a'))
    const perawatan = links.find(link => (link.text() ?? '').trim() === 'Perawatan')

    expect(perawatan).toBeDefined()
    expect(perawatan!.attributes('href')).toBe('/maintenance')
  })

  it('item Perawatan berstatus aktif saat route /maintenance', async () => {
    const wrapper = await mountSuspended(DefaultLayout, { route: '/maintenance' })

    const perawatan = Array.from(wrapper.findAll('a'))
      .find(link => (link.text() ?? '').trim() === 'Perawatan')

    expect(perawatan).toBeDefined()
    expect(perawatan!.attributes('aria-current')).toBe('page')
  })

  it('tidak ada tautan /maintenance duplikat di sidebar', async () => {
    const wrapper = await mountSuspended(DefaultLayout, { route: '/maintenance' })

    const matches = Array.from(wrapper.findAll('a'))
      .filter(link => link.attributes('href') === '/maintenance')

    expect(matches).toHaveLength(1)
  })

  it('quick action "Maintenance" di MobileNavbar aktif menuju /maintenance', async () => {
    const wrapper = await mountSuspended(MobileNavbar, { route: '/dashboard' })

    const opener = wrapper.find('button[aria-label="Catat baru"]')

    expect(opener.exists()).toBe(true)

    await opener.trigger('click')
    await flush()

    const link = wrapper.find('a[href="/maintenance"]')

    expect(link.exists()).toBe(true)
    expect(link.text()).toContain('Maintenance')
    expect(link.attributes('aria-disabled')).not.toBe('true')
    expect(link.attributes('disabled')).toBeUndefined()

    // Tutup kembali drawer agar pembersihan DOM antar test tidak
    // bertabrakan dengan state dialog yang masih terbuka.
    await opener.trigger('click')
    await flush()
  })

  it('aksi Kendaraan & BBM tetap disabled (tidak berubah)', async () => {
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
})
