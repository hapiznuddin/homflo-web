<script setup lang="ts">
import type { CategoryFormValues, CategoryItem } from '~/types/categories'

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
  icon: ''
})

function resetForm(): void {
  form.name = props.editing?.name ?? ''
  form.icon = props.editing?.icon ?? ''
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
          <label for="cat-icon" class="mb-1 block text-sm font-medium">Ikon <span class="font-normal text-muted">(opsional)</span></label>
          <div class="flex items-center gap-2">
            <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-elevated" aria-hidden="true">
              <UIcon :name="form.icon.trim() === '' ? 'i-lucide-tag' : form.icon.trim()" class="size-4.5 text-default" />
            </span>
            <UInput
              id="cat-icon"
              v-model="form.icon"
              placeholder="cth. i-lucide-tag"
              maxlength="255"
              autocomplete="off"
              spellcheck="false"
              class="w-full"
            />
          </div>
          <p class="mt-1 text-xs text-muted">Identifier ikon Lucide (mis. i-lucide-tag). Kosongkan bila tidak perlu ikon khusus.</p>
          <p v-if="props.fieldErrors.icon" class="mt-1 text-xs text-error">{{ props.fieldErrors.icon }}</p>
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
