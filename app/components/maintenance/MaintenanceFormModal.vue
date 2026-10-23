<script setup lang="ts">
import type { AssetItem } from '~/types/assets'
import type { MaintenanceFormValues, MaintenanceItem } from '~/types/maintenance'
import { MAINTENANCE_PRIORITY_OPTIONS } from '~/utils/maintenance'

interface Props {
  open: boolean
  editing: MaintenanceItem | null
  submitting: boolean
  error: string | null
  fieldErrors: Record<string, string>
  /** Aset rumah tangga dari composable Assets yang sudah ada (sumber tunggal). */
  assets: AssetItem[]
  assetsPending: boolean
  assetsError: string | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [open: boolean]
  'submit': [values: MaintenanceFormValues]
  'retry-assets': []
}>()

const modalOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const form = reactive<MaintenanceFormValues>({
  asset_id: '',
  title: '',
  description: '',
  location: '',
  scheduled_date: '',
  priority: 'rutin'
})

// Validasi klien hanya untuk bantuan cepat; backend tetap otoritas.
const localErrors = ref<Record<string, string>>({})

const assetOptions = computed(() =>
  props.assets.map(asset => ({ label: asset.name, value: asset.id }))
)

// Tanpa aset tersedia, create tidak bisa memenuhi asset_id wajib.
const submitDisabled = computed(() => props.submitting || assetOptions.value.length === 0)

function clearLocalErrors(): void {
  localErrors.value = {}
}

function resetForm(): void {
  form.asset_id = props.editing?.asset_id ?? ''
  form.title = props.editing?.title ?? ''
  form.description = props.editing?.description ?? ''
  form.location = props.editing?.location ?? ''
  form.scheduled_date = props.editing?.scheduled_date ?? ''
  form.priority = props.editing?.priority ?? 'rutin'
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

function assetError(): string | undefined {
  return localErrors.value.asset_id ?? props.fieldErrors.asset_id
}

function titleError(): string | undefined {
  return localErrors.value.title ?? props.fieldErrors.title
}

function locationError(): string | undefined {
  return localErrors.value.location ?? props.fieldErrors.location
}

function scheduledDateError(): string | undefined {
  return localErrors.value.scheduled_date ?? props.fieldErrors.scheduled_date
}

function onSubmit(): void {
  clearLocalErrors()

  let valid = true

  if (form.asset_id === '') {
    localErrors.value.asset_id = 'Pilih aset terlebih dahulu.'
    valid = false
  }

  if (form.title.trim() === '') {
    localErrors.value.title = 'Judul wajib diisi.'
    valid = false
  }

  if (form.location.trim() === '') {
    localErrors.value.location = 'Lokasi wajib diisi.'
    valid = false
  }

  if (form.scheduled_date === '') {
    localErrors.value.scheduled_date = 'Tanggal jadwal wajib diisi.'
    valid = false
  }

  if (valid) {
    emit('submit', { ...form })
  }
}
</script>

<template>
  <UModal v-model:open="modalOpen" :title="props.editing ? 'Ubah perawatan' : 'Tambah perawatan'">
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
          <label for="maintenance-asset" class="mb-1 block text-sm font-medium">
            Aset <span class="font-normal text-muted">(wajib)</span>
          </label>
          <USelect
            id="maintenance-asset"
            v-model="form.asset_id"
            :items="assetOptions"
            value-key="value"
            class="w-full"
            :loading="props.assetsPending"
            :disabled="props.assetsPending || props.assetsError !== null"
            placeholder="Pilih aset"
          />
          <p v-if="props.assetsError" class="mt-1 text-xs text-error">
            {{ props.assetsError }}
            <UButton variant="link" size="xs" class="px-1" @click="emit('retry-assets')">Coba lagi</UButton>
          </p>
          <p
            v-else-if="!props.assetsPending && assetOptions.length === 0"
            class="mt-1 text-xs text-muted"
          >
            Belum ada aset rumah tangga. Tambahkan aset lebih dulu di halaman Aset.
          </p>
          <p v-if="assetError()" class="mt-1 text-xs text-error">{{ assetError() }}</p>
        </div>

        <div>
          <label for="maintenance-title" class="mb-1 block text-sm font-medium">
            Judul <span class="font-normal text-muted">(wajib)</span>
          </label>
          <UInput
            id="maintenance-title"
            v-model="form.title"
            placeholder="cth. Cuci AC kamar"
            maxlength="255"
            autocomplete="off"
            class="w-full"
          />
          <p v-if="titleError()" class="mt-1 text-xs text-error">{{ titleError() }}</p>
        </div>

        <div>
          <label for="maintenance-location" class="mb-1 block text-sm font-medium">
            Lokasi <span class="font-normal text-muted">(wajib)</span>
          </label>
          <UInput
            id="maintenance-location"
            v-model="form.location"
            placeholder="cth. Kamar utama"
            maxlength="255"
            autocomplete="off"
            class="w-full"
          />
          <p v-if="locationError()" class="mt-1 text-xs text-error">{{ locationError() }}</p>
        </div>

        <div>
          <label for="maintenance-scheduled-date" class="mb-1 block text-sm font-medium">
            Tanggal jadwal <span class="font-normal text-muted">(wajib)</span>
          </label>
          <UInput id="maintenance-scheduled-date" v-model="form.scheduled_date" type="date" class="w-full" />
          <p v-if="scheduledDateError()" class="mt-1 text-xs text-error">{{ scheduledDateError() }}</p>
        </div>

        <div>
          <label for="maintenance-priority" class="mb-1 block text-sm font-medium">Prioritas</label>
          <USelect
            id="maintenance-priority"
            v-model="form.priority"
            :items="MAINTENANCE_PRIORITY_OPTIONS"
            value-key="value"
            class="w-full"
          />
          <p v-if="props.fieldErrors.priority" class="mt-1 text-xs text-error">{{ props.fieldErrors.priority }}</p>
        </div>

        <div>
          <label for="maintenance-description" class="mb-1 block text-sm font-medium">
            Deskripsi <span class="font-normal text-muted">(opsional)</span>
          </label>
          <textarea
            id="maintenance-description"
            v-model="form.description"
            rows="3"
            maxlength="5000"
            placeholder="Catatan tambahan tentang perawatan ini (opsional)"
            class="w-full rounded-md border border-input bg-background p-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p v-if="props.fieldErrors.description" class="mt-1 text-xs text-error">
            {{ props.fieldErrors.description }}
          </p>
        </div>

        <div class="flex gap-2">
          <UButton type="button" color="neutral" variant="outline" block @click="close">Batal</UButton>
          <UButton type="submit" block :loading="props.submitting" :disabled="submitDisabled">
            {{ props.editing ? 'Simpan' : 'Tambah' }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
