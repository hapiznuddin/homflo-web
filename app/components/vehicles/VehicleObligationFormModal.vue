<script setup lang="ts">
import type {
  ObligationTypeItem,
  VehicleObligationFormValues,
  VehicleObligationItem
} from '~/types/vehicleObligations'
import {
  VEHICLE_OBLIGATION_STATUS_OPTIONS,
  obligationTypeOptions,
  parseObligationAmount
} from '~/utils/vehicleObligations'

interface Props {
  open: boolean
  editing: VehicleObligationItem | null
  submitting: boolean
  error: string | null
  fieldErrors: Record<string, string>
  /** Katalog jenis dari useObligationTypes (sumber tunggal). */
  types: ObligationTypeItem[]
  typesPending: boolean
  typesError: string | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [open: boolean]
  'submit': [values: VehicleObligationFormValues]
  'retry-types': []
}>()

const modalOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const form = reactive<VehicleObligationFormValues>({
  obligation_type_id: '',
  title: '',
  description: '',
  issued_date: '',
  due_date: '',
  amount: '',
  status: 'active'
})

// Validasi klien hanya untuk bantuan cepat; backend tetap otoritas.
const localErrors = ref<Record<string, string>>({})

const typeOptions = computed(() => obligationTypeOptions(props.types))

// Tanpa jenis tersedia, create/update tidak dapat memenuhi obligation_type_id.
// Galat refresh katalog tidak memblokir bila opsi lama masih tersedia; backend
// tetap memvalidasi tipe yang dipilih.
const submitDisabled = computed(
  () => props.submitting || props.typesPending || typeOptions.value.length === 0
)

function clearLocalErrors(): void {
  localErrors.value = {}
}

function resetForm(): void {
  form.obligation_type_id = props.editing?.obligation_type.id ?? ''
  form.title = props.editing?.title ?? ''
  form.description = props.editing?.description ?? ''
  form.issued_date = props.editing?.issued_date ?? ''
  form.due_date = props.editing?.due_date ?? ''
  form.amount = props.editing?.amount ?? ''
  form.status = props.editing?.status ?? 'active'
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

  if (form.obligation_type_id === '') {
    localErrors.value.obligation_type_id = 'Pilih jenis kewajiban.'
    valid = false
  }

  if (form.title.trim() === '') {
    localErrors.value.title = 'Judul wajib diisi.'
    valid = false
  }

  if (form.due_date === '') {
    localErrors.value.due_date = 'Tanggal jatuh tempo wajib diisi.'
    valid = false
  }

  if (parseObligationAmount(form.amount).invalid) {
    localErrors.value.amount = 'Nominal harus berupa angka 0 atau lebih (maksimal dua desimal).'
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
    :title="props.editing ? 'Ubah kewajiban' : 'Tambah kewajiban'"
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
          <label for="vehicle-obligation-type" class="mb-1 block text-sm font-medium">
            Jenis kewajiban <span class="font-normal text-muted">(wajib)</span>
          </label>
          <USelect
            id="vehicle-obligation-type"
            v-model="form.obligation_type_id"
            :items="typeOptions"
            value-key="value"
            class="w-full"
            :loading="props.typesPending"
            :disabled="props.typesPending || typeOptions.length === 0"
            placeholder="Pilih jenis kewajiban"
          />
          <p v-if="props.typesError" class="mt-1 text-xs text-error">
            {{ props.typesError }}
            <UButton variant="link" size="xs" class="px-1" @click="emit('retry-types')">
              Coba lagi
            </UButton>
          </p>
          <p
            v-else-if="!props.typesPending && typeOptions.length === 0"
            class="mt-1 text-xs text-muted"
          >
            Belum ada jenis kewajiban. Kelola jenis kewajiban terlebih dahulu.
          </p>
          <p v-if="fieldError('obligation_type_id')" class="mt-1 text-xs text-error">
            {{ fieldError('obligation_type_id') }}
          </p>
        </div>

        <div>
          <label for="vehicle-obligation-title" class="mb-1 block text-sm font-medium">
            Judul <span class="font-normal text-muted">(wajib)</span>
          </label>
          <UInput
            id="vehicle-obligation-title"
            v-model="form.title"
            placeholder="cth. Pajak tahunan 2026"
            maxlength="255"
            autocomplete="off"
            class="w-full"
          />
          <p v-if="fieldError('title')" class="mt-1 text-xs text-error">{{ fieldError('title') }}</p>
        </div>

        <div>
          <label for="vehicle-obligation-due-date" class="mb-1 block text-sm font-medium">
            Tanggal jatuh tempo <span class="font-normal text-muted">(wajib)</span>
          </label>
          <UInput
            id="vehicle-obligation-due-date"
            v-model="form.due_date"
            type="date"
            class="w-full"
          />
          <p v-if="fieldError('due_date')" class="mt-1 text-xs text-error">
            {{ fieldError('due_date') }}
          </p>
        </div>

        <div>
          <label for="vehicle-obligation-issued-date" class="mb-1 block text-sm font-medium">
            Tanggal terbit <span class="font-normal text-muted">(opsional)</span>
          </label>
          <UInput
            id="vehicle-obligation-issued-date"
            v-model="form.issued_date"
            type="date"
            class="w-full"
          />
          <p v-if="fieldError('issued_date')" class="mt-1 text-xs text-error">
            {{ fieldError('issued_date') }}
          </p>
        </div>

        <div>
          <label for="vehicle-obligation-amount" class="mb-1 block text-sm font-medium">
            Nominal <span class="font-normal text-muted">(opsional)</span>
          </label>
          <UInput
            id="vehicle-obligation-amount"
            v-model="form.amount"
            inputmode="decimal"
            placeholder="cth. 250000"
            autocomplete="off"
            class="w-full"
          />
          <p v-if="fieldError('amount')" class="mt-1 text-xs text-error">
            {{ fieldError('amount') }}
          </p>
          <p class="mt-1 text-xs text-muted">Kosongkan bila nominal belum dicatat.</p>
        </div>

        <div>
          <label for="vehicle-obligation-description" class="mb-1 block text-sm font-medium">
            Deskripsi <span class="font-normal text-muted">(opsional)</span>
          </label>
          <textarea
            id="vehicle-obligation-description"
            v-model="form.description"
            rows="3"
            maxlength="5000"
            placeholder="Catatan tambahan tentang kewajiban ini (opsional)"
            class="w-full rounded-md border border-input bg-background p-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p v-if="fieldError('description')" class="mt-1 text-xs text-error">
            {{ fieldError('description') }}
          </p>
        </div>

        <!-- Status administratif hanya tersedia saat edit; create selalu
             Active dari server. Tidak ada status pembayaran. -->
        <div v-if="props.editing">
          <label for="vehicle-obligation-status" class="mb-1 block text-sm font-medium">
            Status administratif
          </label>
          <USelect
            id="vehicle-obligation-status"
            v-model="form.status"
            :items="VEHICLE_OBLIGATION_STATUS_OPTIONS"
            value-key="value"
            class="w-full"
          />
          <p v-if="fieldError('status')" class="mt-1 text-xs text-error">
            {{ fieldError('status') }}
          </p>
        </div>

        <div class="flex gap-2">
          <UButton type="button" color="neutral" variant="outline" block @click="close">
            Batal
          </UButton>
          <UButton
            type="submit"
            block
            :loading="props.submitting"
            :disabled="submitDisabled"
          >
            {{ props.editing ? 'Simpan' : 'Tambah' }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
