import { mountSuspended } from '@nuxt/test-utils/runtime'
import USelect from '@nuxt/ui/components/Select.vue'
import { DOMWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import AssetFormModal from '~/components/assets/AssetFormModal.vue'
import type { AssetItem, AssetPropertySummary } from '~/types/assets'

const PROPERTY_ID = '01J0PROPERTY00000000000001'
const ARCHIVED_PROPERTY_ID = '01J0PROPERTY00000000000002'

const activeProperty: AssetPropertySummary = {
  id: PROPERTY_ID,
  name: 'Rumah utama',
  archived_at: null
}

const archivedProperty: AssetPropertySummary = {
  id: ARCHIVED_PROPERTY_ID,
  name: 'Rumah lama',
  archived_at: '2026-10-01T00:00:00Z'
}

function assetItem(overrides: Partial<AssetItem> = {}): AssetItem {
  return {
    id: '01J0ASSET0000000000000001',
    household_id: 'h1',
    name: 'Kulkas dapur',
    description: 'Dua pintu',
    location: 'Dapur',
    acquired_on: '2026-01-15',
    acquisition_cost: '4500000.00',
    created_at: '2026-01-15T00:00:00.000000Z',
    updated_at: '2026-01-15T00:00:00.000000Z',
    property_id: null,
    property: null,
    ...overrides
  }
}

async function mountModal(
  options: {
    editing?: AssetItem | null
    error?: string | null
    fieldErrors?: Record<string, string>
    properties?: AssetPropertySummary[]
    propertiesPending?: boolean
    propertiesError?: string | null
  } = {}
): Promise<Awaited<ReturnType<typeof mountSuspended>>> {
  const ModalHarness = defineComponent({
    name: 'AssetFormModalHarness',
    render: () =>
      h(AssetFormModal, {
        open: true,
        editing: options.editing ?? null,
        submitting: false,
        error: options.error ?? null,
        fieldErrors: options.fieldErrors ?? {},
        properties: options.properties ?? [activeProperty],
        propertiesPending: options.propertiesPending ?? false,
        propertiesError: options.propertiesError ?? null
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
  const element = Array.from(document.body.querySelectorAll('button')).find(
    (button) => (button.textContent ?? '').trim() === label
  )

  if (!element) {
    throw new Error(`Tombol "${label}" tidak ditemukan di modal`)
  }

  return new DOMWrapper(element)
}

describe('AssetFormModal Property selector', () => {
  it('create menampilkan Tanpa properti + Property aktif dan meminta daftar aktif', async () => {
    const wrapper = await mountModal()

    await nextTick()

    const modal = wrapper.findComponent(AssetFormModal)
    const select = modal.findComponent(USelect)

    expect(select.props('modelValue')).toBe('none')
    expect(select.props('items')).toEqual([
      { label: 'Tanpa properti', value: 'none' },
      { label: 'Rumah utama', value: PROPERTY_ID }
    ])
    expect(bodyText()).not.toContain('(diarsipkan)')
  })

  it('memilih Property aktif dikirim sebagai property_id pada submit', async () => {
    const wrapper = await mountModal()

    await nextTick()

    const modal = wrapper.findComponent(AssetFormModal)
    const select = modal.findComponent(USelect)

    select.vm.$emit('update:modelValue', PROPERTY_ID)
    await nextTick()
    await new DOMWrapper(document.body.querySelector('#asset-name') as Element).setValue('Sofa')

    await bodyButton('Tambah').trigger('click')

    expect(modal.emitted('submit')?.[0]).toEqual([
      {
        name: 'Sofa',
        description: '',
        location: '',
        acquired_on: '',
        acquisition_cost: '',
        property_id: PROPERTY_ID
      }
    ])
  })

  it('default "Tanpa properti" dikirim sebagai sentinel none', async () => {
    const wrapper = await mountModal()

    await nextTick()
    await new DOMWrapper(document.body.querySelector('#asset-name') as Element).setValue('Sofa')
    await bodyButton('Tambah').trigger('click')

    expect(wrapper.findComponent(AssetFormModal).emitted('submit')?.[0]?.[0]).toMatchObject({
      property_id: 'none'
    })
  })

  it('relasi archived saat ini tetap terlihat, terpilih, dan dipertahankan', async () => {
    const wrapper = await mountModal({
      editing: assetItem({
        property_id: ARCHIVED_PROPERTY_ID,
        property: archivedProperty
      }),
      properties: [
        activeProperty,
        archivedProperty,
        {
          id: '01J0PROPERTY00000000000003',
          name: 'Arsip lain',
          archived_at: '2026-10-02T00:00:00Z'
        }
      ]
    })

    await nextTick()

    const modal = wrapper.findComponent(AssetFormModal)
    const select = modal.findComponent(USelect)
    const items = select.props('items') as Array<{ label: string; value: string }>

    expect(select.props('modelValue')).toBe(ARCHIVED_PROPERTY_ID)
    expect(items).toContainEqual({ label: 'Rumah lama (diarsipkan)', value: ARCHIVED_PROPERTY_ID })
    expect(items).toContainEqual({ label: 'Tanpa properti', value: 'none' })
    expect(items).toContainEqual({ label: 'Rumah utama', value: PROPERTY_ID })
    // Property archived lain tidak boleh menjadi target baru.
    expect(items.some((item) => item.value === '01J0PROPERTY00000000000003')).toBe(false)
    expect(bodyText()).toContain('Properti yang saat ini terhubung sudah diarsipkan.')

    await new DOMWrapper(document.body.querySelector('#asset-name') as Element).setValue(
      'Kulkas baru'
    )
    await bodyButton('Simpan').trigger('click')

    expect(modal.emitted('submit')?.[0]?.[0]).toMatchObject({
      name: 'Kulkas baru',
      property_id: ARCHIVED_PROPERTY_ID
    })
  })

  it('memilih Tanpa properti pada edit memungkinkan detach eksplisit', async () => {
    const wrapper = await mountModal({
      editing: assetItem({ property_id: PROPERTY_ID, property: activeProperty })
    })

    await nextTick()

    const modal = wrapper.findComponent(AssetFormModal)
    const select = modal.findComponent(USelect)

    expect(select.props('modelValue')).toBe(PROPERTY_ID)

    select.vm.$emit('update:modelValue', 'none')
    await nextTick()
    await bodyButton('Simpan').trigger('click')

    expect(modal.emitted('submit')?.[0]?.[0]).toMatchObject({ property_id: 'none' })
  })

  it('empty Property tidak menonaktifkan submit dan menjelaskan Asset tetap bisa disimpan', async () => {
    const wrapper = await mountModal({ properties: [] })

    await nextTick()

    expect(bodyText()).toContain(
      'Belum ada properti aktif; aset tetap dapat disimpan tanpa properti.'
    )
    expect(bodyButton('Tambah').attributes('disabled')).toBeUndefined()

    await new DOMWrapper(document.body.querySelector('#asset-name') as Element).setValue('Sofa')
    await bodyButton('Tambah').trigger('click')

    expect(wrapper.findComponent(AssetFormModal).emitted('submit')?.[0]?.[0]).toMatchObject({
      property_id: 'none'
    })
  })

  it('loading ditampilkan pada selector tanpa memblokir submit', async () => {
    const wrapper = await mountModal({ properties: [], propertiesPending: true })

    await nextTick()

    const select = wrapper.findComponent(AssetFormModal).findComponent(USelect)

    expect(select.props('loading')).toBe(true)
    expect(bodyButton('Tambah').attributes('disabled')).toBeUndefined()
  })

  it('error daftar Property menampilkan pesan + retry dan submit tetap tersedia', async () => {
    const wrapper = await mountModal({
      properties: [],
      propertiesError: 'Koneksi terputus'
    })

    await nextTick()

    expect(bodyText()).toContain('Daftar properti belum dapat dimuat.')
    expect(bodyText()).toContain('Koneksi terputus')
    expect(bodyButton('Tambah').attributes('disabled')).toBeUndefined()

    await bodyButton('Coba lagi').trigger('click')

    expect(wrapper.findComponent(AssetFormModal).emitted('retry-properties')).toBeTruthy()
  })

  it('422 property_id tampil di bawah selector', async () => {
    await mountModal({
      fieldErrors: { property_id: 'Kolom properti harus berupa ID yang valid.' }
    })

    await nextTick()

    expect(bodyText()).toContain('Kolom properti harus berupa ID yang valid.')
  })

  it('error server 409/404 tetap tampil di dalam form yang terbuka', async () => {
    await mountModal({
      error: 'Properti sudah diarsipkan. Pulihkan terlebih dahulu sebelum mengubahnya.'
    })

    await nextTick()

    expect(bodyText()).toContain('Data belum dapat disimpan.')
    expect(bodyText()).toContain('Properti sudah diarsipkan.')
    expect(bodyText()).toContain('Tambah aset')
  })
})
