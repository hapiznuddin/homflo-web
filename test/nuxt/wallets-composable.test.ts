import { clearNuxtState } from '#app'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WalletItem } from '~/types/wallets'
import { useWallets } from '~/composables/useWallets'

// $fetch auto-import Nuxt berasal dari #build/fetch.mjs (bukan global),
// sehingga vi.stubGlobal tidak mempan. Mock modulnya langsung; runtime
// lain di-spread agar mountSuspended tetap utuh.
const fetchMock = vi.hoisted(() => vi.fn())

vi.mock('#build/fetch.mjs', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>

  return { ...original, $fetch: fetchMock }
})

let latest: ReturnType<typeof useWallets> | undefined

const WalletsHarness = defineComponent({
  name: 'WalletsHarness',
  setup() {
    const api = useWallets()

    latest = api

    return api
  },
  render: () => null
})

async function mountWallets(): Promise<ReturnType<typeof useWallets>> {
  await mountSuspended(WalletsHarness, { route: false })

  return latest!
}

function walletItem(overrides: Partial<WalletItem> = {}): WalletItem {
  return {
    id: 'w1',
    household_id: 'h1',
    name: 'Kas Tunai',
    type: 'cash',
    opening_balance: '0.00',
    is_active: true,
    balance: '250000.00',
    created_at: '2026-10-01T00:00:00.000000Z',
    updated_at: '2026-10-01T00:00:00.000000Z',
    ...overrides
  }
}

function envelope(items: WalletItem[] = [walletItem()]): { success: boolean, data: WalletItem[] } {
  return { success: true, data: items }
}

const STATE_KEYS = ['wallets-items', 'wallets-pending', 'wallets-error', 'wallets-inflight', 'wallets-request-seq']

beforeEach(() => {
  clearNuxtState(STATE_KEYS)
  fetchMock.mockReset()
  fetchMock.mockResolvedValue(envelope())
})

describe('useWallets', () => {
  it('load() mengambil /api/wallets dan unwrap envelope array (baca saja)', async () => {
    const wallets = await mountWallets()

    await wallets.load()

    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, options] = fetchMock.mock.calls[0] as [string, { method?: string, params?: unknown }]

    expect(url).toBe('/api/wallets')
    // Tanpa method tulis dan tanpa query — pass-through read-only (§5.8).
    expect(options.method).toBeUndefined()
    expect(options.params).toBeUndefined()
    expect(wallets.items.value).toHaveLength(1)
    expect(wallets.items.value[0]?.balance).toBe('250000.00')
    expect(wallets.items.value[0]?.is_active).toBe(true)
    expect(wallets.pending.value).toBe(false)
    expect(wallets.error.value).toBeNull()
  })

  it('load() ketiga saat sudah segar disingkat; refresh() memaksa reload', async () => {
    const wallets = await mountWallets()

    await wallets.load()
    await wallets.load()

    expect(fetchMock).toHaveBeenCalledTimes(1)

    await wallets.refresh()

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('API error tercatat sebagai error tanpa fixture dan tanpa logout', async () => {
    fetchMock.mockRejectedValueOnce({ statusCode: 401, data: { message: 'Unauthenticated.' } })

    const wallets = await mountWallets()

    await wallets.load()

    expect(wallets.items.value).toEqual([])
    expect(wallets.error.value).toBe('Sesi berakhir. Silakan login kembali.')
    expect(wallets.pending.value).toBe(false)
  })

  it('permukaan API hanya read-only: items/pending/error/load/refresh', async () => {
    const wallets = await mountWallets()

    expect(Object.keys(wallets).sort()).toEqual(['error', 'items', 'load', 'pending', 'refresh'])
  })
})
