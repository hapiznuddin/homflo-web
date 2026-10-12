import { clearNuxtState } from '#app'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import PwaInstallBanner from '~/components/PwaInstallBanner.vue'

const DISMISS_KEY = 'homflo-pwa-install-dismissed'
const HOUR_MS = 60 * 60 * 1000

function dispatchInstallPrompt(prompt: () => Promise<void> = async () => {}) {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
    prompt?: () => Promise<void>
    userChoice?: Promise<{ outcome: string }>
  }

  event.prompt = prompt
  event.userChoice = Promise.resolve({ outcome: 'accepted' })
  window.dispatchEvent(event)

  return prompt
}

function findButton(wrapper: { findAll: (selector: string) => Array<{ text: () => string }> }, label: string) {
  const button = wrapper.findAll('button').find(candidate => candidate.text().includes(label))

  if (!button) {
    throw new Error(`Tombol "${label}" tidak ditemukan`)
  }

  return button as unknown as { trigger: (event: string) => Promise<void> }
}

async function flushPromises(rounds = 3) {
  for (let index = 0; index < rounds; index++) {
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

beforeEach(() => {
  localStorage.clear()
  clearNuxtState()
})

describe('PwaInstallBanner', () => {
  it('tersembunyi sebelum event beforeinstallprompt tiba', async () => {
    const wrapper = await mountSuspended(PwaInstallBanner)

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('menampilkan tombol Pasang dan Nanti saat prompt installable tersedia', async () => {
    const wrapper = await mountSuspended(PwaInstallBanner)

    dispatchInstallPrompt()
    await flushPromises()

    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Pasang')
    expect(wrapper.text()).toContain('Nanti')
  })

  it('klik Pasang memanggil prompt bawaan lalu menyembunyikan banner', async () => {
    const prompt = vi.fn(async () => {})
    const wrapper = await mountSuspended(PwaInstallBanner)

    dispatchInstallPrompt(prompt)
    await flushPromises()

    const before = Date.now()
    await findButton(wrapper, 'Pasang').trigger('click')
    await flushPromises()

    expect(prompt).toHaveBeenCalledTimes(1)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    const stored = Number.parseInt(localStorage.getItem(DISMISS_KEY) ?? '', 10)

    expect(stored).toBeGreaterThanOrEqual(before)
    expect(stored).toBeLessThanOrEqual(Date.now())
  })

  it('penolakan "Nanti" bertahan setelah remount (regresi refresh selalu muncul)', async () => {
    const first = await mountSuspended(PwaInstallBanner)

    dispatchInstallPrompt()
    await flushPromises()
    await findButton(first, 'Nanti').trigger('click')
    await flushPromises()

    expect(localStorage.getItem(DISMISS_KEY)).not.toBeNull()

    clearNuxtState()
    const second = await mountSuspended(PwaInstallBanner)

    dispatchInstallPrompt()
    await flushPromises()

    expect(second.find('[role="dialog"]').exists()).toBe(false)
  })

  it('banner muncul lagi setelah masa jeda 12 jam kedaluwarsa', async () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() - 13 * HOUR_MS))

    const wrapper = await mountSuspended(PwaInstallBanner)

    dispatchInstallPrompt()
    await flushPromises()

    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
  })

  it('penolakan 1 jam lalu masih menyembunyikan banner', async () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() - 1 * HOUR_MS))

    const wrapper = await mountSuspended(PwaInstallBanner)

    dispatchInstallPrompt()
    await flushPromises()

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })
})
