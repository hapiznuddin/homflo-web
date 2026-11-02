import { clearNuxtState } from '#app'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePreferences } from '~/composables/usePreferences'
import { isThemePreference, type ThemePreference } from '~/types/preferences'

// $fetch auto-import Nuxt berasal dari #build/fetch.mjs; mock modulnya
// langsung agar komposable memakai fetch tiruan.
const fetchMock = vi.hoisted(() => vi.fn())

vi.mock('#build/fetch.mjs', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>

  return { ...original, $fetch: fetchMock }
})

// colorMode dimock supaya penulisan preferensi bisa diamati; backend tetap
// satu-satunya sumber kebenaran yang diteruskan ke sini.
interface ColorModeMock {
  preference: ThemePreference
}

const colorModeMock = vi.hoisted(() => ({ api: undefined as unknown as ColorModeMock }))

mockNuxtImport('useColorMode', () => () => colorModeMock.api)

let latest: ReturnType<typeof usePreferences> | undefined

const PreferencesHarness = defineComponent({
  name: 'PreferencesHarness',
  setup() {
    latest = usePreferences()

    return latest
  },
  render: () => null
})

async function mountPreferences(): Promise<ReturnType<typeof usePreferences>> {
  await mountSuspended(PreferencesHarness, { route: false })

  return latest!
}

const STATE_KEYS = [
  'preferences-theme',
  'preferences-pending',
  'preferences-submitting',
  'preferences-error',
  'preferences-loaded',
  'preferences-inflight'
]

beforeEach(() => {
  clearNuxtState(STATE_KEYS)
  fetchMock.mockReset()
  colorModeMock.api = { preference: 'system' }
})

describe('usePreferences', () => {
  it('load() mengambil tema dari backend dan menerapkannya ke UI', async () => {
    fetchMock.mockResolvedValueOnce({ success: true, data: { theme: 'dark' } })

    const api = await mountPreferences()

    await api.load()

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/preferences',
      expect.anything()
    )
    expect(api.theme.value).toBe('dark')
    expect(api.loaded.value).toBe(true)
    expect(colorModeMock.api.preference).toBe('dark')
    expect(api.pending.value).toBe(false)

    // Pemuatan berikutnya tidak mengulang request (cache segar).
    await api.load()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('tema tidak valid dari backend jatuh ke system, bukan dipercaya', async () => {
    fetchMock.mockResolvedValueOnce({ success: true, data: { theme: 'neon' } })

    const api = await mountPreferences()

    await api.load()

    expect(api.theme.value).toBe('system')
    expect(colorModeMock.api.preference).toBe('system')
  })

  it('load() gagal menampilkan error dan memungkinkan retry', async () => {
    fetchMock
      .mockRejectedValueOnce({ statusCode: 500 })
      .mockResolvedValueOnce({ success: true, data: { theme: 'light' } })

    const api = await mountPreferences()

    await api.load()

    // Tanpa pesan readable, fallback domain dipakai.
    expect(api.error.value).toBe('Preferensi tema belum dapat dimuat.')
    expect(api.loaded.value).toBe(false)
    expect(api.theme.value).toBe('system')

    await api.load(true)

    expect(api.error.value).toBeNull()
    expect(api.theme.value).toBe('light')
  })

  it('update() menyimpan ke backend dan menerapkan nilai yang dikonfirmasi', async () => {
    // Tema awal diambil backend terlebih dahulu.
    fetchMock
      .mockResolvedValueOnce({ success: true, data: { theme: 'system' } })
      .mockResolvedValueOnce({ success: true, data: { theme: 'light' } })

    const api = await mountPreferences()
    await api.load()

    const saved = await api.update('light')

    expect(saved).toBe(true)
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/preferences',
      expect.objectContaining({ method: 'PATCH', body: { theme: 'light' } })
    )
    expect(api.theme.value).toBe('light')
    expect(colorModeMock.api.preference).toBe('light')
  })

  it('update() dengan nilai di luar enum ditolak tanpa request', async () => {
    const api = await mountPreferences()
    const saved = await api.update('sepia' as ThemePreference)

    expect(saved).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(isThemePreference('sepia')).toBe(false)
  })

  it('update() gagal mempertahankan tema lama dan menampilkan error', async () => {
    fetchMock
      .mockResolvedValueOnce({ success: true, data: { theme: 'dark' } })
      .mockRejectedValueOnce({ statusCode: 503 })

    const api = await mountPreferences()
    await api.load()

    const saved = await api.update('light')

    expect(saved).toBe(false)
    // Tanpa pesan readable, fallback domain dipakai.
    expect(api.error.value).toBe('Preferensi tema belum dapat disimpan.')
    // Tema tetap nilai backend terakhir, bukan nilai yang gagal disimpan.
    expect(api.theme.value).toBe('dark')
    expect(colorModeMock.api.preference).toBe('dark')
  })

  it('update() tidak berjalan ganda saat masih submitting', async () => {
    fetchMock.mockResolvedValueOnce({ success: true, data: { theme: 'system' } })

    let resolvePatch: ((value: unknown) => void) | undefined

    const api = await mountPreferences()
    await api.load()

    fetchMock.mockReturnValueOnce(new Promise(resolve => {
      resolvePatch = resolve
    }))

    const first = api.update('dark')
    const second = await api.update('light')

    expect(second).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(2) // load + satu patch saja

    resolvePatch?.({ success: true, data: { theme: 'dark' } })
    expect(await first).toBe(true)
  })
})
