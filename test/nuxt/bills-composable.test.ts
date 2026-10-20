import { clearNuxtState } from '#app'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BillDetail, BillItem } from '~/types/bills'
import { useBills } from '~/composables/useBills'

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
let latest: ReturnType<typeof useBills> | undefined

const BillsHarness = defineComponent({
  name: 'BillsHarness',
  setup() {
    const api = useBills()

    latest = api

    return api
  },
  render: () => null
})

async function mountBills(): Promise<ReturnType<typeof useBills>> {
  await mountSuspended(BillsHarness, { route: false })

  return latest!
}

function billItem(overrides: Partial<BillItem> = {}): BillItem {
  return {
    id: '01J0BILL00000000000000001',
    household_id: 'h1',
    category: { id: 'c1', name: 'Listrik', icon: null },
    title: 'Tagihan Listrik',
    amount: '150000.00',
    due_date: '2026-10-25',
    is_active: true,
    notes: null,
    recurrence: null,
    recurrence_period: null,
    paid_amount: '0.00',
    remaining_amount: '150000.00',
    payment_count: 0,
    status: 'unpaid',
    overdue: false,
    created_at: '2026-10-01T00:00:00.000000Z',
    updated_at: '2026-10-01T00:00:00.000000Z',
    ...overrides
  }
}

function billDetail(overrides: Partial<BillDetail> = {}): BillDetail {
  return {
    ...billItem(),
    payments: [],
    ...overrides
  }
}

function listEnvelope(items: BillItem[] = [billItem()]): { success: boolean, data: BillItem[] } {
  return { success: true, data: items }
}

const STATE_KEYS = [
  'bills-items',
  'bills-filters',
  'bills-pending',
  'bills-submitting',
  'bills-error',
  'bills-field-errors',
  'bills-inflight',
  'bills-request-seq'
]

beforeEach(() => {
  clearNuxtState(STATE_KEYS)
  fetchMock.mockReset()
  fetchMock.mockResolvedValue(listEnvelope())
})

describe('useBills', () => {
  it('load() mengambil /api/bills dan unwrap envelope list (tanpa meta)', async () => {
    const bills = await mountBills()

    await bills.load()

    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, options] = fetchMock.mock.calls[0] as [string, { params: Record<string, unknown> }]

    expect(url).toBe('/api/bills')
    expect(options.params).toEqual({})
    expect(Array.isArray(bills.items.value)).toBe(true)
    expect(bills.items.value).toHaveLength(1)
    expect(bills.pending.value).toBe(false)
    expect(bills.error.value).toBeNull()
  })

  it('load({include_archived:true}) mengirim param true (kontrak backend)', async () => {
    const bills = await mountBills()

    await bills.load({ include_archived: true })

    const [, options] = fetchMock.mock.calls[0] as [string, { params: Record<string, unknown> }]

    expect(options.params).toEqual({ include_archived: 'true' })
    expect(bills.filters.value.include_archived).toBe(true)
  })

  it('dedupe in-flight: load ganda saat request berjalan hanya satu fetch', async () => {
    const bills = await mountBills()

    let release!: (value: unknown) => void

    const gate = new Promise((resolve) => {
      release = resolve as (value: unknown) => void
    })

    fetchMock.mockReturnValueOnce(gate)

    const first = bills.load()
    const second = bills.load()

    release(listEnvelope())
    await Promise.all([first, second])

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('requestSeq stale-guard: hasil request lama diabaikan setelah ganti filter', async () => {
    const bills = await mountBills()

    const archived = billItem({ id: '01J0BILL00000000000000009', is_active: false, title: 'Arsip Lama' })

    let releaseActive!: (value: unknown) => void

    const activeGate = new Promise((resolve) => {
      releaseActive = resolve as (value: unknown) => void
    })

    let releaseArchived!: (value: unknown) => void

    const archivedGate = new Promise((resolve) => {
      releaseArchived = resolve as (value: unknown) => void
    })

    // Panggilan pertama (filter aktif) tertahan; kedua (arsip) lebih dulu selesai.
    fetchMock.mockReturnValueOnce(activeGate).mockReturnValueOnce(archivedGate)

    const stale = bills.load({})
    const fresh = bills.load({ include_archived: true }, true)

    releaseArchived(listEnvelope([archived]))
    await fresh

    expect(bills.items.value.map(bill => bill.id)).toEqual(['01J0BILL00000000000000009'])

    releaseActive(listEnvelope([billItem()]))
    await stale

    // Hasil lama tidak menimpa hasil terbaru.
    expect(bills.items.value.map(bill => bill.id)).toEqual(['01J0BILL00000000000000009'])
    expect(bills.pending.value).toBe(false)
    expect(bills.filters.value.include_archived).toBe(true)
  })

  it('load() ketiga dengan filter sama disingkat; refresh() memaksa reload', async () => {
    const bills = await mountBills()

    await bills.load()
    await bills.load()

    expect(fetchMock).toHaveBeenCalledTimes(1)

    await bills.refresh()

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('API 401 tercatat sebagai error tanpa data dan tanpa logout', async () => {
    fetchMock.mockRejectedValueOnce({ statusCode: 401, data: { message: 'Unauthenticated.' } })

    const bills = await mountBills()

    await bills.load()

    expect(bills.items.value).toEqual([])
    expect(bills.error.value).toBe('Sesi berakhir. Silakan login kembali.')
    expect(bills.pending.value).toBe(false)
  })

  it('create() sekali tanpa recurrence: POST payload bersih + refresh', async () => {
    const bills = await mountBills()

    fetchMock.mockResolvedValueOnce({ success: true, data: billItem({ id: '01J0BILL00000000000000002' }) })

    const saved = await bills.create({
      title: '  Tagihan WiFi  ',
      amount: '150000,50',
      due_date: '2026-10-25',
      category_id: '',
      notes: '',
      recurrence: false,
      frequency: 'monthly'
    })

    expect(saved?.id).toBe('01J0BILL00000000000000002')

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body: Record<string, unknown> }]

    expect(url).toBe('/api/bills')
    expect(options.method).toBe('POST')
    expect(options.body).toEqual({
      title: 'Tagihan WiFi',
      amount: '150000.50',
      due_date: '2026-10-25',
      category_id: null,
      notes: null
    })
    expect(options.body).not.toHaveProperty('recurrence')
    expect(options.body).not.toHaveProperty('household_id')
    // POST + refresh GET.
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('create() recurrence mengirim {frequency} saja (kontrak StoreBillRequest)', async () => {
    const bills = await mountBills()

    fetchMock.mockResolvedValueOnce({ success: true, data: billItem() })

    await bills.create({
      title: 'Iuran',
      amount: '50000',
      due_date: '2026-11-05',
      category_id: 'c1',
      notes: 'AC',
      recurrence: true,
      frequency: 'quarterly'
    })

    const [, options] = fetchMock.mock.calls[0] as [string, { body: Record<string, unknown> }]

    expect(options.body).toMatchObject({ category_id: 'c1', notes: 'AC' })
    expect(options.body.recurrence).toEqual({ frequency: 'quarterly' })
    expect(Object.keys(options.body.recurrence as object)).toEqual(['frequency'])
  })

  it('create() nominal invalid tidak menyentuh network (validasi lokal)', async () => {
    const bills = await mountBills()

    const saved = await bills.create({
      title: 'X',
      amount: '150.000',
      due_date: '',
      category_id: '',
      notes: '',
      recurrence: false,
      frequency: 'monthly'
    })

    expect(saved).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(bills.fieldErrors.value.amount).toContain('Nominal')
  })

  it('create() 422 memetakan field errors per input', async () => {
    const bills = await mountBills()

    fetchMock.mockRejectedValueOnce({
      statusCode: 422,
      data: {
        data: {
          message: 'The given data was invalid.',
          errors: { title: ['The title field is required.'] }
        }
      }
    })

    const saved = await bills.create({
      title: '',
      amount: '1000',
      due_date: '2026-10-25',
      category_id: '',
      notes: '',
      recurrence: false,
      frequency: 'monthly'
    })

    expect(saved).toBeNull()
    expect(bills.fieldErrors.value).toEqual({ title: 'Kolom judul wajib diisi.' })
    expect(bills.error.value).toBe('Kolom judul wajib diisi.')
  })

  it('update() PATCH tanpa kunci recurrence/is_active (dilarang backend)', async () => {
    const bills = await mountBills()

    fetchMock.mockResolvedValueOnce({ success: true, data: billItem({ title: 'Revisi' }) })

    const saved = await bills.update('01J0BILL00000000000000001', {
      title: 'Revisi',
      amount: '200000',
      due_date: '',
      category_id: 'c1',
      notes: 'catatan',
      recurrence: true,
      frequency: 'yearly'
    })

    expect(saved?.title).toBe('Revisi')

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body: Record<string, unknown> }]

    expect(url).toBe('/api/bills/01J0BILL00000000000000001')
    expect(options.method).toBe('PATCH')
    expect(Object.keys(options.body).sort()).toEqual(['amount', 'category_id', 'due_date', 'notes', 'title'])
    expect(options.body).not.toHaveProperty('recurrence')
    expect(options.body).not.toHaveProperty('is_active')
    expect(options.body.due_date).toBeNull()
  })

  it('remove() DELETE lalu refresh; gagal tidak menghilangkan data', async () => {
    const bills = await mountBills()

    await bills.load()
    expect(bills.items.value).toHaveLength(1)

    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce({ success: true, data: {} })
    fetchMock.mockResolvedValue(listEnvelope([]))

    const ok = await bills.remove('01J0BILL00000000000000001')

    expect(ok).toBe(true)

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string }]

    expect(url).toBe('/api/bills/01J0BILL00000000000000001')
    expect(options.method).toBe('DELETE')
    expect(bills.items.value).toEqual([])

    fetchMock.mockReset()
    fetchMock.mockRejectedValueOnce({ statusCode: 422, data: { error: { code: 'BILL_ALREADY_PAID', message: 'x' } } })

    const failed = await bills.remove('01J0BILL00000000000000001')

    expect(failed).toBe(false)
    expect(bills.error.value).toBe('Tagihan ini sudah dibayar.')
  })

  it('archive() POST /archive tanpa body; 422 domain terbaca jujur', async () => {
    const bills = await mountBills()

    fetchMock.mockResolvedValueOnce({ success: true, data: billItem({ is_active: false, status: 'paid' }) })

    const archived = await bills.archive('01J0BILL00000000000000001')

    expect(archived?.is_active).toBe(false)

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body?: unknown }]

    expect(url).toBe('/api/bills/01J0BILL00000000000000001/archive')
    expect(options.method).toBe('POST')
    expect(options.body).toBeUndefined()

    fetchMock.mockRejectedValueOnce({ statusCode: 422, data: { error: { code: 'BILL_NOT_PAID', message: 'x' } } })

    const failed = await bills.archive('01J0BILL00000000000000001')

    expect(failed).toBeNull()
    expect(bills.error.value).toBe('Hanya tagihan lunas yang bisa diarsipkan.')
  })

  it('pay() HANYA mengirim {wallet_id} — tanpa amount, tanpa category_id', async () => {
    const bills = await mountBills()

    fetchMock.mockResolvedValueOnce({
      success: true,
      data: { payment: { id: 't1' }, bill: billItem({ status: 'paid', payment_count: 1 }) }
    })

    const paid = await bills.pay('01J0BILL00000000000000001', { wallet_id: 'w1', occurred_on: '' })

    expect(paid).not.toBeNull()

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body: Record<string, unknown> }]

    expect(url).toBe('/api/bills/01J0BILL00000000000000001/payments')
    expect(options.method).toBe('POST')
    expect(options.body).toEqual({ wallet_id: 'w1' })
    expect(options.body).not.toHaveProperty('amount')
    expect(options.body).not.toHaveProperty('category_id')
    expect(options.body).not.toHaveProperty('occurred_on')
    // Pay + refresh.
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('pay() occurred_on terisi diteruskan apa adanya; kosong dihilangkan', async () => {
    const bills = await mountBills()

    fetchMock.mockResolvedValueOnce({ success: true, data: { payment: { id: 't1' }, bill: billItem() } })

    await bills.pay('01J0BILL00000000000000001', { wallet_id: 'w2', occurred_on: '2026-10-10' })

    const [, options] = fetchMock.mock.calls[0] as [string, { body: Record<string, unknown> }]

    expect(options.body).toEqual({ wallet_id: 'w2', occurred_on: '2026-10-10' })
  })

  it('pay() INSUFFICIENT_FUNDS terbaca sebagai error domain (tanpa logout)', async () => {
    const bills = await mountBills()

    fetchMock.mockRejectedValueOnce({
      statusCode: 422,
      data: { error: { code: 'INSUFFICIENT_FUNDS', message: 'Saldo tidak cukup.' } }
    })

    const paid = await bills.pay('01J0BILL00000000000000001', { wallet_id: 'w1', occurred_on: '' })

    expect(paid).toBeNull()
    expect(bills.error.value).toBe('Saldo dompet tidak cukup.')
    expect(bills.submitting.value).toBe(false)
  })

  it('double submit pay dicegah saat request berjalan', async () => {
    const bills = await mountBills()

    let release!: (value: unknown) => void

    const gate = new Promise((resolve) => {
      release = resolve as (value: unknown) => void
    })

    fetchMock.mockReturnValueOnce(gate)

    const first = bills.pay('01J0BILL00000000000000001', { wallet_id: 'w1', occurred_on: '' })
    const second = await bills.pay('01J0BILL00000000000000001', { wallet_id: 'w1', occurred_on: '' })

    expect(second).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    release({ success: true, data: { payment: { id: 't1' }, bill: billItem() } })
    await first

    // Satu POST + satu refresh; submit kedua tertolak saat submitting.
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('updateRecurrence() kirim hanya diff (PATCH flat) + refresh', async () => {
    const bills = await mountBills()

    fetchMock.mockResolvedValueOnce({
      success: true,
      data: { id: 'r1', frequency: 'yearly', due_day: 25, is_active: true }
    })

    const updated = await bills.updateRecurrence('r1', { frequency: 'yearly' })

    expect(updated).not.toBeNull()

    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string, body: Record<string, unknown> }]

    expect(url).toBe('/api/bills/recurrences/r1')
    expect(options.method).toBe('PATCH')
    // Hanya kunci yang berubah — nilai template basi tidak ikut terkirim.
    expect(options.body).toEqual({ frequency: 'yearly' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('updateRecurrence() due_day di luar 1–31 ditolak lokal tanpa network', async () => {
    const bills = await mountBills()

    const updated = await bills.updateRecurrence('r1', { due_day: 99 })

    expect(updated).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(bills.fieldErrors.value.due_day).toContain('1–31')
  })

  it('updateRecurrence() nominal invalid ditolak lokal tanpa network', async () => {
    const bills = await mountBills()

    const updated = await bills.updateRecurrence('r1', { amount: 'abc' })

    expect(updated).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(bills.fieldErrors.value.amount).toContain('Nominal')
  })

  it('updateRecurrence() tanpa perubahan tidak mengirim request', async () => {
    const bills = await mountBills()

    const updated = await bills.updateRecurrence('r1', {})

    expect(updated).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fetchOne() mengambil detail satu bill', async () => {
    const bills = await mountBills()

    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce({ success: true, data: billDetail() })

    const item = await bills.fetchOne('01J0BILL00000000000000001')

    expect(item.payments).toEqual([])
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/bills/01J0BILL00000000000000001')
  })

  it('clearError() menghapus error dan field errors', async () => {
    const bills = await mountBills()

    fetchMock.mockRejectedValueOnce({ statusCode: 422, data: { data: { errors: { title: ['The title field is required.'] } } } })

    await bills.load()

    expect(bills.error.value).not.toBeNull()

    bills.clearError()

    expect(bills.error.value).toBeNull()
    expect(bills.fieldErrors.value).toEqual({})
  })
})
