import { clearNuxtState } from '#app'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, ref, type Ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useHouseholdSettings } from '~/composables/useHouseholdSettings'

// $fetch auto-import Nuxt berasal dari #build/fetch.mjs; mock modulnya
// langsung agar komposable memakai fetch tiruan.
const fetchMock = vi.hoisted(() => vi.fn())

vi.mock('#build/fetch.mjs', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>

  return { ...original, $fetch: fetchMock }
})

// useAuth tiruan: ref household harus reaktif agar watch scope bekerja.
interface AuthApiMock {
  household: Ref<{ id: string, name: string, role: string } | null>
  households: Ref<Array<{ id: string, name: string, role: string }>>
  applyHouseholdContext: (data: { household: { id: string, name: string, role: string } }) => void
}

const authMock = vi.hoisted(() => ({ api: undefined as unknown as AuthApiMock }))

// Alias pendek untuk dibaca di dalam test.
const auth = authMock

mockNuxtImport('useAuth', () => () => authMock.api)

let latest: ReturnType<typeof useHouseholdSettings> | undefined

const SettingsHarness = defineComponent({
  name: 'SettingsHarness',
  setup() {
    latest = useHouseholdSettings()

    return latest
  },
  render: () => null
})

async function mountSettings(): Promise<ReturnType<typeof useHouseholdSettings>> {
  await mountSuspended(SettingsHarness, { route: false })

  return latest!
}

const STATE_KEYS = [
  'household-scope-id',
  'household-scope-epoch',
  'household-settings-renaming',
  'household-settings-rename-error',
  'household-settings-rename-field-errors',
  'household-settings-switching-id',
  'household-settings-switch-error'
]

function contextResponse(household = { id: 'h2', name: 'Rumah Siti', role: 'member' }) {
  return {
    success: true,
    data: { household, households: [household], onboarding: { required: false } }
  }
}

beforeEach(() => {
  clearNuxtState(STATE_KEYS)
  fetchMock.mockReset()

  // Objek auth tiruan dibangun di sini (bukan di vi.hoisted) karena butuh
  // `ref` dari vue yang belum tersedia saat hoisting.
  authMock.api = {
    household: ref<{ id: string, name: string, role: string } | null>({ id: 'h1', name: 'Rumah Budi', role: 'owner' }),
    households: ref<Array<{ id: string, name: string, role: string }>>([]),
    applyHouseholdContext: (data: { household: { id: string, name: string, role: string } }) => {
      ;(authMock.api.household as { value: unknown }).value = data.household
    }
  }
})

describe('useHouseholdSettings', () => {
  it('rename() memangkas spasi dan PATCH ke boundary Nuxt, bukan langsung ke Laravel', async () => {
    fetchMock.mockResolvedValueOnce(contextResponse({ id: 'h1', name: 'Rumah Baru', role: 'owner' }))

    const settings = await mountSettings()
    const changed = await settings.rename('  Rumah Baru  ')

    expect(changed).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/households/h1',
      expect.objectContaining({ method: 'PATCH', body: { name: 'Rumah Baru' } })
    )
    // applyHouseholdContext dipanggil dengan konteks lengkap dari backend.
    expect(auth.api.household.value).toEqual({ id: 'h1', name: 'Rumah Baru', role: 'owner' })
    expect(settings.renaming.value).toBe(false)
  })

  it('rename() nama kosong ditolak lokal tanpa request', async () => {
    const settings = await mountSettings()
    const changed = await settings.rename('   ')

    expect(changed).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(settings.renameFieldErrors.value).toEqual({ name: 'Nama rumah tangga wajib diisi.' })
  })

  it('rename() gagal validasi backend tampil sebagai field error', async () => {
    fetchMock.mockRejectedValueOnce({
      statusCode: 422,
      data: { message: 'The name field is required.', errors: { name: ['The name field is required.'] } }
    })

    const settings = await mountSettings()
    const changed = await settings.rename('Nama Baru')

    expect(changed).toBe(false)
    // Pesan Larson diterjemahkan ke bahasa Indonesia oleh boundary Nuxt.
    expect(settings.renameFieldErrors.value).toEqual({ name: 'Kolom nama wajib diisi.' })
    expect(settings.renameError.value).toBe('Kolom nama wajib diisi.')

    settings.clearRenameErrors()
    expect(settings.renameError.value).toBeNull()
    expect(settings.renameFieldErrors.value).toEqual({})
  })

  it('activate() memanggil endpoint aktivasi dan memicu invalidasi scope', async () => {
    const tokenRequests: string[] = []
    fetchMock.mockImplementation(async (url: string) => {
      tokenRequests.push(url)

      return contextResponse()
    })

    const { useState } = await import('#app')

    const settings = await mountSettings()
    const scope = useState<number>('household-scope-epoch', () => 0)
    const before = scope.value
    const changed = await settings.activate('h2')

    expect(changed).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/households/h2/activate',
      expect.objectContaining({ method: 'POST' })
    )
    expect(auth.api.household.value).toEqual({ id: 'h2', name: 'Rumah Siti', role: 'member' })
    // Epoch scope naik: respons daftar lama tidak boleh masuk sesi baru.
    expect(scope.value).toBeGreaterThan(before)
  })

  it('activate() ke household aktif adalah no-op tanpa request', async () => {
    const settings = await mountSettings()
    const changed = await settings.activate('h1')

    expect(changed).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('activate() gagal mempertahankan household lama dan menampilkan error', async () => {
    fetchMock.mockRejectedValueOnce({
      statusCode: 403,
      data: { error: { code: 'FORBIDDEN', message: 'Forbidden.' } }
    })

    const settings = await mountSettings()
    const changed = await settings.activate('h2')

    expect(changed).toBe(false)
    expect(auth.api.household.value).toEqual({ id: 'h1', name: 'Rumah Budi', role: 'owner' })
    // Kode FORBIDDEN dipetakan ke pesan domain oleh useApiError.
    expect(settings.switchError.value).toBe('Anda tidak memiliki akses untuk tindakan ini.')
    expect(settings.switchingId.value).toBeNull()
  })

  it('kegagalan rename tanpa detail server memakai fallback pesan domain', async () => {
    fetchMock.mockRejectedValueOnce({ statusCode: 500 })

    const settings = await mountSettings()
    const changed = await settings.rename('Nama Baru')

    expect(changed).toBe(false)
    expect(settings.renameError.value).toBe('Nama rumah tangga belum dapat disimpan.')
  })

  it('rename() tidak berjalan saat masih ada request yang berjalan', async () => {
    let resolveRename: ((value: unknown) => void) | undefined

    fetchMock.mockReturnValueOnce(new Promise(resolve => {
      resolveRename = resolve
    }))

    const settings = await mountSettings()
    const first = settings.rename('Rumah A')

    expect(settings.renaming.value).toBe(true)

    const second = await settings.rename('Rumah B')

    expect(second).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    resolveRename?.(contextResponse({ id: 'h1', name: 'Rumah A', role: 'owner' }))
    expect(await first).toBe(true)
    expect(settings.renaming.value).toBe(false)
  })
})
