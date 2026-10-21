<script setup lang="ts">
import type { CategoryItem } from '~/types/categories'
import type { BudgetFormValues, BudgetItem } from '~/types/budgets'
import { formatMonthLabel } from '~/utils/format'

interface Props {
  open: boolean
  editing: BudgetItem | null
  submitting: boolean
  fieldErrors: Record<string, string>
  categories: CategoryItem[]
  categoriesPending: boolean
  categoriesError: string | null
  defaultYear: number
  defaultMonth: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [open: boolean]
  'submit': [values: BudgetFormValues]
  'retry-categories': []
}>()

const modalOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const monthOptions = computed(() => {
  const year = Number.parseInt(form.year, 10)
  const months: Array<{ label: string, value: string }> = []

  for (let month = 1; month <= 12; month++) {
    months.push({
      label: Number.isInteger(year) ? formatMonthLabel(year, month) : `Bulan ${month}`,
      value: String(month)
    })
  }

  return months
})

const form = reactive<BudgetFormValues>({
  category_id: '',
  year: '',
  month: '',
  amount: ''
})

function resetForm(): void {
  form.category_id = props.editing?.category?.id ?? ''
  form.year = props.editing ? String(props.editing.year) : String(props.defaultYear)
  form.month = props.editing ? String(props.editing.month) : String(props.defaultMonth)
  // Prefill nominal tersimpan saat edit ("500000.00" lolos validasi
  // normalizeAmountInput — 2 desimal). Create tetap kosong (Phase 15.3.1).
  form.amount = props.editing?.amount ?? ''
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
  <UModal v-model:open="modalOpen" :title="props.editing ? 'Ubah anggaran' : 'Tambah anggaran'">
    <template #body>
      <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
        <div>
          <label for="bg-category" class="mb-1 block text-sm font-medium">Kategori</label>
          <USelect
            id="bg-category"
            v-model="form.category_id"
            :items="props.categories.map(category => ({ label: category.name, value: category.id }))"
            value-key="value"
            class="w-full"
            :loading="props.categoriesPending"
            :disabled="props.categoriesPending || props.categoriesError !== null"
            placeholder="Pilih kategori"
          />
          <p v-if="props.categoriesError" class="mt-1 text-xs text-error">
            {{ props.categoriesError }}
            <UButton variant="link" size="xs" class="px-1" @click="emit('retry-categories')">Coba lagi</UButton>
          </p>
          <p v-if="props.fieldErrors.category_id" class="mt-1 text-xs text-error">{{ props.fieldErrors.category_id }}</p>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="bg-month" class="mb-1 block text-sm font-medium">Bulan</label>
            <USelect
              id="bg-month"
              v-model="form.month"
              :items="monthOptions"
              value-key="value"
              class="w-full"
            />
            <p v-if="props.fieldErrors.month" class="mt-1 text-xs text-error">{{ props.fieldErrors.month }}</p>
          </div>
          <div>
            <label for="bg-year" class="mb-1 block text-sm font-medium">Tahun</label>
            <UInput
              id="bg-year"
              v-model="form.year"
              inputmode="numeric"
              placeholder="2026"
              autocomplete="off"
              class="w-full"
            />
            <p v-if="props.fieldErrors.year" class="mt-1 text-xs text-error">{{ props.fieldErrors.year }}</p>
          </div>
        </div>

        <div>
          <label for="bg-amount" class="mb-1 block text-sm font-medium">Target nominal (Rp)</label>
          <UInput
            id="bg-amount"
            v-model="form.amount"
            inputmode="decimal"
            placeholder="500000"
            autocomplete="off"
            class="w-full"
          />
          <p v-if="props.fieldErrors.amount" class="mt-1 text-xs text-error">{{ props.fieldErrors.amount }}</p>
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
