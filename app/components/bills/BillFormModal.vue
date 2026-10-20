<script setup lang="ts">
import type { CategoryItem } from '~/types/categories'
import type { BillFormValues, BillItem } from '~/types/bills'
import { BILL_FREQUENCY_OPTIONS } from '~/utils/bills'

interface Props {
  open: boolean
  editing: BillItem | null
  submitting: boolean
  error: string | null
  fieldErrors: Record<string, string>
  categories: CategoryItem[]
  categoriesPending: boolean
  categoriesError: string | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [open: boolean]
  'submit': [values: BillFormValues]
  'retry-categories': []
  'open-recurrence': [bill: BillItem]
}>()

const modalOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const form = reactive<BillFormValues>({
  title: '',
  amount: '',
  due_date: '',
  category_id: 'none',
  notes: '',
  recurrence: false,
  frequency: 'monthly'
})

// Bill bagian jadwal: PATCH /bills/{id} melarang kunci recurrence (D-07),
// jadi edit hanya memperbaiki baris ini + banner jalan ke panel jadwal.
const editingRecurrence = computed(() => props.editing?.recurrence ?? null)

// Form Bills hanya menawarkan kategori berjenis expense — kontrak backend
// fail-closed menolak expense-category lain termasuk kategori legacy
// tanpa tipe, jadi tidak ditawarkan agar tidak memicu 422 sia-sia.
const expenseCategories = computed(() => props.categories.filter(category => category.type === 'expense'))

function resetForm(): void {
  form.title = props.editing?.title ?? ''
  form.amount = props.editing?.amount ?? ''
  form.due_date = props.editing?.due_date ?? ''
  form.category_id = props.editing?.category?.id ?? 'none'
  form.notes = props.editing?.notes ?? ''
  form.recurrence = false
  form.frequency = 'monthly'
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
  emit('submit', { ...form, category_id: form.category_id === 'none' ? '' : form.category_id })
}
</script>

<template>
  <UModal v-model:open="modalOpen" :title="props.editing ? 'Ubah tagihan' : 'Tambah tagihan'">
    <template #body>
      <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
        <UAlert
          v-if="props.error"
          color="error"
          variant="soft"
          title="Tagihan belum dapat disimpan."
          :description="props.error"
        />

        <div v-if="props.editing && editingRecurrence" class="flex flex-col gap-2 rounded-2xl border border-default bg-elevated/50 p-3">
          <p class="text-sm text-muted">
            Bill ini bagian dari jadwal
            <span class="font-medium text-highlighted">{{ editingRecurrence.frequency }}</span>
            (periode ke-{{ editingRecurrence.due_day }}). Suntingan di bawah berlaku untuk baris ini saja;
            ubah frekuensi/jadwal lewat panel jadwal.
          </p>
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            icon="i-lucide-repeat"
            class="self-start"
            @click="emit('open-recurrence', props.editing)"
          >
            Ubah jadwal
          </UButton>
        </div>

        <div>
          <label for="bill-title" class="mb-1 block text-sm font-medium">Judul</label>
          <UInput
            id="bill-title"
            v-model="form.title"
            placeholder="cth. Tagihan Listrik"
            maxlength="255"
            autocomplete="off"
            class="w-full"
          />
          <p v-if="props.fieldErrors.title" class="mt-1 text-xs text-error">{{ props.fieldErrors.title }}</p>
        </div>

        <div>
          <label for="bill-amount" class="mb-1 block text-sm font-medium">Nominal (Rp)</label>
          <UInput
            id="bill-amount"
            v-model="form.amount"
            inputmode="decimal"
            placeholder="150000"
            autocomplete="off"
            class="w-full"
          />
          <p v-if="props.fieldErrors.amount" class="mt-1 text-xs text-error">{{ props.fieldErrors.amount }}</p>
        </div>

        <div>
          <label for="bill-due-date" class="mb-1 block text-sm font-medium">
            Jatuh tempo <span v-if="!form.recurrence || props.editing" class="font-normal text-muted">(opsional)</span>
          </label>
          <UInput id="bill-due-date" v-model="form.due_date" type="date" class="w-full" />
          <p v-if="form.recurrence && !props.editing" class="mt-1 text-xs text-muted">
            Tanggal jatuh tempo menjadi jangkal tiap periode (hari dalam bulan dipakai sebagai tanggal jatuh tempo).
          </p>
          <p v-if="props.fieldErrors.due_date" class="mt-1 text-xs text-error">{{ props.fieldErrors.due_date }}</p>
        </div>

        <div v-if="!props.editing">
          <div class="flex items-center justify-between gap-3">
            <label for="bill-recurrence" class="text-sm font-medium">Jadwalkan berulang</label>
            <USwitch id="bill-recurrence" v-model="form.recurrence" aria-label="Jadwalkan berulang" />
          </div>
          <p class="mt-1 text-xs text-muted">
            Backend membuat 12 periode tagihan sekaligus (D-02) — tiap periode tampil sebagai tagihan biasa.
          </p>

          <div v-if="form.recurrence" class="mt-3">
            <label for="bill-frequency" class="mb-1 block text-sm font-medium">Frekuensi</label>
            <USelect
              id="bill-frequency"
              v-model="form.frequency"
              :items="BILL_FREQUENCY_OPTIONS"
              value-key="value"
              class="w-full"
            />
            <p v-if="props.fieldErrors['recurrence.frequency']" class="mt-1 text-xs text-error">
              {{ props.fieldErrors['recurrence.frequency'] }}
            </p>
          </div>
        </div>

        <p v-else-if="!editingRecurrence" class="text-xs text-muted">
          Pengulangan tidak dapat ditambahkan pada tagihan yang sudah ada — buat tagihan berulang baru bila perlu.
        </p>

        <div>
          <label for="bill-category" class="mb-1 block text-sm font-medium">Kategori <span class="font-normal text-muted">(opsional)</span></label>
          <USelect
            id="bill-category"
            v-model="form.category_id"
            :items="[{ label: 'Tanpa kategori', value: 'none' }, ...expenseCategories.map(category => ({ label: category.name, value: category.id }))]"
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

        <div>
          <label for="bill-notes" class="mb-1 block text-sm font-medium">Catatan <span class="font-normal text-muted">(opsional)</span></label>
          <UInput
            id="bill-notes"
            v-model="form.notes"
            placeholder="cth. Nomor pelanggan 12345"
            maxlength="5000"
            autocomplete="off"
            class="w-full"
          />
          <p v-if="props.fieldErrors.notes" class="mt-1 text-xs text-error">{{ props.fieldErrors.notes }}</p>
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
