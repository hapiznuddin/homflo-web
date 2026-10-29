import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import PreferencesPage from '~/pages/settings/preferences.vue'

mockNuxtImport('useAuth', () => () => ({
  household: { value: { id: 'h1', name: 'Rumah Budi', role: 'owner' } },
  onboarding: { value: { required: false } },
  bootstrap: vi.fn(async () => 'authenticated')
}))

describe('settings preferences page', () => {
  it('menjelaskan bahwa preferensi aplikasi belum memiliki kontrak', async () => {
    const wrapper = await mountSuspended(PreferencesPage, { route: '/settings/preferences' })

    expect(wrapper.text()).toContain('Preferensi Aplikasi')
    expect(wrapper.text()).toContain('Belum ada preferensi yang disimpan')
    expect(wrapper.text()).toContain('Tidak ada model, endpoint, atau kontrak preferensi aplikasi')
  })

  it('menyediakan tautan kembali ke Settings', async () => {
    const wrapper = await mountSuspended(PreferencesPage, { route: '/settings/preferences' })

    expect(wrapper.findAll('a').map(link => link.attributes('href'))).toContain('/settings')
  })
})
