<script setup lang="ts">
import { defineEmits, defineProps, ref, watch } from 'vue'
import { useToast } from '~/composables/useToast'
import { useAuth } from '~/composables/useAuth'
import { useProperties } from '~/composables/useProperties'
import UButton from '~/components/ui/button/index.vue'
import UIcon from '~/components/ui/icon/index.vue'
import USkeleton from '~/components/ui/skeleton/index.vue'
import UInput from '~/components/ui/v-input/index.vue'
import USelect from '~/components/ui/v-select/index.vue'
import UForm from '~/components/ui/form/index.vue'

// Props
const props = defineProps({
  editing: {
    type: Object as () => PropertyItem | null,
    default: null
  }
})

const emits = defineEmits(['submit'])

const formOpen = ref(true)
const isEdit = computed(() => !!props.editing)
const auth = useAuth()
const properties = useProperties()
const { items, pending, submitting, error, fieldErrors } = properties
const toast = useToast()

// Form values
const form = ref({
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
]

const ownershipOptions = [
  { value: 'owned', label: 'Milik sendiri' },
  { value: 'rented', label: 'Disewa' }
}

// Watch form changes and sync with editing prop
watch(() => form.value, () => {
  // sync is handled by the submit handler
}, { deep: true })

async function onSubmit(): Promise<void> {
  if (props.editing) {
    // Edit mode
    const saved = await properties.update(props.editing.id, form.value)

    if (saved) {
      formOpen.value = false
      toast.add({
        title: 'Property diubah',
        description: 'Data tersimpan.',
        color: 'success'
      })
    }
  } else {
    // Create mode
    const saved = await properties.create(form.value)

    if (saved) {
      formOpen.value = false
      toast.add({
        title: 'Property ditambah',
        description: 'Data tersimpan.',
        color: 'success'
      })
    }
  }
}

<!-- no-watch -->
</script>

<template>
  <TransitionName :name="isEdit ? 'fade-right' : 'fade-left'">
    <div class="fixed inset-0 bg-black/30 z-50 hidden/flex items-center justify-center" @click.self="formOpen = false">
      <div class="relative bg-white rounded-2xl border border-default w-full sm:max-w-2xl mx-4 max-h-[90vh] overflow-y-auto shadow-lg" role="dialog" aria-label="Form Property">
        <div class="p-6 sm:p-8">
          <UForm>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <!-- Name -->
              <div>
                <UInput
                  v-model="form.name"
                  label="Nama Property"
                  :error="fieldErrors.name"
                  placeholder="Masukkan nama property"
                  required
                />
              </div>

              <!-- Type -->
              <div>
                <USelect
                  v-model="form.type"
                  :options="typeOptions"
                  label="Tipe Property"
                  :error="fieldErrors.type"
                  placeholder="Pilih tipe property"
                />
              </div>

              <!-- Address -->
              <div>
                <UInput
                  v-model="form.address"
                  label="Alamat"
                  :error="fieldErrors.address"
                  placeholder="Masukkan alamat lengkap"
                  required
                />
              </div>

              <!-- Ownership Status -->
              <div class="sm:col-span-2">
                <USelect
                  v-model="form.ownership_status"
                  :options="ownershipOptions"
                  label="Status Kepemilikan"
                  :error="fieldErrors.ownership_status"
                  placeholder="Pilih status kepemilikan"
                  required
                />
              </div>

              <!-- Description -->
              <div class="sm:col-span-2">
                <UInput
                  v-model="form.description"
                  label="Deskripsi"
                  :error="fieldErrors.description"
                  placeholder="Deskripsi opsional (maksimal 5000 karakter)"
                  rows={2}
                />
              </div>

              <!-- Notes -->
              <div class="sm:col-span-2">
                <UInput
                  v-model="form.notes"
                  label="Catatan"
                  :error="fieldErrors.notes"
                  placeholder="Catatan opsional (maksimal 5000 karakter)"
                  rows={2}
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
            :loading="submitting"
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
    </div>
  </TransitionName>
</template>