import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LandingPage from '~/pages/index.vue'
import LandingNav from '~/components/landingPage/Nav.vue'
import LandingPreview from '~/components/landingPage/FeatureSections/Preview.vue'

const authMock = vi.hoisted(() => ({
  bootstrap: vi.fn(async () => 'unauthenticated')
}))

mockNuxtImport('useAuth', () => () => authMock)

interface ColorModeMock {
  value: 'light' | 'dark'
  preference: 'system' | 'light' | 'dark'
}

const colorModeMock = vi.hoisted(() => ({
  api: undefined as unknown as ColorModeMock
}))

mockNuxtImport('useColorMode', () => () => colorModeMock.api)

async function flush(): Promise<void> {
  for (let index = 0; index < 4; index++) {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

describe('landing page', () => {
  beforeEach(() => {
    colorModeMock.api = reactive<ColorModeMock>({ value: 'light', preference: 'system' })
  })

  it('menampilkan headline, CTA nyata, dan tanpa id ganda', async () => {
    const wrapper = await mountSuspended(LandingPage, { route: '/' })
    await flush()

    expect(wrapper.find('h1').text()).toBe('Satu tempat untuk semua urusan rumah tangga Anda.')
    expect(wrapper.find('a[href="/register"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/login"]').exists()).toBe(true)

    const ids = wrapper.findAll('[id]').map((node) => node.attributes('id'))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('menampilkan enam domain, rumah tangga, dan batas kolaborasi', async () => {
    const wrapper = await mountSuspended(LandingPage, { route: '/' })
    await flush()

    expect(wrapper.findAll('nav[aria-label="Area produk Homflo"] > a')).toHaveLength(6)
    expect(wrapper.find('#rumah-tangga').exists()).toBe(true)
    expect(wrapper.find('#rumah-tangga').text()).toContain('Belum ada kolaborasi real-time')
    expect(wrapper.find('#rumah-tangga').text()).toContain('Undangan lewat email')
  })

  it('memakai FAQ native, enam pertanyaan, dan footer tanpa heading', async () => {
    const wrapper = await mountSuspended(LandingPage, { route: '/' })
    await flush()

    expect(wrapper.findAll('#faq details')).toHaveLength(6)
    expect(wrapper.findAll('footer h2')).toHaveLength(0)
    expect(wrapper.text()).toContain('Pratinjau antarmuka dengan data sintetis')
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

  it('tombol tema mengganti preferensi terang dan gelap', async () => {
    const wrapper = await mountSuspended(LandingNav, { route: false })

    const toggle = wrapper.find('button[aria-label="Ubah tema terang atau gelap"]')
    expect(toggle.exists()).toBe(true)

    await toggle.trigger('click')
    expect(colorModeMock.api.preference).toBe('dark')

    colorModeMock.api.value = 'dark'
    await toggle.trigger('click')
    expect(colorModeMock.api.preference).toBe('light')
  })
})
