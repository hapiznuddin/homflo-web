<script setup lang="ts">
import { computed, defineEmits, defineProps, ref, watch } from 'vue'
import type { PropertyItem, PropertyFormValues } from '~/types/properties'
import UButton from '~/components/ui/button/index.vue'
import UForm from '~/components/ui/form/index.vue'
import UInput from '~/components/ui/v-input/index.vue'
import USelect from '~/components/ui/v-select/index.vue'

const props = withDefaults(defineProps<{
  editing: PropertyItem | null
  submitting: boolean
  error: string | null
  fieldErrors: Record<string, string>
}>(), {
  submitting: false,
  error: null,
  fieldErrors: () => ({})
})

// Local error message shown when create/update fails.
const localError = computed(() => props.error ?? null)

const emits = defineEmits<{ open: [value: boolean], submit: [values: PropertyFormValues] }>()

const isEdit = computed(() => !!props.editing)
const formOpen = ref(false)

const form = ref<PropertyFormValues>({
  name: props.editing?.name ?? '',
  type: props.editing?.type ?? '',
  address: props.editing?.address ?? '',
  ownership_status: props.editing?.ownership_status ?? '',
  description: props.editing?.description ?? '',
  notes: props.editing?.notes ?? ''
})

// Options
const typeOptions = [
  { value: 'house', label: 'Rumah' },
  { value: 'apartment', label: 'Apartemen' },
  { value: 'land', label: 'Tanah' },
  { value: 'shophouse', label: 'Ruko' },
  { value: 'other', label: 'Lainnya' }
] as const

const ownershipOptions = [
  { value: 'owned', label: 'Milik sendiri' },
  { value: 'rented', label: 'Disewa' }
] as const

watch(
  () => props.editing,
  (editing) => {
    if (editing) {
      formOpen.value = true
      form.value = {
        name: editing.name ?? '',
        type: editing.type ?? '',
        address: editing.address ?? '',
        ownership_status: editing.ownership_status ?? '',
        description: editing.description ?? '',
        notes: editing.notes ?? ''
      }
    }
  },
  { immediate: true }
)

async function onSubmit(): Promise<void> {
  emits('submit', form.value)
  formOpen.value = false
}

const typeOptionsUi = typeOptions
const ownershipOptionsUi = ownershipOptions
</script>

<template>
  <TransitionName :name="isEdit ? 'fade-right' : 'fade-left'">    <div
      class="fixed inset-0 bg-black/30 z-50 hidden items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Form Property"
      @click.self="formOpen = false"
    >
      <div class="relative bg-white rounded-2xl border border-default w-full sm:max-w-2xl mx-4 max-h-[90vh] overflow-y-auto shadow-lg">
        <div class="p-6 sm:p-8">
          <UForm>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <!-- Name -->
              <div>
                <UInput
                  v-model="form.name"
                  label="Nama Property"
                  :error="fieldErrors.name || localError"
                  placeholder="Masukkan nama property"
                  required
                />
              </div>

              <!-- Type -->
              <div>
                <USelect
                  v-model="form.type"
                  :options="typeOptionsUi"
                  label="Tipe Property"
                  :error="fieldErrors.type || localError"
                  placeholder="Pilih tipe property"
                />
              </div>

              <!-- Address -->
              <div>
                <UInput
                  v-model="form.address"
                  label="Alamat"
                  :error="fieldErrors.address || localError"
                  placeholder="Masukkan alamat lengkap"
                  required
                />
              </div>

              <!-- Ownership Status -->
              <div class="sm:col-span-2">
                <USelect
                  v-model="form.ownership_status"
                  :options="ownershipOptionsUi"
                  label="Status Kepemilikan"
                  :error="fieldErrors.ownership_status || localError"
                  placeholder="Pilih status kepemilikan"
                  required
                />
              </div>

              <!-- Description -->
              <div class="sm:col-span-2">
                <UInput
                  v-model="form.description"
                  label="Deskripsi"
                  placeholder="Deskripsi opsional (maksimal 5000 karakter)"
                  :error="fieldErrors.description || localError"
                  rows="2"
                />
              </div>

              <!-- Notes -->
              <div class="sm:col-span-2">
                <UInput
                  v-model="form.notes"
                  label="Catatan"
                  placeholder="Catatan opsional (maksimal 5000 karakter)"
                  :error="fieldErrors.notes || localError"
                  rows="2"
                />
              </div>

            </div>
          </UForm>
        </div>

        <!-- Header -->
        <div class="flex items-center justify-between px-6 sm:px-8 pb-6">
          <h2 v-if="isEdit" class="text-lg font-medium text-highlighted">
            Ubah Property
          </h2>
          <h2 v-else class="text-lg font-medium text-highlighted">
            Buat Property Baru
          </h2>
        </div>

        <!-- Actions -->
        <div class="flex justify-end px-6 sm:px-8 pt-3">
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            @click="formOpen = false"
          >
            Batal
          </UButton>
          <UButton
            color="primary"
            :loading="props.submitting"
            @click="onSubmit"
          >
            <template v-if="isEdit">
              Simpan Perubahan
            </template>
            <template v-else>
              Simpan Property
            </template>
          </UButton>
        </div>
      </div>
    </div>    </TransitionName>
</template>