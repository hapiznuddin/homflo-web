import { mountSuspended } from '@nuxt/test-utils/runtime'
import USelect from '@nuxt/ui/components/Select.vue'
import { DOMWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import MaintenanceFormModal from '~/components/maintenance/MaintenanceFormModal.vue'
import type { AssetItem } from '~/types/assets'
import type { MaintenanceItem } from '~/types/maintenance'

// Modal form maintenance: prefill dari detail, validasi klien (aset/judul/
// lokasi/tanggal wajib), asset dipilih dari daftar Assets yang sudah ada, dan
// error server per field. Lifecycle tidak pernah dikirim dari sini.

const ASSET_ID = '01J0ASSET0000000000000001'
const MAINTENANCE_ID = '01J0MAINT0000000000000001'

function assetItem(overrides: Partial<AssetItem> = {}): AssetItem {
  return {
    id: ASSET_ID,
    household_id: 'h1',
    name: 'AC kamar',
    description: null,
    location: 'Kamar utama',
    acquired_on: '2026-01-15',
    acquisition_cost: '4500000.00',
    created_at: '2026-01-15T00:00:00.000000Z',
    updated_at: '2026-01-15T00:00:00.000000Z',
    ...overrides
  }
}

function maintenanceItem(overrides: Partial<MaintenanceItem> = {}): MaintenanceItem {
  return {
    id: MAINTENANCE_ID,
    household_id: 'h1',
    asset_id: ASSET_ID,
    title: 'Cuci AC kamar',
    description: 'Rutin bulanan',
    location: 'Kamar utama',
    scheduled_date: '2026-11-01',
    completed_at: null,
    cancelled_at: null,
    priority: 'sedang',
    status: 'scheduled',
    created_at: '2026-10-01T00:00:00.000000Z',
    updated_at: '2026-10-01T00:00:00.000000Z',
    ...overrides
  }
}

async function mountModal(options: {
  editing?: MaintenanceItem | null
  error?: string | null
  fieldErrors?: Record<string, string>
  assets?: AssetItem[]
  assetsPending?: boolean
  assetsError?: string | null
} = {}): Promise<Awaited<ReturnType<typeof mountSuspended>>> {
  const ModalHarness = defineComponent({
    name: 'MaintenanceFormModalHarness',
    render: () => h(MaintenanceFormModal, {
      open: true,
      editing: options.editing ?? null,
      submitting: false,
      error: options.error ?? null,
      fieldErrors: options.fieldErrors ?? {},
      assets: options.assets ?? [assetItem()],
      assetsPending: options.assetsPending ?? false,
      assetsError: options.assetsError ?? null
    })
  })

  return mountSuspended(ModalHarness, { route: false })
}

// UModal me-render via teleport; bersihkan sisa antar test.
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

describe('MaintenanceFormModal', () => {
  it('create default: aset kosong, prioritas rutin, tombol Tambah', async () => {
    const wrapper = await mountModal()

    await nextTick()

    const modal = wrapper.findComponent(MaintenanceFormModal)
    const selects = modal.findAllComponents(USelect)

    expect(selects[0]?.props('modelValue')).toBe('')
    expect(selects[1]?.props('modelValue')).toBe('rutin')
    expect(bodyText()).toContain('Tambah perawatan')
    expect(selects[0]?.props('items')).toEqual([{ label: 'AC kamar', value: ASSET_ID }])
  })

  it('prefill akurat dari data detail saat edit', async () => {
    const wrapper = await mountModal({ editing: maintenanceItem() })

    await nextTick()

    expect(bodyText()).toContain('Ubah perawatan')
    expect(inputValue('#maintenance-title')).toBe('Cuci AC kamar')
    expect(inputValue('#maintenance-location')).toBe('Kamar utama')
    expect(inputValue('#maintenance-scheduled-date')).toBe('2026-11-01')

    const modal = wrapper.findComponent(MaintenanceFormModal)
    const selects = modal.findAllComponents(USelect)

    expect(selects[0]?.props('modelValue')).toBe(ASSET_ID)
    expect(selects[1]?.props('modelValue')).toBe('sedang')
  })

  it('submit valid mengirim nilai form (aset, judul, deskripsi, lokasi, tanggal, prioritas)', async () => {
    const wrapper = await mountModal()

    await nextTick()

    const modal = wrapper.findComponent(MaintenanceFormModal)
    const selects = modal.findAllComponents(USelect)

    selects[0]!.vm.$emit('update:modelValue', ASSET_ID)
    selects[1]!.vm.$emit('update:modelValue', 'tinggi')
    await nextTick()

    await new DOMWrapper(document.body.querySelector('#maintenance-title') as Element).setValue('Servis kulkas')
    await new DOMWrapper(document.body.querySelector('#maintenance-location') as Element).setValue('Dapur')
    await new DOMWrapper(document.body.querySelector('#maintenance-description') as Element).setValue('Bersihkan karet')
    await new DOMWrapper(document.body.querySelector('#maintenance-scheduled-date') as Element).setValue('2026-12-05')

    await bodyButton('Tambah').trigger('click')

    const emitted = wrapper.findComponent(MaintenanceFormModal).emitted('submit')

    expect(emitted).toBeTruthy()
    expect(emitted?.[0]).toEqual([{
      asset_id: ASSET_ID,
      title: 'Servis kulkas',
      description: 'Bersihkan karet',
      location: 'Dapur',
      scheduled_date: '2026-12-05',
      priority: 'tinggi'
    }])
  })

  it('validasi klien: aset/judul/lokasi/tanggal wajib — submit tidak dipancarkan', async () => {
    const wrapper = await mountModal()

    await nextTick()

    await bodyButton('Tambah').trigger('click')
    await nextTick()

    expect(wrapper.findComponent(MaintenanceFormModal).emitted('submit')).toBeUndefined()
    const text = bodyText()

    expect(text).toContain('Pilih aset terlebih dahulu.')
    expect(text).toContain('Judul wajib diisi.')
    expect(text).toContain('Lokasi wajib diisi.')
    expect(text).toContain('Tanggal jadwal wajib diisi.')
  })

  it('tanpa aset tersedia: submit disabled + petunjuk jelas', async () => {
    const wrapper = await mountModal({ assets: [] })

    await nextTick()

    expect(bodyText()).toContain('Belum ada aset rumah tangga')
    expect(bodyButton('Tambah').attributes('disabled')).toBeDefined()
    expect(wrapper.findComponent(MaintenanceFormModal).emitted('submit')).toBeUndefined()
  })

  it('menampilkan validation error server per field + alert error', async () => {
    await mountModal({
      error: 'Perawatan belum dapat disimpan.',
      fieldErrors: { title: 'Kolom judul wajib diisi.' }
    })

    await nextTick()

    expect(bodyText()).toContain('Data belum dapat disimpan.')
    expect(bodyText()).toContain('Perawatan belum dapat disimpan.')
    expect(bodyText()).toContain('Kolom judul wajib diisi.')
  })

  it('assets error menampilkan pesan + tombol Coba lagi (retry-assets)', async () => {
    const wrapper = await mountModal({ assetsError: 'Gagal memuat aset' })

    await nextTick()

    expect(bodyText()).toContain('Gagal memuat aset')

    await bodyButton('Coba lagi').trigger('click')

    expect(wrapper.findComponent(MaintenanceFormModal).emitted('retry-assets')).toBeTruthy()
  })
})
