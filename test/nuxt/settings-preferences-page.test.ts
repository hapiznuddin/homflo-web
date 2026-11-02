import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import PreferencesPage from '~/pages/settings/preferences.vue'

const preferencesMock = vi.hoisted(() => ({ api: undefined as unknown as PreferencesMock }))
const toastMock = vi.hoisted(() => ({ add: vi.fn() }))

mockNuxtImport('usePreferences', () => () => preferencesMock.api)
mockNuxtImport('useToast', () => () => toastMock)

interface PreferencesMock {
  theme: Ref<'system' | 'light' | 'dark'>
  pending: Ref<boolean>
  submitting: Ref<boolean>
  error: Ref<string | null>
  loaded: Ref<boolean>
  load: ReturnType<typeof vi.fn> & ((force?: boolean) => Promise<void>)
  update: ReturnType<typeof vi.fn> & ((next: 'system' | 'light' | 'dark') => Promise<boolean>)
}

function setupState(
  overrides: {
    theme?: 'system' | 'light' | 'dark'
    pending?: boolean
    submitting?: boolean
    error?: string | null
    loaded?: boolean
    updateResult?: boolean
  } = {}
) {
  preferencesMock.api = {
    theme: ref(overrides.theme ?? 'system'),
    pending: ref(overrides.pending ?? false),
    submitting: ref(overrides.submitting ?? false),
    error: ref(overrides.error ?? null),
    loaded: ref(overrides.loaded ?? true),
    load: vi.fn(async (force = false) => {
      void force
    }),
    update: vi.fn(async () => overrides.updateResult ?? true)
  }

  toastMock.add.mockClear()

  return preferencesMock.api
}

async function mountPage() {
  return mountSuspended(PreferencesPage, { route: '/settings/preferences' })
}

function flush(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}

describe('settings preferences page', () => {
  beforeEach(() => {
    setupState()
  })

  it('memuat dan menampilkan ketiga pilihan tema', async () => {
    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Tema')
    expect(text).toContain('Ikuti sistem')
    expect(text).toContain('Terang')
    expect(text).toContain('Gelap')

    expect(preferencesMock.api.load).toHaveBeenCalled()
    expect(wrapper.findAll('[aria-pressed]')).toHaveLength(3)
  })

  it('memilih tema memanggil penyimpanan backend', async () => {
    const wrapper = await mountPage()
    const lightOption = wrapper.findAll('[aria-pressed]').find(button => button.text().includes('Terang'))!

    await lightOption.trigger('click')
    await flush()

    expect(preferencesMock.api.update).toHaveBeenCalledWith('light')
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Preferensi tema disimpan' })
    )
  })

  it('tema saat ini ditandai pressed tanpa menyimpan ulang', async () => {
    setupState({ theme: 'dark' })

    const wrapper = await mountPage()
    const darkOption = wrapper.findAll('[aria-pressed]').find(button => button.text().includes('Gelap'))!

    expect(darkOption.attributes('aria-pressed')).toBe('true')

    await darkOption.trigger('click')
    await flush()

    expect(preferencesMock.api.update).not.toHaveBeenCalled()
  })

  it('kegagalan simpan tidak menampilkan toast sukses dan menampilkan alert', async () => {
    setupState({ updateResult: false, error: 'Preferensi tema belum dapat disimpan.', loaded: true })

    const wrapper = await mountPage()
    const lightOption = wrapper.findAll('[aria-pressed]').find(button => button.text().includes('Terang'))!

    await lightOption.trigger('click')
    await flush()

    expect(preferencesMock.api.update).toHaveBeenCalledWith('light')
    expect(toastMock.add).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Aksi terakhir gagal.')
    expect(wrapper.text()).toContain('Preferensi tema belum dapat disimpan.')
  })

  it('gagal memuat menampilkan retry yang memanggil load ulang', async () => {
    setupState({ error: 'Preferensi tema belum dapat dimuat.', loaded: false })

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Preferensi belum dapat dimuat.')
    expect(text).toContain('Coba lagi')

    preferencesMock.api.load.mockClear()
    await wrapper.findAll('button').find(button => button.text() === 'Coba lagi')!.trigger('click')

    expect(preferencesMock.api.load).toHaveBeenCalledWith(true)
  })

  it('memuat awal menampilkan skeleton tanpa pilihan', async () => {
    setupState({ pending: true, loaded: false })

    const wrapper = await mountPage()

    expect(wrapper.find('[aria-label="Memuat preferensi"]').exists()).toBe(true)
    expect(wrapper.findAll('[aria-pressed]')).toHaveLength(0)
  })

  it('menyediakan tautan kembali ke Settings', async () => {
    const wrapper = await mountPage()

    expect(wrapper.findAll('a').map(link => link.attributes('href'))).toContain('/settings')
  })
})
