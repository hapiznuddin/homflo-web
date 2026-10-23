<script setup lang="ts">
import type { AssetFormValues, AssetItem } from '~/types/assets'
import { normalizeAmountInput } from '~/utils/transactions'

interface Props {
  open: boolean
  editing: AssetItem | null
  submitting: boolean
  error: string | null
  fieldErrors: Record<string, string>
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [open: boolean]
  'submit': [values: AssetFormValues]
}>()

const modalOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const form = reactive<AssetFormValues>({
  name: '',
  description: '',
  location: '',
  acquired_on: '',
  acquisition_cost: ''
})

// Validasi klien hanya untuk bantuan cepat; backend tetap otoritas.
const localErrors = ref<Record<string, string>>({})

function clearLocalErrors(): void {
  localErrors.value = {}
}

function resetForm(): void {
  form.name = props.editing?.name ?? ''
  form.description = props.editing?.description ?? ''
  form.location = props.editing?.location ?? ''
  form.acquired_on = props.editing?.acquired_on ?? ''
  form.acquisition_cost = props.editing?.acquisition_cost ?? ''
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

function costError(): string | undefined {
  return localErrors.value.acquisition_cost ?? props.fieldErrors.acquisition_cost
}

function onSubmit(): void {
  clearLocalErrors()

  let valid = true

  if (form.name.trim() === '') {
    localErrors.value.name = 'Nama aset wajib diisi.'
    valid = false
  }

  const cost = form.acquisition_cost.trim()

  if (cost !== '' && normalizeAmountInput(cost) === null) {
    localErrors.value.acquisition_cost = 'Biaya perolehan harus berupa angka, mis. 4500000 atau 4500000,50.'
    valid = false
  }

  if (valid) {
    emit('submit', { ...form })
  }
}
</script>

<template>
  <UModal v-model:open="modalOpen" :title="props.editing ? 'Ubah aset' : 'Tambah aset'">
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
          <label for="asset-name" class="mb-1 block text-sm font-medium">
            Nama <span class="font-normal text-muted">(wajib)</span>
          </label>
          <UInput
            id="asset-name"
            v-model="form.name"
            placeholder="cth. Kulkas dapur"
            maxlength="255"
            autocomplete="off"
            class="w-full"
          />
          <p v-if="nameError()" class="mt-1 text-xs text-error">{{ nameError() }}</p>
        </div>

        <div>
          <label for="asset-description" class="mb-1 block text-sm font-medium">Deskripsi</label>
          <textarea
            id="asset-description"
            v-model="form.description"
            rows="3"
            maxlength="5000"
            placeholder="Catatan tambahan tentang aset ini (opsional)"
            class="w-full rounded-md border border-input bg-background p-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p v-if="props.fieldErrors.description" class="mt-1 text-xs text-error">
            {{ props.fieldErrors.description }}
          </p>
        </div>

        <div>
          <label for="asset-location" class="mb-1 block text-sm font-medium">Lokasi</label>
          <UInput
            id="asset-location"
            v-model="form.location"
            placeholder="cth. Dapur"
            maxlength="255"
            autocomplete="off"
            class="w-full"
          />
          <p v-if="props.fieldErrors.location" class="mt-1 text-xs text-error">
            {{ props.fieldErrors.location }}
          </p>
        </div>

        <div>
          <label for="asset-acquired-on" class="mb-1 block text-sm font-medium">Tanggal perolehan</label>
          <UInput id="asset-acquired-on" v-model="form.acquired_on" type="date" class="w-full" />
          <p v-if="props.fieldErrors.acquired_on" class="mt-1 text-xs text-error">
            {{ props.fieldErrors.acquired_on }}
          </p>
        </div>

        <div>
          <label for="asset-acquisition-cost" class="mb-1 block text-sm font-medium">Biaya perolehan (Rp)</label>
          <UInput
            id="asset-acquisition-cost"
            v-model="form.acquisition_cost"
            inputmode="decimal"
            placeholder="cth. 4500000"
            autocomplete="off"
            class="w-full"
          />
          <p v-if="costError()" class="mt-1 text-xs text-error">{{ costError() }}</p>
          <p class="mt-1 text-xs text-muted">Kosongkan bila biaya perolehan tidak diketahui.</p>
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
