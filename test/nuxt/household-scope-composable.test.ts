import { clearNuxtState } from '#app'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, ref, type Ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useHouseholdScope } from '~/composables/useHouseholdScope'

// useAuth tiruan: ref household harus reaktif agar watch scope bekerja.
interface AuthApiMock {
  household: Ref<{ id: string, name: string, role: string } | null>
}

const authMock = vi.hoisted(() => ({ api: undefined as unknown as AuthApiMock }))

// Alias pendek untuk dibaca di dalam test.
const auth = authMock
mockNuxtImport('useAuth', () => () => authMock.api)

let latest: ReturnType<typeof useHouseholdScope> | undefined
const ScopeHarness = defineComponent({
  name: 'ScopeHarness',
  setup() {
    latest = useHouseholdScope()

    return latest
  },
  render: () => null
})

async function mountScope(): Promise<ReturnType<typeof useHouseholdScope>> {
  await mountSuspended(ScopeHarness, { route: false })

  return latest!
}

// Contoh state domain yang tergantung household; invalidate() wajib
// membuangnya supaya data rumah tangga lama tidak ikut pindah sesi.
const DOMAIN_KEYS = [
  'household-members-items',
  'wallets-items',
  'household-members-inflight',
  'wallets-pending'
]

beforeEach(() => {
  clearNuxtState([...DOMAIN_KEYS, 'household-scope-id', 'household-scope-epoch'])

  authMock.api = {
    household: ref<{ id: string, name: string, role: string } | null>({ id: 'h1', name: 'Rumah Budi', role: 'owner' })
  }
})

describe('useHouseholdScope', () => {
  it('mengikat scope ke household aktif dan menyediakan token epoch', async () => {
    const scope = await mountScope()

    expect(scope.scope.value).toBe('h1')
    expect(scope.token()).toBe(0)
    expect(scope.isCurrent(0)).toBe(true)
    expect(scope.isCurrent(1)).toBe(false)
  })

  it('perubahan household aktif membuang cache domain dan menaikkan epoch', async () => {
    const { useState } = await import('#app')

    const scope = await mountScope()
    const memberItems = useState<string[]>('household-members-items', () => ['lama'])
    const walletsItems = useState<string[]>('wallets-items', () => ['lama'])
    const token = scope.token()

    auth.api.household.value = { id: 'h2', name: 'Rumah Siti', role: 'member' }

    expect(scope.scope.value).toBe('h2')
    expect(scope.token()).toBe(1)
    expect(scope.isCurrent(token)).toBe(false)
    // clearNuxtState membuang isi ref lama: nilai lama tidak lagi tersedia.
    expect(memberItems.value?.length ?? 0).toBe(0)
    expect(walletsItems.value?.length ?? 0).toBe(0)

    // State baru di setelah invalidate() tetap bisa diisi komposable aktif.
    const fresh = useState<string[]>('household-members-items', () => [])

    fresh.value = ['baru']
    expect(fresh.value).toEqual(['baru'])
  })

  it('invalidasi manual menaikkan epoch tanpa menunggu watcher', async () => {
    const scope = await mountScope()
    const before = scope.token()

    scope.invalidate()

    expect(scope.token()).toBe(before + 1)
    // Scope tetap pada household yang sama.
    expect(scope.scope.value).toBe('h1')
  })

  it('household tanpa perubahan id tidak memicu invalidasi', async () => {
    const scope = await mountScope()

    auth.api.household.value = { id: 'h1', name: 'Rumah Budi (tetap)', role: 'owner' }

    expect(scope.token()).toBe(0)
  })

  // Regresi: scope menunggu null juga (sesi belum/berhenti punya
  // household) tanpa merusak epoch.
  it('household null menetapkan scope null tanpa mengubah epoch lebih', async () => {
    const scope = await mountScope()
    const before = scope.token()

    auth.api.household.value = null

    expect(scope.scope.value).toBeNull()
    expect(scope.token()).toBe(before + 1)
    expect(scope.isCurrent(before)).toBe(false)
  })

  // Regresi: setelah invalidasi, token baru tetap berlaku.
  it('token yang diambil setelah invalidasi dianggap mutakhir', async () => {
    const scope = await mountScope()

    scope.invalidate()

    const token = scope.token()

    expect(scope.isCurrent(token)).toBe(true)
  })
})
