import { clearNuxtState } from '#app'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TransactionItem, TransactionListData } from '~/types/transactions'
import { useTransactions } from '~/composables/useTransactions'

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
let latest: ReturnType<typeof useTransactions> | undefined

const TransactionsHarness = defineComponent({
  name: 'TransactionsHarness',
  setup() {
    const api = useTransactions()

    latest = api

    return api
  },
  render: () => null
})

async function mountTransactions(): Promise<ReturnType<typeof useTransactions>> {
  await mountSuspended(TransactionsHarness, { route: false })

  return latest!
}

function txItem(overrides: Partial<TransactionItem> = {}): TransactionItem {
  return {
    id: '01J0000000000000000000001',
    household_id: 'h1',
    type: 'expense',
    amount: '150000.00',
    occurred_on: '2026-10-05',
    description: 'Belanja dapur',
    wallet: 'Kas Tunai',
    category: null,
    created_at: '2026-10-05T00:00:00.000000Z',
    updated_at: '2026-10-05T00:00:00.000000Z',
    ...overrides
  }
}

function listEnvelope(items: TransactionItem[] = [txItem()], total = 1): { success: boolean, data: TransactionListData } {
  return {
    success: true,
    data: {
      data: items,
      meta: { current_page: 1, per_page: 15, total, last_page: 1 }
    }
  }
}

const STATE_KEYS = [
  'transactions-items',
  'transactions-meta',
  'transactions-filters',
  'transactions-pending',
  'transactions-submitting',
  'transactions-error',
  'transactions-field-errors',
  'transactions-inflight',
  'transactions-request-seq'
]

beforeEach(() => {
  clearNuxtState(STATE_KEYS)
  fetchMock.mockReset()
  fetchMock.mockResolvedValue(listEnvelope())
})

describe('useTransactions', () => {
  it('load() mengambil /api/transactions dan unwrap envelope', async () => {
    const tx = await mountTransactions()

    await tx.load()

    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, options] = fetchMock.mock.calls[0] as [string, { params: Record<string, unknown> }]

    expect(url).toBe('/api/transactions')
    expect(options.params).toEqual({})
    expect(tx.items.value).toHaveLength(1)
    expect(tx.items.value[0]?.id).toBe('01J0000000000000000000001')
    expect(tx.meta.value.total).toBe(1)
    expect(tx.pending.value).toBe(false)
    expect(tx.error.value).toBeNull()
  })

  it('load() meneruskan filter sebagai query params', async () => {
    const tx = await mountTransactions()

    await tx.load({ type: 'income', date_from: '2026-10-01', date_to: '2026-10-31', page: 2 })

    const [, options] = fetchMock.mock.calls[0] as [string, { params: Record<string, unknown> }]

    expect(options.params).toEqual({
      type: 'income',
      date_from: '2026-10-01',
      date_to: '2026-10-31',
      page: 2
    })
  })

  it('API 401 tercatat sebagai error tanpa data dan tanpa logout', async () => {
    fetchMock.mockRejectedValueOnce({ statusCode: 401, data: { message: 'Unauthenticated.' } })

    const tx = await mountTransactions()

    await tx.load()

    expect(tx.items.value).toEqual([])
    expect(tx.error.value).toBe('Sesi berakhir. Silakan login kembali.')
    expect(tx.pending.value).toBe(false)
  })

  it('network failure tidak mengisi fixture', async () => {
    fetchMock.mockRejectedValueOnce(new Error('fetch failed'))

    const tx = await mountTransactions()

    await tx.load()

    expect(tx.items.value).toEqual([])
    expect(typeof tx.error.value).toBe('string')
  })

  it('create() POST body ternormalisasi lalu refresh daftar', async () => {
    const tx = await mountTransactions()

    await tx.load()

    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce({ success: true, data: txItem({ id: '01J0000000000000000000002' }) })
    fetchMock.mockResolvedValue(listEnvelope([txItem(), txItem({ id: '01J0000000000000000000002' })], 2))

    const saved = await tx.create({
      type: 'expense',
      amount: '150000,50',
      occurred_on: '2026-10-06',
      description: 'Belanja',
      wallet: '',
      category_id: ''
    })

    expect(saved?.id).toBe('01J0000000000000000000002')

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body: Record<string, unknown> }]

    expect(url).toBe('/api/transactions')
    expect(options.method).toBe('POST')
    expect(options.body).toEqual({
      type: 'expense',
      amount: '150000.50',
      occurred_on: '2026-10-06',
      description: 'Belanja',
      wallet: null,
      category_id: null
    })
    // POST + refresh GET.
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(tx.items.value).toHaveLength(2)
  })

  it('create() meneruskan ID kategori apa adanya tanpa dihitung ulang', async () => {
    const tx = await mountTransactions()

    fetchMock.mockResolvedValueOnce({ success: true, data: txItem({ id: '01J0000000000000000000002' }) })
    fetchMock.mockResolvedValue(listEnvelope())

    await tx.create({
      type: 'income',
      amount: '25000',
      occurred_on: '2026-10-06',
      description: '',
      wallet: '',
      category_id: 'c9'
    })

    const [, options] = fetchMock.mock.calls[0] as [string, { method: string, body: Record<string, unknown> }]

    expect(options.method).toBe('POST')
    expect(options.body).toMatchObject({ category_id: 'c9', amount: '25000' })
  })

  it('create() dengan nominal invalid tidak menyentuh network', async () => {
    const tx = await mountTransactions()

    const saved = await tx.create({
      type: 'expense',
      amount: '150.000',
      occurred_on: '2026-10-06',
      description: '',
      wallet: '',
      category_id: ''
    })

    expect(saved).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(tx.fieldErrors.value.amount).toContain('Nominal')
  })

  it('create() 422 memetakan field errors per input', async () => {
    const tx = await mountTransactions()

    fetchMock.mockRejectedValueOnce({
      statusCode: 422,
      data: {
        data: {
          message: 'The given data was invalid.',
          errors: { amount: ['The amount must be a number.'] }
        }
      }
    })

    const saved = await tx.create({
      type: 'expense',
      amount: '12',
      occurred_on: '2026-10-06',
      description: '',
      wallet: '',
      category_id: ''
    })

    expect(saved).toBeNull()
    expect(tx.fieldErrors.value).toEqual({ amount: 'Kolom nominal harus berupa angka.' })
    expect(tx.error.value).toBe('Kolom nominal harus berupa angka.')
  })

  it('double submit dicegah saat request berjalan', async () => {
    const tx = await mountTransactions()

    let release!: (value: unknown) => void

    const gate = new Promise((resolve) => {
      release = resolve as (value: unknown) => void
    })

    fetchMock.mockReturnValueOnce(gate)

    const first = tx.create({
      type: 'expense',
      amount: '100',
      occurred_on: '2026-10-06',
      description: '',
      wallet: '',
      category_id: ''
    })
    const second = await tx.create({
      type: 'expense',
      amount: '100',
      occurred_on: '2026-10-06',
      description: '',
      wallet: '',
      category_id: ''
    })

    expect(second).toBeNull()

    release({ success: true, data: txItem() })
    await first

    // Satu POST + satu refresh; submit kedua tertolak saat submitting.
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('update() PATCH ke item dan refresh', async () => {
    const tx = await mountTransactions()

    fetchMock.mockResolvedValueOnce({ success: true, data: txItem({ description: 'revisi' }) })
    fetchMock.mockResolvedValue(listEnvelope([txItem({ description: 'revisi' })]))

    const saved = await tx.update('01J0000000000000000000001', {
      type: 'expense',
      amount: '200000',
      occurred_on: '2026-10-05',
      description: 'revisi',
      wallet: 'Kas Tunai',
      category_id: ''
    })

    expect(saved?.description).toBe('revisi')

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string }]

    expect(url).toBe('/api/transactions/01J0000000000000000000001')
    expect(options.method).toBe('PATCH')
  })

  it('remove() DELETE lalu refresh; gagal tidak menghilangkan data', async () => {
    const tx = await mountTransactions()

    await tx.load()
    expect(tx.items.value).toHaveLength(1)

    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce({ success: true, data: { id: '01J0000000000000000000001' } })
    fetchMock.mockResolvedValue(listEnvelope([], 0))

    const ok = await tx.remove('01J0000000000000000000001')

    expect(ok).toBe(true)

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string }]

    expect(url).toBe('/api/transactions/01J0000000000000000000001')
    expect(options.method).toBe('DELETE')
    expect(tx.items.value).toEqual([])

    fetchMock.mockReset()
    fetchMock.mockRejectedValueOnce({ statusCode: 500, data: { message: 'Server error.' } })

    const failed = await tx.remove('01J0000000000000000000001')

    expect(failed).toBe(false)
    expect(tx.items.value).toEqual([])
    expect(typeof tx.error.value).toBe('string')
  })

  it('fetchOne() mengambil detail satu item', async () => {
    const tx = await mountTransactions()

    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce({ success: true, data: txItem() })

    const item = await tx.fetchOne('01J0000000000000000000001')

    expect(item.id).toBe('01J0000000000000000000001')
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/transactions/01J0000000000000000000001')
  })
})
