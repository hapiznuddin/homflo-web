import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import LandingPage from '~/pages/index.vue'
import LandingNav from '~/components/landing/Nav.vue'
import LandingPreview from '~/components/landing/Preview.vue'

const authMock = vi.hoisted(() => ({
  bootstrap: vi.fn(async () => 'unauthenticated')
}))

mockNuxtImport('useAuth', () => () => authMock)

async function flush(): Promise<void> {
  for (let index = 0; index < 4; index++) {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

describe('landing page', () => {
  it('menampilkan headline, CTA nyata, dan tanpa id ganda', async () => {
    const wrapper = await mountSuspended(LandingPage, { route: '/' })
    await flush()

    expect(wrapper.find('h1').text()).toBe('Rumah dan uang, satu tempat.')
    expect(wrapper.find('a[href="/register"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/login"]').exists()).toBe(true)

    const ids = wrapper.findAll('[id]').map((node) => node.attributes('id'))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('pratinjau berpindah tab dan memakai satu set id unik', async () => {
    const wrapper = await mountSuspended(LandingPreview, { route: false })

    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs).toHaveLength(4)

    await tabs[1]!.trigger('click')
    expect(tabs[1]!.attributes('aria-selected')).toBe('true')
    expect(wrapper.find('[role="tabpanel"]').attributes('aria-labelledby')).toContain(
      'preview-tab-'
    )

    const ids = wrapper.findAll('[id]').map((node) => node.attributes('id'))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('menu seluler membuka dan menutup navigasi', async () => {
    const wrapper = await mountSuspended(LandingNav, { route: false })

    const toggle = wrapper.find('button[aria-controls="landing-mobile-menu"]')
    expect(toggle.attributes('aria-expanded')).toBe('false')

    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('#landing-mobile-menu').isVisible()).toBe(true)

    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('false')
  })
})
