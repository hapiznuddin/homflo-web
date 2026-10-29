<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  listId: string
  itemId: string
}>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()
const router = useRouter()
const toast = useToast()
const { createListItemExpense, mapErrorCode } = useLists()

const actual_price = ref('' as string)
const submitting = ref(false)
const error = ref<string | null>(null)
interface WalletOption {
  id: string
  name: string
  balance_cents: number | string
}
const wallets = ref([] as WalletOption[])
const walletsError = ref<string | null>(null)
const selectedWallet = ref('')

// Load wallets when component mounts
watch([props.listId], async () => {
  try {
    // In a real implementation, fetch wallets from API
    // For now, use placeholder
    wallets.value = []
  } catch {
    walletsError.value = 'Gagal memuat dompet'
  }
})

// Emit close
function close(): void {
  emit('update:modelValue', false)
}

// Handle submit
async function onSubmit(): Promise<void> {
  submitting.value = true
  error.value = null

  try {
    const result = await createListItemExpense(props.listId, props.itemId, {
      wallet_id: selectedWallet.value,
      actual_price: actual_price.value || undefined
    })

    if (result === null) {
      error.value = mapErrorCode('LIST_ITEM_ACTUAL_PRICE_REQUIRED')
      return
    }

    toast.add({
      title: 'Expense tercatat',
      description: 'Transaksi expense berhasil dicatat ke ledger.',
      color: 'success'
    })
    emit('update:modelValue', false)
    router.push(`/lists/${props.listId}`)
  } catch (err) {
    error.value = mapErrorCode((err as { code?: string }).code)
    toast.add({
      title: 'Error',
      description: error.value,
      color: 'error'
    })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="p-6 max-w-md mx-auto">
    <h2 class="text-xl font-bold mb-6">Buat Expense</h2>

    <div v-if="error" class="mb-4 p-3 rounded bg-red-100 text-red-800">
      {{ error }}
    </div>

    <div v-if="walletsError" class="mb-4 p-3 rounded bg-red-100 text-red-800">
      {{ walletsError }}
    </div>

    <template v-if="wallets.length === 0">
      <p class="text-sm text-muted">Tidak ada dompet aktif untuk rumah tangga ini.</p>
      <p class="text-muted/70">Dompet harus dibuat terlebih dahulu melalui menu Dompet.</p>
    </template>

    <template v-else>
      <form class="space-y-4" @submit.prevent="onSubmit">
        <div>
          <label class="block text-sm font-medium mb-2">Harga Actual</label>
          <input
            v-model.number="actual_price"
            type="number"
            class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            min="1"
            required
            placeholder="Contoh: 15000.00"
          >
          <p class="text-xs text-muted">Harga actual wajib > 0. Diambil dari actual_price item atau input baru.</p>
        </div>

        <div v-if="wallets.length > 0">
          <label class="block text-sm font-medium mb-2">Dompet</label>
          <select
            v-model="selectedWallet"
            class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">-- Pilih dompet --</option>
            <option
              v-for="wallet in wallets"
              :key="wallet.id"
              :value="wallet.id"
            >
              {{ wallet.name }} (Saldo: {{ wallet.balance_cents }})
            </option>
          </select>
        </div>

        <button
          type="submit"
          :disabled="submitting"
          class="w-full py-2 px-4 font-medium text-primary hover:bg-primary/10"
        >
          <template v-if="submitting">Membuat expense...</template>
          <template v-else>Buat Expense</template>
        </button>

        <button
          type="button"
          class="w-full py-2 px-4 text-secondary hover:bg-secondary/10"
          @click="close"
        >
          Batal
        </button>
      </form>
    </template>
  </div>
</template>
