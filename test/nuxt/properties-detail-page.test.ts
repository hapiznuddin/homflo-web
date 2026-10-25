import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import USelect from '@nuxt/ui/components/Select.vue'
import { DOMWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import PropertyFormModal from '~/components/properties/PropertyFormModal.vue'
import type { PropertyItem } from '~/types/properties'
import PropertyDetailPage from '~/pages/properties/[id].vue'

const PROPERTY_ID = '01J0PROPERTY00000000000001'

const authMock = vi.hoisted(() => ({
  household: { value: { id: 'h1', name: 'Rumah Budi', role: 'owner' } },
  isHouseholdOwner: { value: true },
  isEmailVerified: { value: true },
  onboarding: { value: { required: false } },
  bootstrap: vi.fn(async () => 'authenticated'),
  logout: vi.fn()
}))

mockNuxtImport('useAuth', () => () => authMock)

const toastMock = vi.hoisted(() => ({ add: vi.fn() }))

mockNuxtImport('useToast', () => () => toastMock)

interface MockPropertiesApi {
  items: Ref<PropertyItem[]>
  pending: Ref<boolean>
  submitting: Ref<boolean>
  error: Ref<string | null>
  errorCode: Ref<string | null>
  fieldErrors: Ref<Record<string, string>>
  load: ReturnType<typeof vi.fn>
  refresh: ReturnType<typeof vi.fn>
  fetchOne: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  archive: ReturnType<typeof vi.fn>
  restore: ReturnType<typeof vi.fn>
  clearError: ReturnType<typeof vi.fn>
}

const propertiesMock = vi.hoisted(() => ({ api: undefined as unknown }))

mockNuxtImport('useProperties', () => () => propertiesMock.api)

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

function setupPropertiesState(
  overrides: {
    fetchOne?: ReturnType<typeof vi.fn>
    update?: ReturnType<typeof vi.fn>
    archive?: ReturnType<typeof vi.fn>
    restore?: ReturnType<typeof vi.fn>
  } = {}
): MockPropertiesApi {
  const api: MockPropertiesApi = {
    items: ref([propertyItem()]),
    pending: ref(false),
    submitting: ref(false),
    error: ref(null),
    errorCode: ref(null),
    fieldErrors: ref({}),
    load: vi.fn(async () => {}),
    refresh: vi.fn(async () => {}),
    fetchOne: overrides.fetchOne ?? vi.fn(async () => propertyItem()),
    create: vi.fn(async () => propertyItem()),
    update: overrides.update ?? vi.fn(async () => propertyItem()),
    archive: overrides.archive ?? vi.fn(async () => propertyItem()),
    restore: overrides.restore ?? vi.fn(async () => propertyItem()),
    clearError: vi.fn()
  }

  propertiesMock.api = api

  return api
}

async function mountDetail() {
  return mountSuspended(PropertyDetailPage, { route: `/properties/${PROPERTY_ID}` })
}

async function flush(): Promise<void> {
  for (let index = 0; index < 5; index++) {
    await new Promise(resolve => setTimeout(resolve, 0))
  }
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

function actionButton(
  wrapper: Awaited<ReturnType<typeof mountDetail>>,
  label: string
) {
  return wrapper.findAll('button').find(button => button.text() === label)
}

beforeEach(() => {
  authMock.isHouseholdOwner.value = true
  authMock.logout.mockClear()
  toastMock.add.mockClear()
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('property detail page', () => {
  it('direct navigation memuat detail sesuai ID route dan menampilkan metadata', async () => {
    const state = setupPropertiesState()

    const wrapper = await mountDetail()

    expect(state.fetchOne).toHaveBeenCalledWith(PROPERTY_ID)

    const text = wrapper.text()

    expect(text).toContain('Rumah utama')
    expect(text).toContain('Rumah')
    expect(text).toContain('Milik sendiri')
    expect(text).toContain('Jl. Mawar 1')
    expect(text).toContain('Rumah keluarga')
    expect(wrapper.find('a[href="/properties"]').exists()).toBe(true)
    expect(authMock.logout).not.toHaveBeenCalled()
  })

  it('404 / PROPERTY_NOT_FOUND menampilkan state not-found tanpa retry', async () => {
    setupPropertiesState({
      fetchOne: vi.fn(async () => {
        throw {
          statusCode: 404,
          data: {
            data: {
              success: false,
              error: { code: 'PROPERTY_NOT_FOUND', message: 'Property not found.' }
            }
          }
        }
      })
    })

    const wrapper = await mountDetail()

    expect(wrapper.text()).toContain('Properti tidak ditemukan.')
    expect(wrapper.text()).not.toContain('Coba lagi')
    expect(wrapper.find('a[href="/properties"]').exists()).toBe(true)
  })

  it('error lain menampilkan alert + retry memuat ulang detail', async () => {
    const fetchOne = vi.fn()
      .mockRejectedValueOnce({ statusCode: 500, data: { message: 'Server error.' } })
      .mockResolvedValueOnce(propertyItem())

    setupPropertiesState({ fetchOne })

    const wrapper = await mountDetail()

    expect(wrapper.text()).toContain('Detail belum dapat dimuat.')
    expect(wrapper.text()).toContain('Server error.')

    const retry = wrapper.findAll('button').find(button => button.text().includes('Coba lagi'))

    await retry!.trigger('click')
    await flush()

    expect(fetchOne).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Rumah utama')
  })

  it('owner aktif melihat kontrol Ubah dan Arsipkan, bukan Aktifkan Kembali', async () => {
    setupPropertiesState()

    const wrapper = await mountDetail()

    expect(actionButton(wrapper, 'Ubah Properti')).toBeDefined()
    expect(actionButton(wrapper, 'Arsipkan Properti')).toBeDefined()
    expect(actionButton(wrapper, 'Aktifkan Kembali')).toBeUndefined()
  })

  it('member hanya membaca tanpa kontrol write', async () => {
    authMock.isHouseholdOwner.value = false
    setupPropertiesState()

    const wrapper = await mountDetail()

    expect(wrapper.text()).toContain('hanya dapat dilihat')
    expect(actionButton(wrapper, 'Ubah Properti')).toBeUndefined()
    expect(actionButton(wrapper, 'Arsipkan Properti')).toBeUndefined()
    expect(actionButton(wrapper, 'Aktifkan Kembali')).toBeUndefined()
  })

  it('form edit terisi data detail dan mengirim PATCH ke ID yang benar', async () => {
    const state = setupPropertiesState()

    const wrapper = await mountDetail()

    await actionButton(wrapper, 'Ubah Properti')!.trigger('click')
    await flush()

    expect(bodyText()).toContain('Ubah properti')

    const nameInput = document.body.querySelector('#property-name') as HTMLInputElement

    expect(nameInput.value).toBe('Rumah utama')
    expect((document.body.querySelector('#property-address') as HTMLTextAreaElement).value).toBe('Jl. Mawar 1')

    const selects = wrapper.findComponent(PropertyFormModal).findAllComponents(USelect)
    const typeSelectProps = selects[0]!.vm.$props as Record<string, unknown>
    const ownershipSelectProps = selects[1]!.vm.$props as Record<string, unknown>

    expect(typeSelectProps.modelValue).toBe('house')
    expect(ownershipSelectProps.modelValue).toBe('owned')

    await new DOMWrapper(nameInput).setValue('Rumah baru')
    await bodyButton('Simpan').trigger('click')
    await flush()

    expect(state.update).toHaveBeenCalledWith(PROPERTY_ID, {
      name: 'Rumah baru',
      type: 'house',
      address: 'Jl. Mawar 1',
      ownership_status: 'owned',
      description: 'Rumah keluarga',
      notes: 'Kunci di pos'
    })
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Properti diubah' })
    )
    expect(state.fetchOne.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('409 PROPERTY_ARCHIVED menutup form, memuat ulang detail, dan menampilkan arahan restore', async () => {
    let current = propertyItem()
    const fetchOne = vi.fn(async () => current)
    const state = setupPropertiesState({ fetchOne })

    state.update.mockImplementation(async () => {
      current = propertyItem({ archived_at: '2026-10-02T00:00:00.000000Z' })
      state.errorCode.value = 'PROPERTY_ARCHIVED'
      state.error.value = 'Properti sudah diarsipkan. Pulihkan terlebih dahulu sebelum mengubahnya.'

      return null
    })

    const wrapper = await mountDetail()

    await actionButton(wrapper, 'Ubah Properti')!.trigger('click')
    await flush()
    await bodyButton('Simpan').trigger('click')
    await flush()

    expect(state.update).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Properti sudah diarsipkan.')
    expect(wrapper.text()).toContain('Aktifkan Kembali')
    expect(actionButton(wrapper, 'Ubah Properti')).toBeUndefined()
    expect(toastMock.add).not.toHaveBeenCalled()
  })

  it('archive memerlukan konfirmasi, memanggil endpoint, dan memuat ulang state arsip', async () => {
    let current = propertyItem()
    const fetchOne = vi.fn(async () => current)
    const archive = vi.fn(async () => {
      current = propertyItem({ archived_at: '2026-10-02T00:00:00.000000Z' })

      return current
    })

    setupPropertiesState({ fetchOne, archive })

    const wrapper = await mountDetail()

    await actionButton(wrapper, 'Arsipkan Properti')!.trigger('click')
    await flush()

    expect(bodyText()).toContain('Arsipkan properti?')
    expect(archive).not.toHaveBeenCalled()

    await bodyButton('Ya, arsipkan').trigger('click')
    await flush()

    expect(archive).toHaveBeenCalledWith(PROPERTY_ID)
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Properti diarsipkan' })
    )
    expect(wrapper.text()).toContain('Aktifkan Kembali')
  })

  it('restore dari properti arsip memanggil endpoint dan kembali aktif', async () => {
    let current = propertyItem({ archived_at: '2026-10-02T00:00:00.000000Z' })
    const fetchOne = vi.fn(async () => current)
    const restore = vi.fn(async () => {
      current = propertyItem()

      return current
    })

    setupPropertiesState({ fetchOne, restore })

    const wrapper = await mountDetail()

    expect(wrapper.text()).toContain('Properti dalam arsip.')

    await actionButton(wrapper, 'Aktifkan Kembali')!.trigger('click')
    await flush()
    await bodyButton('Ya, aktifkan').trigger('click')
    await flush()

    expect(restore).toHaveBeenCalledWith(PROPERTY_ID)
    expect(toastMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Properti dikembalikan' })
    )
    expect(wrapper.text()).toContain('Arsipkan Properti')
  })
})
