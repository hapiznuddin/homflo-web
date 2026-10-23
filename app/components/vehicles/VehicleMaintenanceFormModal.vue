<script setup lang="ts">
import type { VehicleMaintenanceFormValues, VehicleMaintenanceItem } from '~/types/vehicleMaintenance'

interface Props {
  open: boolean
  editing: VehicleMaintenanceItem | null
  submitting: boolean
  error: string | null
  fieldErrors: Record<string, string>
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [open: boolean]
  'submit': [values: VehicleMaintenanceFormValues]
}>()

const modalOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const form = reactive<VehicleMaintenanceFormValues>({
  title: '',
  description: '',
  scheduled_date: '',
  odometer: ''
})

// Validasi klien hanya untuk bantuan cepat; backend tetap otoritas.
const localErrors = ref<Record<string, string>>({})

function clearLocalErrors(): void {
  localErrors.value = {}
}

function resetForm(): void {
  form.title = props.editing?.title ?? ''
  form.description = props.editing?.description ?? ''
  form.scheduled_date = props.editing?.scheduled_date ?? ''
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

function titleError(): string | undefined {
  return localErrors.value.title ?? props.fieldErrors.title
}

function scheduledDateError(): string | undefined {
  return localErrors.value.scheduled_date ?? props.fieldErrors.scheduled_date
}

function odometerError(): string | undefined {
  return localErrors.value.odometer ?? props.fieldErrors.odometer
}

function descriptionError(): string | undefined {
  return props.fieldErrors.description
}

function onSubmit(): void {
  clearLocalErrors()

  let valid = true

  if (form.title.trim() === '') {
    localErrors.value.title = 'Judul wajib diisi.'
    valid = false
  }

  if (form.scheduled_date === '') {
    localErrors.value.scheduled_date = 'Tanggal jadwal wajib diisi.'
    valid = false
  }

  const odometer = form.odometer.trim()

  if (odometer !== '' && (!/^\d+$/.test(odometer) || Number(odometer) > 2147483647)) {
    localErrors.value.odometer = 'Odometer harus berupa bilangan bulat 0 atau lebih.'
    valid = false
  }

  if (valid) {
    emit('submit', { ...form })
  }
}
</script>

<template>
  <UModal v-model:open="modalOpen" :title="props.editing ? 'Ubah catatan servis' : 'Tambah catatan servis'">
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
          <label for="vehicle-maintenance-title" class="mb-1 block text-sm font-medium">
            Judul <span class="font-normal text-muted">(wajib)</span>
          </label>
          <UInput
            id="vehicle-maintenance-title"
            v-model="form.title"
            placeholder="cth. Servis rutin 50.000 km"
            maxlength="255"
            autocomplete="off"
            class="w-full"
          />
          <p v-if="titleError()" class="mt-1 text-xs text-error">{{ titleError() }}</p>
        </div>

        <div>
          <label for="vehicle-maintenance-scheduled-date" class="mb-1 block text-sm font-medium">
            Tanggal jadwal <span class="font-normal text-muted">(wajib)</span>
          </label>
          <UInput id="vehicle-maintenance-scheduled-date" v-model="form.scheduled_date" type="date" class="w-full" />
          <p v-if="scheduledDateError()" class="mt-1 text-xs text-error">{{ scheduledDateError() }}</p>
        </div>

        <div>
          <label for="vehicle-maintenance-odometer" class="mb-1 block text-sm font-medium">
            Odometer servis <span class="font-normal text-muted">(opsional)</span>
          </label>
          <UInput
            id="vehicle-maintenance-odometer"
            v-model="form.odometer"
            inputmode="numeric"
            placeholder="cth. 50000"
            autocomplete="off"
            class="w-full"
          />
          <p v-if="odometerError()" class="mt-1 text-xs text-error">{{ odometerError() }}</p>
          <p class="mt-1 text-xs text-muted">Kosongkan bila belum dicatat.</p>
        </div>

        <div>
          <label for="vehicle-maintenance-description" class="mb-1 block text-sm font-medium">
            Deskripsi <span class="font-normal text-muted">(opsional)</span>
          </label>
          <textarea
            id="vehicle-maintenance-description"
            v-model="form.description"
            rows="3"
            maxlength="5000"
            placeholder="Catatan tambahan tentang servis ini (opsional)"
            class="w-full rounded-md border border-input bg-background p-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p v-if="descriptionError()" class="mt-1 text-xs text-error">{{ descriptionError() }}</p>
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
