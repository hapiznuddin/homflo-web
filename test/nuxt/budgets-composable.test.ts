import { clearNuxtState } from '#app'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BudgetItem } from '~/types/budgets'
import { useBudgets } from '~/composables/useBudgets'

// $fetch auto-import Nuxt berasal dari #build/fetch.mjs (bukan global),
// sehingga vi.stubGlobal tidak mempan. Mock modulnya langsung; runtime
// lain di-spread agar mountSuspended tetap utuh.
const fetchMock = vi.hoisted(() => vi.fn())

vi.mock('#build/fetch.mjs', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>

  return { ...original, $fetch: fetchMock }
})

// useState hanya valid di dalam konteks app Nuxt, jadi komposable dijalankan
// lewat harness yang di-mount suspended.
let latest: ReturnType<typeof useBudgets> | undefined

const BudgetsHarness = defineComponent({
  name: 'BudgetsHarness',
  setup() {
    const api = useBudgets()

    latest = api

    return api
  },
  render: () => null
})

async function mountBudgets(): Promise<ReturnType<typeof useBudgets>> {
  await mountSuspended(BudgetsHarness, { route: false })

  return latest!
}

function bgItem(overrides: Partial<BudgetItem> = {}): BudgetItem {
  return {
    id: '01J0000000000000000000001',
    household_id: 'h1',
    category: { id: 'c1', name: 'Dapur', icon: 'i-lucide-cooking-pot' },
    year: 2026,
    month: 10,
    amount: '500000.00',
    // Kontrak riil Phase 12: field usage ikut dalam payload dan diteruskan
    // utuh tanpa transformasi oleh composable.
    actual_spending: '250000.00',
    remaining: '250000.00',
    usage_percentage: 50,
    usage_status: 'normal',
    created_at: '2026-10-01T00:00:00.000000Z',
    updated_at: '2026-10-01T00:00:00.000000Z',
    ...overrides
  }
}

const STATE_KEYS = [
  'budgets-items',
  'budgets-period',
  'budgets-pending',
  'budgets-submitting',
  'budgets-error',
  'budgets-field-errors',
  'budgets-inflight',
  'budgets-request-seq'
]

beforeEach(() => {
  clearNuxtState(STATE_KEYS)
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({ success: true, data: [bgItem()] })
})

describe('useBudgets', () => {
  it('load() mengambil /api/budgets dengan periode berjalan dan unwrap envelope', async () => {
    const bg = await mountBudgets()

    await bg.load()

    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, options] = fetchMock.mock.calls[0] as [string, { params: Record<string, number> }]

    expect(url).toBe('/api/budgets')

    const now = new Date()

    expect(options.params).toEqual({ year: now.getFullYear(), month: now.getMonth() + 1 })
    expect(bg.items.value).toEqual([bgItem()])
    expect(bg.pending.value).toBe(false)
    expect(bg.error.value).toBeNull()
  })

  it('load() ulang tanpa force memakai data segar (dedup)', async () => {
    const bg = await mountBudgets()

    await bg.load()
    await bg.load()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('setPeriod memuat periode baru; request lama tidak menimpa', async () => {
    const bg = await mountBudgets()

    await bg.load()

    fetchMock.mockReset()

    let releaseFirst!: (value: unknown) => void

    const firstGate = new Promise((resolve) => {
      releaseFirst = resolve as (value: unknown) => void
    })

    fetchMock.mockReturnValueOnce(firstGate)
    fetchMock.mockResolvedValue({ success: true, data: [bgItem({ id: 'baru' })] })

    const target = { year: 2026, month: 9, label: 'September 2026' }

    bg.setPeriod(target)
    bg.setPeriod({ year: 2026, month: 8, label: 'Agustus 2026' })

    releaseFirst({ success: true, data: [bgItem({ id: 'basi' })] })

    await vi.waitFor(() => {
      expect(bg.items.value).toEqual([bgItem({ id: 'baru' })])
    })

    expect(bg.period.value).toEqual({ year: 2026, month: 8, label: 'Agustus 2026' })
  })

  it('API 401 tercatat sebagai error tanpa data dan tanpa logout', async () => {
    fetchMock.mockRejectedValueOnce({ statusCode: 401, data: { message: 'Unauthenticated.' } })

    const bg = await mountBudgets()

    await bg.load()

    expect(bg.items.value).toEqual([])
    expect(bg.error.value).toBe('Sesi berakhir. Silakan login kembali.')
    expect(bg.pending.value).toBe(false)
  })

  it('create() POST target lalu refresh daftar periode', async () => {
    const bg = await mountBudgets()

    await bg.load()

    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce({ success: true, data: bgItem({ id: '01J0000000000000000000002' }) })
    fetchMock.mockResolvedValue({ success: true, data: [bgItem(), bgItem({ id: '01J0000000000000000000002' })] })

    const saved = await bg.create({ category_id: 'c1', year: '2026', month: '10', amount: '750000,50' })

    expect(saved?.id).toBe('01J0000000000000000000002')

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body: Record<string, unknown> }]

    expect(url).toBe('/api/budgets')
    expect(options.method).toBe('POST')
    expect(options.body).toEqual({ category_id: 'c1', year: 2026, month: 10, amount: '750000.50' })
    // POST + refresh GET.
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(bg.items.value).toHaveLength(2)
  })

  it('create() duplikat memetakan error tanpa menambah item', async () => {
    const bg = await mountBudgets()

    fetchMock.mockRejectedValueOnce({
      statusCode: 422,
      data: {
        data: {
          success: false,
          error: { code: 'BUDGET_ALREADY_EXISTS', message: 'Budget already exists for this category and period.' }
        }
      }
    })

    const saved = await bg.create({ category_id: 'c1', year: '2026', month: '10', amount: '100' })

    expect(saved).toBeNull()
    expect(bg.error.value).toContain('sudah ada')
    expect(bg.items.value).toEqual([])
  })

  it('create() tanpa kategori menolak lokal tanpa menyentuh network', async () => {
    const bg = await mountBudgets()

    const saved = await bg.create({ category_id: '', year: '2026', month: '10', amount: '100' })

    expect(saved).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(bg.fieldErrors.value.category_id).toContain('kategori')
  })

  it('update() PATCH ke item dan refresh', async () => {
    const bg = await mountBudgets()

    fetchMock.mockResolvedValueOnce({ success: true, data: bgItem({ amount: '600000.00' }) })
    fetchMock.mockResolvedValue({ success: true, data: [bgItem({ amount: '600000.00' })] })

    const saved = await bg.update('01J0000000000000000000001', {
      category_id: 'c1',
      year: '2026',
      month: '10',
      amount: '600000'
    })

    expect(saved?.amount).toBe('600000.00')

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body: Record<string, unknown> }]

    expect(url).toBe('/api/budgets/01J0000000000000000000001')
    expect(options.method).toBe('PATCH')
    expect(options.body).toEqual({ category_id: 'c1', year: 2026, month: 10, amount: '600000' })
  })

  it('remove() DELETE lalu refresh; gagal tidak menghilangkan item', async () => {
    const bg = await mountBudgets()

    await bg.load()
    expect(bg.items.value).toHaveLength(1)

    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce({ success: true, data: { id: '01J0000000000000000000001' } })
    fetchMock.mockResolvedValue({ success: true, data: [] })

    const ok = await bg.remove('01J0000000000000000000001')

    expect(ok).toBe(true)

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string }]

    expect(url).toBe('/api/budgets/01J0000000000000000000001')
    expect(options.method).toBe('DELETE')
    expect(bg.items.value).toEqual([])

    fetchMock.mockReset()
    fetchMock.mockRejectedValueOnce({ statusCode: 500, data: { message: 'Server error.' } })

    const failed = await bg.remove('01J0000000000000000000001')

    expect(failed).toBe(false)
    expect(bg.items.value).toEqual([])
    expect(typeof bg.error.value).toBe('string')
  })

  it('double submit dicegah saat request berjalan', async () => {
    const bg = await mountBudgets()

    let release!: (value: unknown) => void

    const gate = new Promise((resolve) => {
      release = resolve as (value: unknown) => void
    })

    fetchMock.mockReturnValueOnce(gate)

    const first = bg.create({ category_id: 'c1', year: '2026', month: '10', amount: '100' })
    const second = await bg.create({ category_id: 'c1', year: '2026', month: '10', amount: '100' })

    expect(second).toBeNull()

    release({ success: true, data: bgItem() })
    await first

    // Satu POST + satu refresh; submit kedua tertolak saat submitting.
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  // Phase 15.3.1: kontrak riil Phase 12 — field usage server diteruskan
  // APA ADANYA (bukan diblok); nama field lama Phase 8 tetap tidak pernah ada.
  it('respons memuat field usage Phase 12 apa adanya tanpa transformasi', async () => {
    const bg = await mountBudgets()

    await bg.load()

    expect(bg.items.value).toHaveLength(1)

    const item = bg.items.value[0]!

    expect(item).toEqual(expect.objectContaining({
      amount: '500000.00',
      actual_spending: '250000.00',
      remaining: '250000.00',
      usage_percentage: 50,
      usage_status: 'normal'
    }))

    // Nama field lama (spent/percent) tidak pernah dipakai.
    expect(item).not.toHaveProperty('spent')
    expect(item).not.toHaveProperty('percent')
  })

  it('usage_percentage null (budget nol / no_budget) diteruskan apa adanya', async () => {
    fetchMock.mockResolvedValue({
      success: true,
      data: [bgItem({
        amount: '0.00',
        actual_spending: '0.00',
        remaining: '0.00',
        usage_percentage: null,
        usage_status: 'no_budget'
      })]
    })

    const bg = await mountBudgets()

    await bg.load()

    expect(bg.items.value).toHaveLength(1)
    expect(bg.items.value[0]!.usage_percentage).toBeNull()
    expect(bg.items.value[0]!.usage_status).toBe('no_budget')
  })
})
