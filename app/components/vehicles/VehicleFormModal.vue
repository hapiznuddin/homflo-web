<script setup lang="ts">
import type { VehicleFormValues, VehicleItem } from '~/types/vehicles'

interface Props {
  open: boolean
  editing: VehicleItem | null
  submitting: boolean
  error: string | null
  fieldErrors: Record<string, string>
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [open: boolean]
  'submit': [values: VehicleFormValues]
}>()

const modalOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const form = reactive<VehicleFormValues>({
  name: '',
  brand: '',
  model: '',
  year: '',
  license_plate: '',
  type: '',
  odometer: ''
})

// Validasi klien hanya untuk bantuan cepat; backend tetap otoritas.
const localErrors = ref<Record<string, string>>({})

function clearLocalErrors(): void {
  localErrors.value = {}
}

function resetForm(): void {
  form.name = props.editing?.name ?? ''
  form.brand = props.editing?.brand ?? ''
  form.model = props.editing?.model ?? ''
  form.year = props.editing?.year != null ? String(props.editing.year) : ''
  form.license_plate = props.editing?.plate_number ?? ''
  form.type = props.editing?.type ?? ''
  form.odometer = props.editing?.odometer != null ? String(props.editing.odometer) : ''
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

function nameError(): string | undefined {
  return localErrors.value.name ?? props.fieldErrors.name
}

function fieldError(field: string): string | undefined {
  return localErrors.value[field] ?? props.fieldErrors[field]
}

function validateInteger(raw: string, min: number, max: number): string | null {
  const value = raw.trim()

  if (value === '') {
    return null
  }

  if (!/^\d+$/.test(value)) {
    return 'Harus berupa bilangan bulat.'
  }

  const parsed = Number(value)

  return parsed < min || parsed > max ? 'Nilai di luar rentang yang diizinkan.' : null
}

function onSubmit(): void {
  clearLocalErrors()

  let valid = true

  if (form.name.trim() === '') {
    localErrors.value.name = 'Nama kendaraan wajib diisi.'
    valid = false
  }

  const yearError = validateInteger(form.year, 1900, 2100)

  if (yearError) {
    localErrors.value.year = yearError
    valid = false
  }

  const odometerError = validateInteger(form.odometer, 0, 2147483647)

  if (odometerError) {
    localErrors.value.odometer = odometerError
    valid = false
  }

  if (valid) {
    emit('submit', { ...form })
  }
}
</script>

<template>
  <UModal v-model:open="modalOpen" :title="props.editing ? 'Ubah kendaraan' : 'Tambah kendaraan'">
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
          <label for="vehicle-name" class="mb-1 block text-sm font-medium">
            Nama <span class="font-normal text-muted">(wajib)</span>
          </label>
          <UInput
            id="vehicle-name"
            v-model="form.name"
            placeholder="cth. Motor Beat"
            maxlength="255"
            autocomplete="off"
            class="w-full"
          />
          <p v-if="nameError()" class="mt-1 text-xs text-error">{{ nameError() }}</p>
        </div>

        <div>
          <label for="vehicle-brand" class="mb-1 block text-sm font-medium">Merek</label>
          <UInput
            id="vehicle-brand"
            v-model="form.brand"
            placeholder="cth. Honda"
            maxlength="255"
            autocomplete="off"
            class="w-full"
          />
          <p v-if="fieldError('brand')" class="mt-1 text-xs text-error">{{ fieldError('brand') }}</p>
        </div>

        <div>
          <label for="vehicle-model" class="mb-1 block text-sm font-medium">Model</label>
          <UInput
            id="vehicle-model"
            v-model="form.model"
            placeholder="cth. Beat FI"
            maxlength="255"
            autocomplete="off"
            class="w-full"
          />
          <p v-if="fieldError('model')" class="mt-1 text-xs text-error">{{ fieldError('model') }}</p>
        </div>

        <div>
          <label for="vehicle-year" class="mb-1 block text-sm font-medium">Tahun</label>
          <UInput
            id="vehicle-year"
            v-model="form.year"
            inputmode="numeric"
            placeholder="cth. 2019"
            autocomplete="off"
            class="w-full"
          />
          <p v-if="fieldError('year')" class="mt-1 text-xs text-error">{{ fieldError('year') }}</p>
        </div>

        <div>
          <label for="vehicle-plate" class="mb-1 block text-sm font-medium">Plat nomor</label>
          <UInput
            id="vehicle-plate"
            v-model="form.license_plate"
            placeholder="cth. B 1234 XYZ"
            maxlength="32"
            autocomplete="off"
            class="w-full"
          />
          <p v-if="fieldError('plate_number')" class="mt-1 text-xs text-error">
            {{ fieldError('plate_number') }}
          </p>
        </div>

        <div>
          <label for="vehicle-type" class="mb-1 block text-sm font-medium">Tipe kendaraan</label>
          <UInput
            id="vehicle-type"
            v-model="form.type"
            placeholder="cth. Sepeda motor"
            maxlength="255"
            autocomplete="off"
            class="w-full"
          />
          <p v-if="fieldError('type')" class="mt-1 text-xs text-error">{{ fieldError('type') }}</p>
        </div>

        <div>
          <label for="vehicle-odometer" class="mb-1 block text-sm font-medium">Odometer (km)</label>
          <UInput
            id="vehicle-odometer"
            v-model="form.odometer"
            inputmode="numeric"
            placeholder="cth. 24000"
            autocomplete="off"
            class="w-full"
          />
          <p v-if="fieldError('odometer')" class="mt-1 text-xs text-error">{{ fieldError('odometer') }}</p>
          <p class="mt-1 text-xs text-muted">Kosongkan bila belum dicatat.</p>
        </div>

        <div class="flex gap-2">
          <UButton type="button" color="neutral" variant="outline" block @click="close">Batal</UButton>
          <UButton type="submit" block :loading="props.submitting" :disabled="props.submitting">
            {{ props.editing ? 'Simpan' : 'Tambah' }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
