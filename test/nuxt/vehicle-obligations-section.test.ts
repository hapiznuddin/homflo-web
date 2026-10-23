import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { DOMWrapper } from '@vue/test-utils'
import USelect from '@nuxt/ui/components/Select.vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import type { ObligationTypeItem, VehicleObligationItem } from '~/types/vehicleObligations'
import VehicleObligationsSection from '~/components/vehicles/VehicleObligationsSection.vue'
import VehicleObligationFormModal from '~/components/vehicles/VehicleObligationFormModal.vue'

// Section Kewajiban pada halaman detail: list/loading/empty/error, status
// administratif, konteks tanggal lewat tanpa status baru, detail inline,
// create/edit/delete dengan konfirmasi, authz owner-only, dan jenis bawaan
// vs custom. Backend tetap otoritas; tidak ada klaim sukses palsu.

const VEHICLE_ID = '01J0VEHICLE000000000000001'
const OBLIGATION_ID = '01J0OBLIGATION000000000001'
const SYSTEM_ID = '01J0TYPE0000000000000001'
const CUSTOM_ID = '01J0TYPE0000000000000002'

const toastMock = vi.hoisted(() => ({ add: vi.fn() }))

mockNuxtImport('useToast', () => () => toastMock)

interface MockObligationsApi {
  items: Ref<VehicleObligationItem[]>
  pending: Ref<boolean>
  submitting: Ref<boolean>
  error: Ref<string | null>
  errorCode: Ref<string | null>
  fieldErrors: Ref<Record<string, string>>
  load: ReturnType<typeof vi.fn>
  refresh: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
  clearError: ReturnType<typeof vi.fn>
}

interface MockTypesApi {
  items: Ref<ObligationTypeItem[]>
  pending: Ref<boolean>
  submitting: Ref<boolean>
  error: Ref<string | null>
  errorCode: Ref<string | null>
  fieldErrors: Ref<Record<string, string>>
  load: ReturnType<typeof vi.fn>
  refresh: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
  clearError: ReturnType<typeof vi.fn>
}

const obligationsMock = vi.hoisted(() => ({ api: undefined as unknown }))
const typesMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useVehicleObligations', () => () => obligationsMock.api)
mockNuxtImport('useObligationTypes', () => () => typesMock.api)

function obligationItem(overrides: Partial<VehicleObligationItem> = {}): VehicleObligationItem {
  return {
    id: OBLIGATION_ID,
    vehicle_id: VEHICLE_ID,
    obligation_type: {
      id: SYSTEM_ID,
      code: 'tax',
      name: 'Pajak Kendaraan',
      is_system: true
    },
    title: 'Pajak tahunan',
    description: 'Pajak kendaraan tahunan',
    issued_date: '2026-10-01',
    due_date: '2026-11-30',
    amount: '250000.00',
    status: 'active',
    created_at: '2026-10-01T00:00:00.000000Z',
    updated_at: '2026-10-01T00:00:00.000000Z',
    ...overrides
  }
}

function typeItem(overrides: Partial<ObligationTypeItem> = {}): ObligationTypeItem {
  return {
    id: SYSTEM_ID,
    household_id: null,
    code: 'tax',
    name: 'Pajak Kendaraan',
    is_system: true,
    created_at: '2026-10-01T00:00:00.000000Z',
    updated_at: '2026-10-01T00:00:00.000000Z',
    ...overrides
  }
}

function customType(overrides: Partial<ObligationTypeItem> = {}): ObligationTypeItem {
  return typeItem({
    id: CUSTOM_ID,
    household_id: 'h1',
    code: null,
    name: 'Asuransi',
    is_system: false,
    ...overrides
  })
}

function setupState(options: {
  items?: VehicleObligationItem[]
  pending?: boolean
  submitting?: boolean
  error?: string | null
  fieldErrors?: Record<string, string>
  types?: ObligationTypeItem[]
  typesPending?: boolean
  typesError?: string | null
} = {}): { obligations: MockObligationsApi, types: MockTypesApi } {
  const obligations: MockObligationsApi = {
    items: ref(options.items ?? []),
    pending: ref(options.pending ?? false),
    submitting: ref(options.submitting ?? false),
    error: ref(options.error ?? null),
    errorCode: ref(null),
    fieldErrors: ref(options.fieldErrors ?? {}),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {}),
    create: vi.fn(async () => null),
    update: vi.fn(async () => null),
    remove: vi.fn(async () => false),
    clearError: vi.fn()
  }

  const types: MockTypesApi = {
    items: ref(options.types ?? [typeItem(), customType()]),
    pending: ref(options.typesPending ?? false),
    submitting: ref(false),
    error: ref(options.typesError ?? null),
    errorCode: ref(null),
    fieldErrors: ref({}),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {}),
    create: vi.fn(async () => null),
    update: vi.fn(async () => null),
    remove: vi.fn(async () => false),
    clearError: vi.fn()
  }

  obligationsMock.api = obligations
  typesMock.api = types

  return { obligations, types }
}

async function mountSection(options: {
  isOwner?: boolean
  items?: VehicleObligationItem[]
  pending?: boolean
  error?: string | null
  fieldErrors?: Record<string, string>
  types?: ObligationTypeItem[]
  typesPending?: boolean
  typesError?: string | null
} = {}) {
  const state = setupState(options)

  const wrapper = await mountSuspended(VehicleObligationsSection, {
    props: {
      vehicleId: VEHICLE_ID,
      isOwner: options.isOwner ?? true
    },
    route: false
  })

  await flush()

  return { wrapper, ...state }
}

async function flush(): Promise<void> {
  for (let index = 0; index < 5; index++) {
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

function section(wrapper: Awaited<ReturnType<typeof mountSection>>['wrapper']) {
  return wrapper.find('[aria-label="Kewajiban kendaraan"]')
}

function rows(wrapper: Awaited<ReturnType<typeof mountSection>>['wrapper']) {
  return section(wrapper).findAll('li')
}

function rowByTitle(
  wrapper: Awaited<ReturnType<typeof mountSection>>['wrapper'],
  title: string
) {
  return rows(wrapper).find(row => row.text().includes(title))
}

function rowButton(
  wrapper: Awaited<ReturnType<typeof mountSection>>['wrapper'],
  title: string,
  label: string
) {
  return rowByTitle(wrapper, title)?.findAll('button').find(button => button.text() === label)
}

function sectionButton(
  wrapper: Awaited<ReturnType<typeof mountSection>>['wrapper'],
  label: string
) {
  return section(wrapper).findAll('button').find(button => button.text() === label)
}

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

function bodyInput(selector: string): DOMWrapper<Element> {
  return new DOMWrapper(document.body.querySelector(selector) as Element)
}

beforeEach(() => {
  toastMock.add.mockClear()
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('kewajiban section — daftar dan state', () => {
  it('menampilkan loading saat daftar belum termuat', async () => {
    const { wrapper } = await mountSection({ items: [], pending: true })

    expect(section(wrapper).find('[aria-label="Memuat kewajiban"]').exists()).toBe(true)
  })

  it('empty state jujur dengan CTA untuk owner', async () => {
    const { wrapper } = await mountSection({ items: [] })

    expect(section(wrapper).text()).toContain('Belum ada kewajiban untuk kendaraan ini.')
    expect(sectionButton(wrapper, 'Tambah Kewajiban')).toBeTruthy()
  })

  it('error memuat menampilkan alert + Coba lagi memanggil refresh', async () => {
    const { wrapper, obligations } = await mountSection({
      items: [],
      error: 'Server error.'
    })

    expect(section(wrapper).text()).toContain('Kewajiban belum dapat dimuat.')
    expect(section(wrapper).text()).toContain('Server error.')

    await sectionButton(wrapper, 'Coba lagi')!.trigger('click')

    expect(obligations.refresh).toHaveBeenCalledTimes(1)
  })

  it('menampilkan jenis, judul, due date, nominal, dan status administratif', async () => {
    const { wrapper } = await mountSection({ items: [obligationItem()] })
    const text = section(wrapper).text()

    expect(text).toContain('Pajak Kendaraan')
    expect(text).toContain('Bawaan')
    expect(text).toContain('Pajak tahunan')
    expect(text).toContain('Jatuh tempo')
    expect(text).toContain('250.000')
    expect(text).toContain('Aktif')
  })

  it('status inactive tampil konsisten tanpa status pembayaran', async () => {
    const { wrapper } = await mountSection({
      items: [obligationItem({ status: 'inactive' })]
    })

    expect(section(wrapper).text()).toContain('Tidak aktif')
    expect(section(wrapper).text()).not.toContain('Lunas')
    expect(section(wrapper).text()).not.toContain('Dibayar')
  })

  it('field opsional tidak ditampilkan saat null', async () => {
    const { wrapper } = await mountSection({
      items: [obligationItem({ issued_date: null, amount: null })]
    })
    const rowText = rowByTitle(wrapper, 'Pajak tahunan')!.text()

    expect(rowText).not.toContain('Terbit')
    expect(rowText).not.toContain('Rp')
  })

  it('due date lewat hanya menjadi konteks tanggal, status tetap dari backend', async () => {
    const { wrapper } = await mountSection({
      items: [obligationItem({ due_date: '2020-01-01', status: 'active' })]
    })
    const rowText = rowByTitle(wrapper, 'Pajak tahunan')!.text()

    expect(rowText).toContain('Tanggal sudah lewat')
    expect(rowText).toContain('Aktif')
    expect(rowText).not.toContain('Terlambat')
    expect(rowText).not.toContain('Overdue')
  })

  it('detail inline menampilkan deskripsi, jenis, status, dan field opsional', async () => {
    const { wrapper } = await mountSection({ items: [obligationItem()] })

    await rowButton(wrapper, 'Pajak tahunan', 'Lihat detail')!.trigger('click')
    await flush()

    const rowText = rowByTitle(wrapper, 'Pajak tahunan')!.text()

    expect(rowText).toContain('Pajak kendaraan tahunan')
    expect(rowText).toContain('Status administratif')
    expect(rowText).toContain('Pajak Kendaraan (Bawaan)')
    expect(rowText).toContain('250.000')

    await rowButton(wrapper, 'Pajak tahunan', 'Tutup detail')!.trigger('click')
    await flush()

    expect(rowByTitle(wrapper, 'Pajak tahunan')!.text()).not.toContain('Pajak kendaraan tahunan')
  })

  it('member hanya dapat melihat — tanpa aksi pengelolaan', async () => {
    const { wrapper } = await mountSection({ isOwner: false, items: [obligationItem()] })

    expect(sectionButton(wrapper, 'Tambah Kewajiban')).toBeUndefined()
    expect(sectionButton(wrapper, 'Kelola Jenis')).toBeUndefined()
    expect(rowButton(wrapper, 'Pajak tahunan', 'Ubah')).toBeUndefined()
    expect(rowButton(wrapper, 'Pajak tahunan', 'Hapus')).toBeUndefined()
    expect(rowButton(wrapper, 'Pajak tahunan', 'Lihat detail')).toBeTruthy()
    expect(section(wrapper).text()).toContain('kewajiban hanya dapat dilihat')
  })
})

describe('kewajiban section — create/edit', () => {
  it('owner membuat kewajiban dan daftar diperbarui setelah server sukses', async () => {
    const { wrapper, obligations } = await mountSection({ items: [] })
    const created = obligationItem({ title: 'STNK 2026', amount: '150000.00', due_date: '2026-12-31' })

    obligations.create.mockImplementation(async () => {
      obligations.items.value = [created]

      return created
    })

    await sectionButton(wrapper, 'Tambah Kewajiban')!.trigger('click')
    await flush()

    expect(bodyText()).toContain('Tambah kewajiban')

    const modal = wrapper.findComponent(VehicleObligationFormModal)
    const typeSelect = modal.findAllComponents(USelect)[0]!

    typeSelect.vm.$emit('update:modelValue', SYSTEM_ID)
    await flush()

    await bodyInput('#vehicle-obligation-title').setValue('STNK 2026')
    await bodyInput('#vehicle-obligation-due-date').setValue('2026-12-31')
    await bodyInput('#vehicle-obligation-amount').setValue('150000')
    await bodyButton('Tambah').trigger('click')
    await flush()

    expect(obligations.create).toHaveBeenCalledWith({
      obligation_type_id: SYSTEM_ID,
      title: 'STNK 2026',
      description: '',
      issued_date: '',
      due_date: '2026-12-31',
      amount: '150000',
      status: 'active'
    })
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Kewajiban ditambah' })
    )
    expect(section(wrapper).text()).toContain('STNK 2026')
  })

  it('validasi klien: jenis, judul, dan due date wajib — tidak memanggil create', async () => {
    const { wrapper, obligations } = await mountSection({ items: [] })

    await sectionButton(wrapper, 'Tambah Kewajiban')!.trigger('click')
    await flush()
    await bodyButton('Tambah').trigger('click')
    await flush()

    expect(obligations.create).not.toHaveBeenCalled()
    expect(bodyText()).toContain('Pilih jenis kewajiban.')
    expect(bodyText()).toContain('Judul wajib diisi.')
    expect(bodyText()).toContain('Tanggal jatuh tempo wajib diisi.')
  })

  it('nominal negatif ditolak klien sebelum request', async () => {
    const { wrapper, obligations } = await mountSection({ items: [] })

    await sectionButton(wrapper, 'Tambah Kewajiban')!.trigger('click')
    await flush()

    const modal = wrapper.findComponent(VehicleObligationFormModal)

    modal.findAllComponents(USelect)[0]!.vm.$emit('update:modelValue', SYSTEM_ID)
    await flush()

    await bodyInput('#vehicle-obligation-title').setValue('Pajak')
    await bodyInput('#vehicle-obligation-due-date').setValue('2026-12-31')
    await bodyInput('#vehicle-obligation-amount').setValue('-1')
    await bodyButton('Tambah').trigger('click')
    await flush()

    expect(obligations.create).not.toHaveBeenCalled()
    expect(bodyText()).toContain('Nominal harus berupa angka 0 atau lebih')
  })

  it('validation error server ditampilkan dan input pengguna dipertahankan', async () => {
    const { wrapper, obligations } = await mountSection({ items: [] })

    obligations.create.mockImplementation(async () => {
      obligations.error.value = 'Kolom judul wajib diisi.'
      obligations.fieldErrors.value = { title: 'Kolom judul wajib diisi.' }

      return null
    })

    await sectionButton(wrapper, 'Tambah Kewajiban')!.trigger('click')
    await flush()

    const modal = wrapper.findComponent(VehicleObligationFormModal)

    modal.findAllComponents(USelect)[0]!.vm.$emit('update:modelValue', SYSTEM_ID)
    await flush()

    await bodyInput('#vehicle-obligation-title').setValue('Pajak')
    await bodyInput('#vehicle-obligation-due-date').setValue('2026-12-31')
    await bodyButton('Tambah').trigger('click')
    await flush()

    expect(obligations.create).toHaveBeenCalledTimes(1)
    expect(bodyText()).toContain('Data belum dapat disimpan.')
    expect(bodyText()).toContain('Kolom judul wajib diisi.')
    expect((document.body.querySelector('#vehicle-obligation-title') as HTMLInputElement).value).toBe('Pajak')
    expect(toastMock.add).not.toHaveBeenCalled()
  })

  it('edit terisi data record, menyediakan status, dan mengirim update ke record yang sama', async () => {
    const { wrapper, obligations } = await mountSection({
      items: [obligationItem({ status: 'inactive' })]
    })

    await rowButton(wrapper, 'Pajak tahunan', 'Ubah')!.trigger('click')
    await flush()

    expect(bodyText()).toContain('Ubah kewajiban')
    expect((document.body.querySelector('#vehicle-obligation-title') as HTMLInputElement).value).toBe('Pajak tahunan')
    expect((document.body.querySelector('#vehicle-obligation-due-date') as HTMLInputElement).value).toBe('2026-11-30')
    expect((document.body.querySelector('#vehicle-obligation-amount') as HTMLInputElement).value).toBe('250000.00')

    const modal = wrapper.findComponent(VehicleObligationFormModal)
    const selects = modal.findAllComponents(USelect)

    expect((selects[0]!.props() as unknown as Record<string, unknown>).modelValue).toBe(SYSTEM_ID)
    expect((selects[1]!.props() as unknown as Record<string, unknown>).modelValue).toBe('inactive')

    obligations.update.mockImplementation(async () => {
      const updated = obligationItem({ status: 'active', title: 'Pajak tahunan baru' })

      obligations.items.value = [updated]

      return updated
    })

    selects[1]!.vm.$emit('update:modelValue', 'active')
    await flush()
    await bodyInput('#vehicle-obligation-title').setValue('Pajak tahunan baru')
    await bodyButton('Simpan').trigger('click')
    await flush()

    expect(obligations.update).toHaveBeenCalledWith(OBLIGATION_ID, {
      obligation_type_id: SYSTEM_ID,
      title: 'Pajak tahunan baru',
      description: 'Pajak kendaraan tahunan',
      issued_date: '2026-10-01',
      due_date: '2026-11-30',
      amount: '250000.00',
      status: 'active'
    })
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Kewajiban diubah' })
    )
    expect(section(wrapper).text()).toContain('Pajak tahunan baru')
  })

  it('submit dinonaktifkan saat mutation berjalan (anti double submit)', async () => {
    const { wrapper, obligations } = await mountSection({ items: [] })

    await sectionButton(wrapper, 'Tambah Kewajiban')!.trigger('click')
    await flush()

    obligations.submitting.value = true
    await flush()

    expect(bodyButton('Tambah').attributes('disabled')).toBeDefined()
  })
})

describe('kewajiban section — delete', () => {
  it('hapus dua langkah dan hanya menghapus setelah konfirmasi server', async () => {
    const { wrapper, obligations } = await mountSection({ items: [obligationItem()] })

    obligations.remove.mockImplementation(async () => {
      obligations.items.value = []

      return true
    })

    await rowButton(wrapper, 'Pajak tahunan', 'Hapus')!.trigger('click')
    await flush()

    expect(section(wrapper).text()).toContain('Hapus kewajiban "Pajak tahunan"?')
    expect(obligations.remove).not.toHaveBeenCalled()

    await rowButton(wrapper, 'Pajak tahunan', 'Ya, hapus')!.trigger('click')
    await flush()

    expect(obligations.remove).toHaveBeenCalledWith(OBLIGATION_ID)
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Kewajiban dihapus' })
    )
    expect(section(wrapper).text()).toContain('Belum ada kewajiban untuk kendaraan ini.')
  })

  it('hapus gagal mempertahankan record dan menampilkan error tanpa sukses', async () => {
    const { wrapper, obligations } = await mountSection({ items: [obligationItem()] })

    obligations.remove.mockImplementation(async () => {
      obligations.error.value = 'Kewajiban kendaraan tidak ditemukan.'

      return false
    })

    await rowButton(wrapper, 'Pajak tahunan', 'Hapus')!.trigger('click')
    await flush()
    await rowButton(wrapper, 'Pajak tahunan', 'Ya, hapus')!.trigger('click')
    await flush()

    expect(rowByTitle(wrapper, 'Pajak tahunan')).toBeTruthy()
    expect(section(wrapper).text()).toContain('Kewajiban kendaraan tidak ditemukan.')
    expect(toastMock.add).not.toHaveBeenCalled()
  })
})

describe('kewajiban section — jenis kewajiban', () => {
  it('modal jenis memisahkan bawaan dan custom; bawaan tanpa aksi ubah/hapus', async () => {
    const { wrapper } = await mountSection({ items: [obligationItem()] })

    await sectionButton(wrapper, 'Kelola Jenis')!.trigger('click')
    await flush()

    const systemSection = document.body.querySelector('[aria-label="Jenis bawaan"]')!
    const customSection = document.body.querySelector('[aria-label="Jenis custom"]')!

    expect(systemSection.textContent).toContain('Pajak Kendaraan')
    expect(systemSection.textContent).toContain('Bawaan')
    expect(systemSection.querySelectorAll('button')).toHaveLength(0)

    expect(customSection.textContent).toContain('Asuransi')
    expect(Array.from(customSection.querySelectorAll('button')).map(button => button.textContent?.trim()))
      .toEqual(expect.arrayContaining(['Ubah', 'Hapus']))
  })

  it('membuat jenis custom melalui endpoint dan menampilkan hasil katalog', async () => {
    const { wrapper, types } = await mountSection({ items: [] })

    await sectionButton(wrapper, 'Kelola Jenis')!.trigger('click')
    await flush()

    await bodyInput('#obligation-type-name').setValue('Asuransi kendaraan')
    await bodyButton('Tambah').trigger('click')
    await flush()

    expect(types.create).toHaveBeenCalledWith('Asuransi kendaraan')
  })

  it('rename hanya ditawarkan untuk custom dan mengirim PATCH', async () => {
    const { wrapper, types } = await mountSection({ items: [] })

    await sectionButton(wrapper, 'Kelola Jenis')!.trigger('click')
    await flush()

    const customSection = document.body.querySelector('[aria-label="Jenis custom"]')!
    const renameButton = Array.from(customSection.querySelectorAll('button'))
      .find(button => button.textContent?.trim() === 'Ubah')!

    renameButton.click()
    await flush()

    expect((bodyInput(`#obligation-type-rename-${CUSTOM_ID}`).element as HTMLInputElement).value).toBe('Asuransi')

    await bodyInput(`#obligation-type-rename-${CUSTOM_ID}`).setValue('Asuransi kendaraan')
    await flush()

    await bodyButton('Simpan').trigger('click')
    await flush()

    expect(types.update).toHaveBeenCalledWith(CUSTOM_ID, 'Asuransi kendaraan')
  })

  it('hapus jenis custom dua langkah; error IN_USE mempertahankan data', async () => {
    const { wrapper, types } = await mountSection({ items: [] })

    types.remove.mockImplementation(async () => {
      types.error.value = 'Jenis ini masih dipakai kewajiban sehingga tidak dapat dihapus.'

      return false
    })

    await sectionButton(wrapper, 'Kelola Jenis')!.trigger('click')
    await flush()

    const customSection = document.body.querySelector('[aria-label="Jenis custom"]')!
    const deleteButton = Array.from(customSection.querySelectorAll('button'))
      .find(button => button.textContent?.trim() === 'Hapus')!

    deleteButton.click()
    await flush()

    expect(bodyText()).toContain('Hapus jenis "Asuransi"?')

    await bodyButton('Ya, hapus').trigger('click')
    await flush()

    expect(types.remove).toHaveBeenCalledWith(CUSTOM_ID)
    expect(bodyText()).toContain('Jenis ini masih dipakai kewajiban')
    expect(document.body.textContent).toContain('Asuransi')
  })

  it('tipe sistem tidak pernah memanggil update/delete dari UI', async () => {
    const { wrapper, types } = await mountSection({ items: [] })

    await sectionButton(wrapper, 'Kelola Jenis')!.trigger('click')
    await flush()

    const systemSection = document.body.querySelector('[aria-label="Jenis bawaan"]')!

    expect(systemSection.querySelectorAll('button')).toHaveLength(0)
    expect(types.update).not.toHaveBeenCalled()
    expect(types.remove).not.toHaveBeenCalled()
  })
})
