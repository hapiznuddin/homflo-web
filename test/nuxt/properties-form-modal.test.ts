import { mountSuspended } from '@nuxt/test-utils/runtime'
import USelect from '@nuxt/ui/components/Select.vue'
import { DOMWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import PropertyFormModal from '~/components/properties/PropertyFormModal.vue'
import type { PropertyItem } from '~/types/properties'

const PROPERTY_ID = '01J0PROPERTY00000000000001'

function propertyItem(overrides: Partial<PropertyItem> = {}): PropertyItem {
  return {
    id: PROPERTY_ID,
    household_id: 'h1',
    name: 'Rumah utama',
    type: 'house',
    address: 'Jl. Mawar 1',
    description: 'Rumah keluarga',
    ownership_status: 'owned',
    notes: 'Kunci di pos',
    archived_at: null,
    created_at: '2026-10-01T00:00:00.000000Z',
    updated_at: '2026-10-01T00:00:00.000000Z',
    ...overrides
  }
}

async function mountModal(options: {
  editing?: PropertyItem | null
  error?: string | null
  fieldErrors?: Record<string, string>
} = {}): Promise<Awaited<ReturnType<typeof mountSuspended>>> {
  const ModalHarness = defineComponent({
    name: 'PropertyFormModalHarness',
    render: () => h(PropertyFormModal, {
      open: true,
      editing: options.editing ?? null,
      submitting: false,
      error: options.error ?? null,
      fieldErrors: options.fieldErrors ?? {}
    })
  })

  return mountSuspended(ModalHarness, { route: false })
}

afterEach(() => {
  document.body.innerHTML = ''
})

function bodyText(): string {
  return document.body.textContent ?? ''
}

function bodyButton(label: string): DOMWrapper<Element> {
  const element = Array.from(document.body.querySelectorAll('button'))
    .find(button => (button.textContent ?? '').trim() === label)

  if (!element) {
    throw new Error(`Tombol "${label}" tidak ditemukan di modal`)
  }

  return new DOMWrapper(element)
}

function inputValue(selector: string): string {
  return (document.body.querySelector(selector) as HTMLInputElement).value
}

describe('PropertyFormModal', () => {
  it('create default: tipe/ownership kosong, field opsional kosong, tombol Tambah', async () => {
    const wrapper = await mountModal()

    await nextTick()

    const modal = wrapper.findComponent(PropertyFormModal)
    const selects = modal.findAllComponents(USelect)

    expect(selects[0]?.props('modelValue')).toBeUndefined()
    expect(selects[1]?.props('modelValue')).toBeUndefined()
    expect(bodyText()).toContain('Tambah properti')
    expect(inputValue('#property-name')).toBe('')
    expect(inputValue('#property-address')).toBe('')
    expect(selects[0]?.props('items')).toContainEqual({ label: 'Rumah', value: 'house' })
    expect(selects[1]?.props('items')).toContainEqual({ label: 'Milik sendiri', value: 'owned' })
  })

  it('prefill akurat dari data detail saat edit', async () => {
    const wrapper = await mountModal({ editing: propertyItem() })

    await nextTick()

    expect(bodyText()).toContain('Ubah properti')
    expect(inputValue('#property-name')).toBe('Rumah utama')
    expect(inputValue('#property-address')).toBe('Jl. Mawar 1')
    expect(inputValue('#property-description')).toBe('Rumah keluarga')
    expect(inputValue('#property-notes')).toBe('Kunci di pos')

    const selects = wrapper.findComponent(PropertyFormModal).findAllComponents(USelect)

    expect(selects[0]?.props('modelValue')).toBe('house')
    expect(selects[1]?.props('modelValue')).toBe('owned')
  })

  it('submit valid mengirim seluruh nilai form', async () => {
    const wrapper = await mountModal()

    await nextTick()

    const modal = wrapper.findComponent(PropertyFormModal)
    const selects = modal.findAllComponents(USelect)

    selects[0]!.vm.$emit('update:modelValue', 'apartment')
    selects[1]!.vm.$emit('update:modelValue', 'rented')
    await nextTick()

    await new DOMWrapper(document.body.querySelector('#property-name') as Element).setValue('Apartemen sewa')
    await new DOMWrapper(document.body.querySelector('#property-address') as Element).setValue('Jl. Melati 2')
    await new DOMWrapper(document.body.querySelector('#property-description') as Element).setValue('Lantai 3')
    await new DOMWrapper(document.body.querySelector('#property-notes') as Element).setValue('Bayar bulanan')

    await bodyButton('Tambah').trigger('click')

    const emitted = wrapper.findComponent(PropertyFormModal).emitted('submit')

    expect(emitted?.[0]).toEqual([{
      name: 'Apartemen sewa',
      type: 'apartment',
      address: 'Jl. Melati 2',
      ownership_status: 'rented',
      description: 'Lantai 3',
      notes: 'Bayar bulanan'
    }])
  })

  it('validasi klien field wajib: submit tidak dipancarkan', async () => {
    const wrapper = await mountModal()

    await nextTick()
    await bodyButton('Tambah').trigger('click')
    await nextTick()

    expect(wrapper.findComponent(PropertyFormModal).emitted('submit')).toBeUndefined()

    const text = bodyText()

    expect(text).toContain('Nama properti wajib diisi.')
    expect(text).toContain('Tipe properti wajib dipilih.')
    expect(text).toContain('Alamat wajib diisi.')
    expect(text).toContain('Status kepemilikan wajib dipilih.')
  })

  it('menampilkan error server dan error per field', async () => {
    await mountModal({
      error: 'Properti belum dapat disimpan.',
      fieldErrors: { address: 'Kolom alamat maksimal 500 karakter.' }
    })

    await nextTick()

    expect(bodyText()).toContain('Data belum dapat disimpan.')
    expect(bodyText()).toContain('Properti belum dapat disimpan.')
    expect(bodyText()).toContain('Kolom alamat maksimal 500 karakter.')
  })
})
