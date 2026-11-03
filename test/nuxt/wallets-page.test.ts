import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { WalletItem } from '~/types/wallets'
import { formatTransactionAmount } from '~/utils/transactions'
import WalletsPage from '~/pages/wallets/index.vue'

// Halaman Dompet (P1-6) — read-only: daftar, status aktif/nonaktif,
// saldo awal + saldo server, empty/loading/error+retry.

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

mockNuxtImport('useAuth', () => () => authMock)

const walletsMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useWallets', () => () => walletsMock.api)

function walletItem(overrides: Partial<WalletItem> = {}): WalletItem {
  return {
    id: 'w1',
    household_id: 'h1',
    name: 'Cash',
    type: 'cash',
    opening_balance: '0.00',
    is_active: true,
    balance: '250000.00',
    created_at: '2026-10-01T00:00:00.000000Z',
    updated_at: '2026-10-01T00:00:00.000000Z',
    ...overrides
  }
}

function setupWallets(
  overrides: { items?: WalletItem[], pending?: boolean, error?: string | null } = {}
): { load: ReturnType<typeof vi.fn>, refresh: ReturnType<typeof vi.fn> } {
  const api = {
    items: ref(overrides.items ?? [walletItem()]),
    pending: ref(overrides.pending ?? false),
    error: ref(overrides.error ?? null),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {})
  }

  walletsMock.api = api

  return api
}

async function mountPage() {
  return mountSuspended(WalletsPage, { route: '/wallets' })
}

beforeEach(() => {
  authMock.bootstrap.mockClear()
  authMock.logout.mockClear()
  setupWallets()
})

describe('wallets page', () => {
  it('memuat daftar dompet saat halaman dibuka', async () => {
    const wallets = setupWallets()

    await mountPage()

    expect(wallets.load).toHaveBeenCalledTimes(1)
  })

  it('menampilkan nama, tipe, saldo awal, saldo server, dan status', async () => {
    setupWallets({
      items: [
        walletItem({ id: 'w1', name: 'Cash', type: 'cash', opening_balance: '0.00', balance: '250000.00' }),
        walletItem({
          id: 'w2',
          name: 'Rekening BCA',
          type: 'bank',
          opening_balance: '1000000.00',
          balance: '1500000.00',
          is_active: false
        })
      ]
    })

    const wrapper = await mountPage()
    const text = wrapper.text()

    expect(text).toContain('Cash')
    expect(text).toContain('Tunai')
    expect(text).toContain('Rekening BCA')
    expect(text).toContain('Bank')
    expect(text).toContain('Aktif')
    expect(text).toContain('Nonaktif')
    expect(text).toContain(formatTransactionAmount('250000.00'))
    expect(text).toContain(formatTransactionAmount('1000000.00'))
    expect(text).toContain(formatTransactionAmount('1500000.00'))
  })

  it('empty state menjelaskan dompet default Cash tanpa membuat data palsu', async () => {
    setupWallets({ items: [] })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Belum ada dompet.')
    expect(wrapper.text()).toContain('dompet default')
    expect(wrapper.text()).toContain('Cash')
  })

  it('menampilkan skeleton saat pemuatan pertama', async () => {
    setupWallets({ items: [], pending: true })

    const wrapper = await mountPage()

    expect(wrapper.find('[aria-label="Memuat dompet"]').exists()).toBe(true)
  })

  it('error tanpa data menampilkan pesan dan Coba lagi memanggil refresh', async () => {
    const wallets = setupWallets({ items: [], error: 'Koneksi terputus' })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Data dompet belum dapat dimuat.')
    expect(wrapper.text()).toContain('Koneksi terputus')

    const retry = wrapper.findAll('button').find(button => button.text().includes('Coba lagi'))

    await retry!.trigger('click')

    expect(wallets.refresh).toHaveBeenCalledTimes(1)
  })
})
