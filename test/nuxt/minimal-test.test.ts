import { mountSuspended } from '@nuxt/test-utils/runtime'
import { DOMWrapper } from '@vue/test-utils'
import { it, vi } from 'vitest'
import ListsPage from '~/pages/lists/index.vue'

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

it('minimal mount test', async () => {
  const wrapper = await mountSuspended(ListsPage, { route: '/lists' })
  expect(wrapper.exists()).toBe(true)
})
