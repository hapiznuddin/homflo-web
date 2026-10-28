import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import SettingsPage from '~/pages/settings/index.vue'

const authMock = vi.hoisted(() => ({
  household: { value: { id: 'h1', name: 'Rumah Budi', role: 'owner' } },
  onboarding: { value: { required: false } },
  bootstrap: vi.fn(async () => 'authenticated')
}))

mockNuxtImport('useAuth', () => () => authMock)

describe('settings page', () => {
  it('menautkan lima bagian sitemap dan menampilkan household aktif', async () => {
    const wrapper = await mountSuspended(SettingsPage, { route: '/settings' })

    expect(wrapper.text()).toContain('Pengaturan')
    expect(wrapper.text()).toContain('Rumah Budi')
    expect(wrapper.text()).toContain('Anggota')
    expect(wrapper.text()).toContain('Kategori')
    expect(wrapper.text()).toContain('Akun')
    expect(wrapper.text()).toContain('Preferensi Aplikasi')

    const links = wrapper.findAll('a').map(link => link.attributes('href'))

    expect(links).toEqual(expect.arrayContaining([
      '/settings/household',
      '/settings/members',
      '/categories',
      '/account',
      '/settings/preferences'
    ]))
  })
})
