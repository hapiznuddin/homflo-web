import { mountSuspended } from '@nuxt/test-utils/runtime'
import USelect from '@nuxt/ui/components/Select.vue'
import { DOMWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import BillRecurrenceModal from '~/components/bills/BillRecurrenceModal.vue'
import type { BillItem } from '~/types/bills'

// Panel Ubah Jadwal (PATCH flat /api/bills/recurrences/{id}):
// - prefill akurat dari bill.recurrence (field jadwal asli)
// - submit mengirim HANYA diff — template basi tidak ikut terkirim
// - copy D-03 (propagasi) & D-09 (frekuensi ke depan) & larangan hapus jadwal

function recurringBill(overrides: Partial<BillItem> = {}): BillItem {
  return {
    id: '01J0BILL00000000000000001',
    household_id: 'h1',
    category: { id: 'c1', name: 'Listrik', icon: null },
    title: 'Tagihan Listrik',
    amount: '150000.00',
    due_date: '2026-10-25',
    is_active: true,
    notes: 'Nomor pelanggan 123',
    recurrence: { id: 'r1', frequency: 'monthly', due_day: 25, is_active: true },
    recurrence_period: '2026-10-25',
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

async function mountModal(bill: BillItem = recurringBill(), error: string | null = null): Promise<Awaited<ReturnType<typeof mountSuspended>>> {
  // Harness induk: findComponent/emitted butuh modal sebagai anak, bukan
  // root mount (mountSuspended membungkus root dalam harness internal).
  const ModalHarness = defineComponent({
    name: 'BillRecurrenceModalHarness',
    render: () => h(BillRecurrenceModal, {
      open: true,
      bill,
      submitting: false,
      error,
      fieldErrors: {}
    })
  })

  return mountSuspended(ModalHarness, { route: false })
}

// UModal me-render via teleport; bersihkan sisa antar test.
afterEach(() => {
  document.body.innerHTML = ''
})

function bodyButtons(label: string): Element[] {
  return Array.from(document.body.querySelectorAll('button'))
    .filter(button => (button.textContent ?? '').includes(label))
}

function submitButton(): Element {
  const element = bodyButtons('Simpan jadwal')[0]

  if (!element) {
    throw new Error('Tombol Simpan jadwal tidak ditemukan')
  }

  return element
}

describe('BillRecurrenceModal', () => {
  it('prefill dari bill.recurrence + copy D-03/D-09/larangan hapus jadwal dirender', async () => {
    const wrapper = await mountModal()

    await nextTick()

    // Konten UModal ter-teleport ke document.body (pola repo).
    const text = document.body.textContent ?? ''

    // Copy propagasi (D-03).
    expect(text).toContain('belum dibayar')
    expect(text).toContain('tidak pernah berubah')
    // Copy frekuensi ke depan saja (D-09).
    expect(text).toContain('ke depan saja')
    // Tidak pernah mengklaim bisa menghapus/menonaktifkan tanpa aksi.
    expect(text).toContain('Tidak ada hapus jadwal')

    // Prefill field jadwal dari bill.recurrence (bukan dari baris periode).
    const dueDayInput = document.body.querySelector('#rec-due-day') as HTMLInputElement | null

    expect(dueDayInput?.value).toBe('25')

    const modal = wrapper.findComponent(BillRecurrenceModal)
    const selects = modal.findAllComponents(USelect)

    expect(selects[0]?.props('modelValue')).toBe('monthly')

    // Toggle jadwal aktif bernilai true (dari recurrence.is_active).
    const switchButton = document.body.querySelector('[role="switch"]')

    expect(switchButton?.getAttribute('aria-checked')).toBe('true')
  })

  it('tanpa perubahan tombol simpan disabled (tidak ada request buta)', async () => {
    await mountModal()

    await nextTick()

    expect(submitButton().hasAttribute('disabled')).toBe(true)
  })

  it('submit mengirim HANYA diff — frequency saja saat hanya frekuensi berubah', async () => {
    const wrapper = await mountModal()

    await nextTick()

    const modal = wrapper.findComponent(BillRecurrenceModal)
    const selects = modal.findAllComponents(USelect)

    selects[0]!.vm.$emit('update:modelValue', 'yearly')
    await nextTick()

    expect(submitButton().hasAttribute('disabled')).toBe(false)

    await new DOMWrapper(submitButton()).trigger('click')

    const emitted = wrapper.findComponent(BillRecurrenceModal).emitted('submit')

    expect(emitted).toBeTruthy()
    expect(emitted?.[0]).toEqual([{ frequency: 'yearly' }])
  })

  it('due_day & is_active ikut terkirim sebagai number/boolean saat berubah', async () => {
    const wrapper = await mountModal()

    await nextTick()

    const dueDayInput = document.body.querySelector('#rec-due-day') as HTMLInputElement

    await new DOMWrapper(dueDayInput).setValue('28')

    const switchButton = document.body.querySelector('[role="switch"]') as Element

    await new DOMWrapper(switchButton).trigger('click')
    await nextTick()

    await new DOMWrapper(submitButton()).trigger('click')

    const emitted = wrapper.findComponent(BillRecurrenceModal).emitted('submit')

    expect(emitted?.[0]).toEqual([{ due_day: 28, is_active: false }])
  })

  it('error backend tampil sebagai alert modal, bukan menutup panel', async () => {
    await mountModal(undefined, 'Jadwal tagihan belum dapat diubah.')

    await nextTick()

    expect(document.body.textContent ?? '').toContain('Jadwal tagihan belum dapat diubah.')
  })
})
