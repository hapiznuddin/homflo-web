<script setup lang="ts">
import type { CategoryFormValues, CategoryItem } from '~/types/categories'

// Daftar icon Lucide yang tersedia untuk pemilihan kategori
const availableIcons = [
  'i-lucide-tag',
  'i-lucide-wallet',
  'i-lucide-receipt',
  'i-lucide-shopping-bag',
  'i-lucide-shopping-basket',
  'i-lucide-house',
  'i-lucide-car',
  'i-lucide-plus',
  'i-lucide-trending-up',
  'i-lucide-trending-down',
  'i-lucide-cooking-pot',
  'i-lucide-air-vent',
  'i-lucide-wifi',
  'i-lucide-droplets',
  'i-lucide-briefcase',
  'i-lucide-piggy-bank',
  'i-lucide-settings',
  'i-lucide-user',
  'i-lucide-calendar',
  'i-lucide-book',
  'i-lucide-star',
  'i-lucide-heart'
]

interface Props {
  open: boolean
  editing: CategoryItem | null
  submitting: boolean
  fieldErrors: Record<string, string>
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [open: boolean]
  'submit': [values: CategoryFormValues]
}>()

const modalOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const form = reactive<CategoryFormValues>({
  name: '',
  icon: 'i-lucide-tag',
  type: 'expense'
})

function resetForm(): void {
  const editingIcon = props.editing?.icon ?? 'i-lucide-tag'
  form.name = props.editing?.name ?? ''
  form.icon = props.editing?.icon ?? editingIcon
  form.type = props.editing?.type ?? 'expense'
}

watch(() => [props.open, props.editing] as const, ([open]) => {
  if (open) {
    resetForm()
  }
}, { immediate: true })

function close(): void {
  emit('update:open', false)
}

function onSubmit(): void {
  emit('submit', { ...form })
}
</script>

<template>
  <UModal v-model:open="modalOpen" :title="props.editing ? 'Ubah kategori' : 'Tambah kategori'">
    <template #body>
      <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
        <div>
          <label for="cat-name" class="mb-1 block text-sm font-medium">Nama</label>
          <UInput
            id="cat-name"
            v-model="form.name"
            placeholder="cth. Belanja dapur"
            maxlength="255"
            autocomplete="off"
            class="w-full"
          />
          <p v-if="props.fieldErrors.name" class="mt-1 text-xs text-error">{{ props.fieldErrors.name }}</p>
        </div>

        <div>
          <label for="cat-type" class="mb-1 block text-sm font-medium">Jenis <span class="font-normal text-muted">(wajib)</span></label>
          <select id="cat-type" v-model="form.type" class="w-full border rounded-md border-input bg-background p-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          <p v-if="props.fieldErrors.type" class="mt-1 text-xs text-error">{{ props.fieldErrors.type }}</p>
        </div>

        <div>
          <label for="cat-icon" class="mb-1 block text-sm font-medium">Ikon <span class="font-normal text-muted">(pilih di bawah)</span></label>
          <div class="grid grid-cols-3 gap-2 my-2">
            <button
                v-for="icon in availableIcons"
                :key="icon"
                :class="['group border rounded-md border-input bg-background p-1.5 text-sm flex items-center justify-center hover:text-primary', form.icon === icon && 'border-primary group-data-[state=checked]:bg-primary']"
                aria-pressed="false"
                aria-label="Pilih ikon "
                @click="form.icon = icon"
              >
              <UIcon :name="icon" class="size-4" aria-hidden="true" />
            </button>
          </div>

          <p v-if="props.fieldErrors.icon" class="mt-1 text-xs text-error">{{ props.fieldErrors.icon }}</p>
          <p class="mt-1 text-xs text-muted">Kosongkan pilihan di atas untuk tanpa ikon.</p>
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
