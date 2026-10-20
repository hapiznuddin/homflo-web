<script setup lang="ts">
import type { BillFrequency, BillItem, BillRecurrenceFormValues } from '~/types/bills'
import { BILL_FREQUENCY_OPTIONS } from '~/utils/bills'

// Panel ubah jadwal recurrence (D-07): PATCH /bills/recurrences/{id}
// dengan body FLAT. Form mengirim HANYA field yang berbeda dari nilai
// awal (diff), karena API tidak punya GET recurrence — nilai template
// pada baris bill bisa basi (edit lokal periode / periode lunas) dan
// tidak boleh menimpa jadwal saat pengguna tidak menyentuhnya.

interface Props {
  open: boolean
  bill: BillItem | null
  submitting: boolean
  error: string | null
  fieldErrors: Record<string, string>
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [open: boolean]
  'submit': [changes: Partial<BillRecurrenceFormValues>]
}>()

const modalOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const form = reactive({
  title: '',
  amount: '',
  category_id: 'none',
  notes: '',
  due_day: '',
  frequency: 'monthly' as BillFrequency,
  is_active: true
})

const initial = reactive({ ...form })

function resetForm(): void {
  const bill = props.bill
  const recurrence = bill?.recurrence

  form.title = bill?.title ?? ''
  form.amount = bill?.amount ?? ''
  form.category_id = bill?.category?.id ?? 'none'
  form.notes = bill?.notes ?? ''
  // due_day/frequency/is_active berasal dari bill.recurrence — field
  // jadwal asli dari baris recurrence, akurat (bukan turunan periode).
  form.due_day = recurrence ? String(recurrence.due_day) : ''
  form.frequency = recurrence?.frequency ?? 'monthly'
  form.is_active = recurrence?.is_active ?? true

  Object.assign(initial, form)
}

watch(() => [props.open, props.bill] as const, ([open]) => {
  if (open) {
    resetForm()
  }
}, { immediate: true })

const hasChanges = computed(() => (Object.keys(form) as Array<keyof typeof form>).some(key => form[key] !== initial[key]))

function toChanges(): Partial<BillRecurrenceFormValues> {
  const changes: Partial<BillRecurrenceFormValues> = {}

  if (form.title !== initial.title) {
    changes.title = form.title
  }

  if (form.amount !== initial.amount) {
    changes.amount = form.amount
  }

  if (form.category_id !== initial.category_id) {
    changes.category_id = form.category_id === 'none' ? '' : form.category_id
  }

  if (form.notes !== initial.notes) {
    changes.notes = form.notes
  }

  if (form.due_day !== initial.due_day) {
    changes.due_day = Number(form.due_day)
  }

  if (form.frequency !== initial.frequency) {
    changes.frequency = form.frequency
  }

  if (form.is_active !== initial.is_active) {
    changes.is_active = form.is_active
  }

  return changes
}

function close(): void {
  emit('update:open', false)
}

function onSubmit(): void {
  if (!hasChanges.value) {
    return
  }

  emit('submit', toChanges())
}

// Reka SelectItem melarang value string kosong; 'none' dipetakan ke ''
// (tanpa kategori) saat submit — category_id null berarti "tanpa kategori".
const categoryItems = computed(() => [
  { label: 'Tanpa kategori', value: 'none' },
  ...(props.bill?.category ? [{ label: props.bill.category.name, value: props.bill.category.id }] : [])
])
</script>

<template>
  <UModal v-model:open="modalOpen" title="Ubah jadwal tagihan">
    <template #body>
      <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
        <UAlert
          v-if="props.error"
          color="error"
          variant="soft"
          title="Jadwal belum dapat diubah."
          :description="props.error"
        />

        <div class="flex flex-col gap-2 rounded-2xl border border-default bg-elevated/50 p-3 text-xs text-muted">
          <p>
            Perubahan hanya berlaku ke <strong class="text-highlighted">periode yang belum dibayar dan belum
            diarsipkan</strong> (termasuk yang terlambat); periode lunas atau terarsip tidak pernah berubah.
          </p>
          <p>
            <strong class="text-highlighted">Frekuensi baru berlaku ke depan saja</strong> — riwayat periode dan
            posisi jadwal tidak diubah mundur.
          </p>
          <p>
            Tidak ada hapus jadwal di aplikasi ini: untuk berhenti, matikan jadwal (nonaktif). Menonaktifkan
            menghentikan pembuatan periode baru; tagihan yang sudah ada tetap ada.
          </p>
        </div>

        <div>
          <label for="rec-title" class="mb-1 block text-sm font-medium">Judul template</label>
          <UInput
            id="rec-title"
            v-model="form.title"
            maxlength="255"
            autocomplete="off"
            class="w-full"
          />
          <p class="mt-1 text-xs text-muted">Nilai awal dari tagihan yang dibuka; hanya dikirim bila diubah.</p>
          <p v-if="props.fieldErrors.title" class="mt-1 text-xs text-error">{{ props.fieldErrors.title }}</p>
        </div>

        <div>
          <label for="rec-amount" class="mb-1 block text-sm font-medium">Nominal template (Rp)</label>
          <UInput
            id="rec-amount"
            v-model="form.amount"
            inputmode="decimal"
            autocomplete="off"
            class="w-full"
          />
          <p v-if="props.fieldErrors.amount" class="mt-1 text-xs text-error">{{ props.fieldErrors.amount }}</p>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="rec-due-day" class="mb-1 block text-sm font-medium">Tanggal jatuh tempo</label>
            <UInput
              id="rec-due-day"
              v-model="form.due_day"
              type="number"
              min="1"
              max="31"
              class="w-full"
            />
            <p v-if="props.fieldErrors.due_day" class="mt-1 text-xs text-error">{{ props.fieldErrors.due_day }}</p>
          </div>
          <div>
            <label for="rec-frequency" class="mb-1 block text-sm font-medium">Frekuensi</label>
            <USelect
              id="rec-frequency"
              v-model="form.frequency"
              :items="BILL_FREQUENCY_OPTIONS"
              value-key="value"
              class="w-full"
            />
            <p v-if="props.fieldErrors.frequency" class="mt-1 text-xs text-error">{{ props.fieldErrors.frequency }}</p>
          </div>
        </div>

        <div>
          <label for="rec-category" class="mb-1 block text-sm font-medium">Kategori template <span class="font-normal text-muted">(opsional)</span></label>
          <USelect
            id="rec-category"
            v-model="form.category_id"
            :items="categoryItems"
            value-key="value"
            class="w-full"
          />
          <p v-if="props.fieldErrors.category_id" class="mt-1 text-xs text-error">{{ props.fieldErrors.category_id }}</p>
        </div>

        <div>
          <label for="rec-notes" class="mb-1 block text-sm font-medium">Catatan template <span class="font-normal text-muted">(opsional)</span></label>
          <UInput
            id="rec-notes"
            v-model="form.notes"
            maxlength="5000"
            autocomplete="off"
            class="w-full"
          />
          <p v-if="props.fieldErrors.notes" class="mt-1 text-xs text-error">{{ props.fieldErrors.notes }}</p>
        </div>

        <div class="flex items-center justify-between gap-3 rounded-2xl border border-default p-3">
          <div class="min-w-0">
            <p class="text-sm font-medium">Jadwal aktif</p>
            <p class="mt-0.5 text-xs text-muted">
              {{ form.is_active ? 'Periode baru dibuat otomatis saat mendekati jatuh tempo.' : 'Pembuatan periode baru dihentikan; tagihan existing tidak terpengaruh.' }}
            </p>
          </div>
          <USwitch id="rec-active" v-model="form.is_active" aria-label="Jadwal aktif" />
        </div>

        <div class="flex gap-2">
          <UButton type="button" color="neutral" variant="outline" block @click="close">Batal</UButton>
          <UButton
            type="submit"
            block
            :loading="props.submitting"
            :disabled="props.submitting || !hasChanges"
          >
            Simpan jadwal
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
