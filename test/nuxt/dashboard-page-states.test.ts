import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import type { DashboardPeriod, DashboardResponse } from '~/types/dashboard'
import DashboardGreeting from '~/components/dashboard/DashboardGreeting.vue'
import DashboardPage from '~/pages/dashboard.vue'

const dashMock = vi.hoisted(() => ({ api: undefined as unknown }))
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
  onboarding: { value: { required: false } },
  bootstrap: vi.fn(async () => 'authenticated'),
  logout: vi.fn()
}))

mockNuxtImport('useAuth', () => () => authMock)
mockNuxtImport('useDashboard', () => () => dashMock.api)

interface MockDashboardState {
  period: Ref<DashboardPeriod>
  data: Ref<DashboardResponse | null>
  pending: Ref<boolean>
  error: Ref<string | null>
  load: ReturnType<typeof vi.fn>
  setPeriod: ReturnType<typeof vi.fn>
}

const currentPeriod: DashboardPeriod = { key: '2026-10', label: 'Oktober 2026' }

const sampleData: DashboardResponse = {
  period: currentPeriod,
  financial: {
    income: 15000000,
    expense: 7000000,
    netCashFlow: 8000000,
    incomeChangePercent: 8,
    budgetUsagePercent: 56,
    cashFlowStatus: 'surplus'
  },
  budget: [
    {
      id: 'kebutuhan',
      name: 'Kebutuhan Rumah',
      icon: 'i-lucide-shopping-basket',
      spent: 1000000,
      budget: 2000000,
      percent: 50,
      status: 'normal'
    }
  ],
  upcomingBills: [
    {
      id: 'bill-1',
      title: 'Internet',
      icon: 'i-lucide-wifi',
      dueLabel: 'Jatuh tempo 5 Okt',
      amount: 416250,
      urgent: true
    }
  ],
  recentTransactions: [
    {
      id: 'tx-1',
      title: 'Belanja Supermarket',
      icon: 'i-lucide-shopping-cart',
      dateLabel: '2 Okt 2026',
      wallet: 'Rekening BCA Utama',
      amount: 685000,
      direction: 'out'
    }
  ],
  maintenance: [
    {
      id: 'mnt-1',
      title: 'Cuci & Service AC Master',
      priority: 'rutin',
      dateLabel: '3 Okt',
      location: 'Kamar Utama'
    }
  ]
}

function setupDashboardState(
  overrides: { pending?: boolean; data?: DashboardResponse | null; error?: string | null } = {}
): MockDashboardState {
  const state: MockDashboardState = {
    period: ref(currentPeriod),
    data: ref(overrides.data ?? null),
    pending: ref(overrides.pending ?? false),
    error: ref(overrides.error ?? null),
    load: vi.fn(async () => {}),
    setPeriod: vi.fn()
  }

  dashMock.api = {
    ...state,
    periodOptions: () => [currentPeriod]
  }

  return state
}

async function mountPage() {
  return mountSuspended(DashboardPage, { route: '/dashboard' })
}

describe('dashboard page states (loading / error / retry)', () => {
  beforeEach(() => {
    authMock.logout.mockClear()
    authMock.bootstrap.mockClear()
  })

  it('state loading menampilkan skeleton "Memuat dashboard" tanpa konten privat', async () => {
    setupDashboardState({ pending: true, data: null })

    const wrapper = await mountPage()

    expect(wrapper.find('[aria-label="Memuat dashboard"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Aksi Cepat')
    expect(wrapper.text()).not.toContain('Data dashboard belum dapat dimuat.')
  })

  it('state error menampilkan alert yang jujur + tombol coba lagi', async () => {
    setupDashboardState({ error: 'Koneksi terputus' })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Data dashboard belum dapat dimuat.')
    expect(wrapper.text()).toContain('Koneksi terputus')
    expect(wrapper.text()).toContain('Coba lagi')
    expect(wrapper.text()).not.toContain('Aksi Cepat')
  })

  it('error dashboard TIDAK logout user (auth lock)', async () => {
    setupDashboardState({ error: 'Server sedang bermasalah' })

    await mountPage()

    expect(authMock.logout).not.toHaveBeenCalled()
    expect(authMock.user.value?.name).toBe('Budi Santoso')
  })

  it('tombol "Coba lagi" memanggil load() ulangan', async () => {
    const state = setupDashboardState({ error: 'Koneksi terputus' })

    const wrapper = await mountPage()
    const callsAfterMount = state.load.mock.calls.length

    const retryButton = wrapper.findAll('button').find(button => button.text().includes('Coba lagi'))

    expect(retryButton).toBeDefined()

    await retryButton!.trigger('click')

    expect(state.load.mock.calls.length).toBe(callsAfterMount + 1)
  })

  it('memilih periode dari greeting memanggil setPeriod di read-model', async () => {
    const state = setupDashboardState({ data: sampleData })

    const wrapper = await mountPage()
    const nextPeriod: DashboardPeriod = { key: '2026-09', label: 'September 2026' }

    wrapper.findComponent(DashboardGreeting).vm.$emit('select', nextPeriod)

    expect(state.setPeriod).toHaveBeenCalledTimes(1)
    expect(state.setPeriod).toHaveBeenCalledWith(nextPeriod)
  })
})
