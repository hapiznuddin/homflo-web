<script setup lang="ts">
import type {
  PropertyFormValues,
  PropertyItem
} from '~/types/properties'
import {
  PROPERTY_OWNERSHIP_OPTIONS,
  PROPERTY_TYPE_OPTIONS
} from '~/utils/properties'

interface Props {
  open: boolean
  editing: PropertyItem | null
  submitting: boolean
  error: string | null
  fieldErrors: Record<string, string>
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [open: boolean]
  'submit': [values: PropertyFormValues]
}>()

const modalOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const form = reactive<PropertyFormValues>({
  name: '',
  type: undefined,
  address: '',
  ownership_status: undefined,
  description: '',
  notes: ''
})

// Nilai awal undefined membuat placeholder tampil tanpa SelectItem bernilai
// string kosong (Reka UI menolak item dengan value '').

// Validasi klien hanya bantuan cepat; backend tetap otoritas.
const localErrors = ref<Record<string, string>>({})

function clearLocalErrors(): void {
  localErrors.value = {}
}

function resetForm(): void {
  form.name = props.editing?.name ?? ''
  form.type = props.editing?.type ?? undefined
  form.address = props.editing?.address ?? ''
  form.ownership_status = props.editing?.ownership_status ?? undefined
  form.description = props.editing?.description ?? ''
  form.notes = props.editing?.notes ?? ''
  clearLocalErrors()
}

watch(() => [props.open, props.editing] as const, ([open]) => {
  if (open) {
    resetForm()
  }
}, { immediate: true })

function close(): void {
  emit('update:open', false)
}

function fieldError(field: string): string | undefined {
  return localErrors.value[field] ?? props.fieldErrors[field]
}

function onSubmit(): void {
  clearLocalErrors()

  let valid = true

  if (form.name.trim() === '') {
    localErrors.value.name = 'Nama properti wajib diisi.'
    valid = false
  } else if (form.name.trim().length > 255) {
    localErrors.value.name = 'Nama properti maksimal 255 karakter.'
    valid = false
  }

  if (!form.type) {
    localErrors.value.type = 'Tipe properti wajib dipilih.'
    valid = false
  }

  if (form.address.trim() === '') {
    localErrors.value.address = 'Alamat wajib diisi.'
    valid = false
  } else if (form.address.trim().length > 500) {
    localErrors.value.address = 'Alamat maksimal 500 karakter.'
    valid = false
  }

  if (!form.ownership_status) {
    localErrors.value.ownership_status = 'Status kepemilikan wajib dipilih.'
    valid = false
  }

  if (form.description.trim().length > 5000) {
    localErrors.value.description = 'Deskripsi properti maksimal 5000 karakter.'
    valid = false
  }

  if (form.notes.trim().length > 5000) {
    localErrors.value.notes = 'Catatan properti maksimal 5000 karakter.'
    valid = false
  }

  if (valid) {
    emit('submit', { ...form })
  }
}
</script>

<template>
  <UModal
    v-model:open="modalOpen"
    :title="props.editing ? 'Ubah properti' : 'Tambah properti'"
  >
    <template #body>
      <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
        <UAlert
          v-if="props.error"
          color="error"
          variant="soft"
          title="Data belum dapat disimpan."
          :description="props.error"
        />

        <div>
          <label for="property-name" class="mb-1 block text-sm font-medium">
            Nama <span class="font-normal text-muted">(wajib)</span>
          </label>
          <UInput
            id="property-name"
            v-model="form.name"
            placeholder="cth. Rumah utama"
            maxlength="255"
            autocomplete="off"
            class="w-full"
          />
          <p v-if="fieldError('name')" class="mt-1 text-xs text-error">{{ fieldError('name') }}</p>
        </div>

        <div>
          <label for="property-type" class="mb-1 block text-sm font-medium">
            Tipe <span class="font-normal text-muted">(wajib)</span>
          </label>
          <USelect
            id="property-type"
            v-model="form.type"
            :items="PROPERTY_TYPE_OPTIONS"
            value-key="value"
            placeholder="Pilih tipe properti"
            class="w-full"
          />
          <p v-if="fieldError('type')" class="mt-1 text-xs text-error">{{ fieldError('type') }}</p>
        </div>

        <div>
          <label for="property-address" class="mb-1 block text-sm font-medium">
            Alamat <span class="font-normal text-muted">(wajib)</span>
          </label>
          <textarea
            id="property-address"
            v-model="form.address"
            rows="3"
            maxlength="500"
            placeholder="Alamat lengkap properti"
            class="w-full rounded-md border border-input bg-background p-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p v-if="fieldError('address')" class="mt-1 text-xs text-error">{{ fieldError('address') }}</p>
        </div>

        <div>
          <label for="property-ownership" class="mb-1 block text-sm font-medium">
            Status kepemilikan <span class="font-normal text-muted">(wajib)</span>
          </label>
          <USelect
            id="property-ownership"
            v-model="form.ownership_status"
            :items="PROPERTY_OWNERSHIP_OPTIONS"
            value-key="value"
            placeholder="Pilih status kepemilikan"
            class="w-full"
          />
          <p v-if="fieldError('ownership_status')" class="mt-1 text-xs text-error">
            {{ fieldError('ownership_status') }}
          </p>
        </div>

        <div>
          <label for="property-description" class="mb-1 block text-sm font-medium">
            Deskripsi <span class="font-normal text-muted">(opsional)</span>
          </label>
          <textarea
            id="property-description"
            v-model="form.description"
            rows="3"
            maxlength="5000"
            placeholder="Catatan tambahan tentang properti ini"
            class="w-full rounded-md border border-input bg-background p-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p v-if="fieldError('description')" class="mt-1 text-xs text-error">
            {{ fieldError('description') }}
          </p>
        </div>

        <div>
          <label for="property-notes" class="mb-1 block text-sm font-medium">
            Catatan <span class="font-normal text-muted">(opsional)</span>
          </label>
          <textarea
            id="property-notes"
            v-model="form.notes"
            rows="2"
            maxlength="5000"
            placeholder="Catatan internal, mis. nomor rekening listrik"
            class="w-full rounded-md border border-input bg-background p-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p v-if="fieldError('notes')" class="mt-1 text-xs text-error">{{ fieldError('notes') }}</p>
        </div>

        <div class="flex gap-2">
          <UButton type="button" color="neutral" variant="outline" block @click="close">
            Batal
          </UButton>
          <UButton
            type="submit"
            block
            :loading="props.submitting"
            :disabled="props.submitting"
          >
            {{ props.editing ? 'Simpan' : 'Tambah' }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
