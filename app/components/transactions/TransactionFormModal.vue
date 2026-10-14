<script setup lang="ts">
import type { TransactionFormValues, TransactionItem, TransactionType } from '~/types/transactions'

interface Props {
  open: boolean
  editing: TransactionItem | null
  submitting: boolean
  fieldErrors: Record<string, string>
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [open: boolean]
  'submit': [values: TransactionFormValues]
}>()

const modalOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const typeOptions: Array<{ label: string, value: TransactionType }> = [
  { label: 'Pengeluaran', value: 'expense' },
  { label: 'Pemasukan', value: 'income' }
]

const form = reactive<TransactionFormValues>({
  type: 'expense',
  amount: '',
  occurred_on: '',
  description: '',
  wallet: ''
})

function todayYmd(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${now.getFullYear()}-${month}-${day}`
}

function resetForm(): void {
  form.type = props.editing?.type ?? 'expense'
  form.amount = ''
  form.occurred_on = props.editing?.occurred_on ?? todayYmd()
  form.description = props.editing?.description ?? ''
  form.wallet = props.editing?.wallet ?? ''
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
  <UModal v-model:open="modalOpen" :title="props.editing ? 'Ubah transaksi' : 'Tambah transaksi'">
    <template #body>
      <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
        <div>
          <label for="tx-type" class="mb-1 block text-sm font-medium">Jenis</label>
          <USelect
            id="tx-type"
            v-model="form.type"
            :items="typeOptions"
            value-key="value"
            class="w-full"
          />
          <p v-if="props.fieldErrors.type" class="mt-1 text-xs text-error">{{ props.fieldErrors.type }}</p>
        </div>

        <div>
          <label for="tx-amount" class="mb-1 block text-sm font-medium">Nominal (Rp)</label>
          <UInput
            id="tx-amount"
            v-model="form.amount"
            inputmode="decimal"
            placeholder="150000"
            autocomplete="off"
            class="w-full"
          />
          <p v-if="props.fieldErrors.amount" class="mt-1 text-xs text-error">{{ props.fieldErrors.amount }}</p>
        </div>

        <div>
          <label for="tx-date" class="mb-1 block text-sm font-medium">Tanggal</label>
          <UInput
            id="tx-date"
            v-model="form.occurred_on"
            type="date"
            class="w-full"
          />
          <p v-if="props.fieldErrors.occurred_on" class="mt-1 text-xs text-error">{{ props.fieldErrors.occurred_on }}</p>
        </div>

        <div>
          <label for="tx-description" class="mb-1 block text-sm font-medium">Deskripsi <span class="font-normal text-muted">(opsional)</span></label>
          <UInput
            id="tx-description"
            v-model="form.description"
            placeholder="cth. Belanja mingguan"
            maxlength="5000"
            autocomplete="off"
            class="w-full"
          />
          <p v-if="props.fieldErrors.description" class="mt-1 text-xs text-error">{{ props.fieldErrors.description }}</p>
        </div>

        <div>
          <label for="tx-wallet" class="mb-1 block text-sm font-medium">Dompet <span class="font-normal text-muted">(opsional)</span></label>
          <UInput
            id="tx-wallet"
            v-model="form.wallet"
            placeholder="cth. Kas Tunai"
            maxlength="100"
            autocomplete="off"
            class="w-full"
          />
          <p v-if="props.fieldErrors.wallet" class="mt-1 text-xs text-error">{{ props.fieldErrors.wallet }}</p>
        </div>

        <p class="text-xs text-muted">Kategori belum dapat dipilih — pengelolaan kategori menyusul setelah Categories API tersedia.</p>

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
