<script setup lang="ts">
import type { CategoryItem } from '~/types/categories'
import type { TransactionFormValues, TransactionItem, TransactionType } from '~/types/transactions'
import type { WalletItem } from '~/types/wallets'

interface Props {
  open: boolean
  editing: TransactionItem | null
  submitting: boolean
  /** Error mutasi non-validasi (mis. INSUFFICIENT_FUNDS) — tampil sebagai alert di form. */
  submitError: string | null
  fieldErrors: Record<string, string>
  categories: CategoryItem[]
  categoriesPending: boolean
  categoriesError: string | null
  wallets: WalletItem[]
  walletsPending: boolean
  walletsError: string | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [open: boolean]
  'submit': [values: TransactionFormValues]
  'retry-categories': []
  'retry-wallets': []
}>()

const modalOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const typeOptions: Array<{ label: string, value: TransactionType }> = [
  { label: 'Pengeluaran', value: 'expense' },
  { label: 'Pemasukan', value: 'income' },
  { label: 'Transfer', value: 'transfer' }
]

// Hanya dompet aktif yang dapat menerima posting baru (pola persis
// BillPaymentModal — filter client; backend tetap otoritas lewat
// WALLET_NOT_FOUND / INSUFFICIENT_FUNDS). Berlaku untuk sumber maupun
// tujuan transfer.
const activeWallets = computed(() => props.wallets.filter(wallet => wallet.is_active))

const isTransfer = computed(() => form.type === 'transfer')

// Nama dompet terpilih — dikirim ke kolom legacy `wallet` agar tampilan
// daftar tetap menampilkan nama dompet; identifier posting tetap wallet_id.
const selectedWalletName = computed(() =>
  props.wallets.find(wallet => wallet.id === form.wallet_id)?.name ?? ''
)

const form = reactive<TransactionFormValues>({
  type: 'expense',
  amount: '',
  occurred_on: '',
  description: '',
  wallet: '',
  wallet_id: '',
  destination_wallet_id: '',
  category_id: ''
})

// Guard lokal transfer (backend tetap otoritas: `different:wallet_id`,
// required_if, dan validasi saldo semuanya di server). Hanya untuk UX
// agar pengguna tidak menerima 422 aneh tanpa pola pesan.
const transferGuard = ref<string | null>(null)

// Tipe saat form dibuka — reset kategori hanya saat pengguna MENGUBAH
// tipe (re-pairing kategori), bukan saat prefill edit berjalan.
let initialType: TransactionType = 'expense'

function todayYmd(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${now.getFullYear()}-${month}-${day}`
}

function resetForm(): void {
  form.type = props.editing?.type ?? 'expense'
  initialType = form.type
  form.amount = props.editing?.amount ?? ''
  form.occurred_on = props.editing?.occurred_on ?? todayYmd()
  form.description = props.editing?.description ?? ''
  // Create & edit: tanpa default otomatis — pengguna memilih dompet
  // secara eksplisit; edit prefill dari wallet_id/destination_wallet_id
  // item (pemindahan dompet saat edit didukung backend, 15.2.3).
  form.wallet_id = props.editing?.wallet_id ?? ''
  form.destination_wallet_id = props.editing?.destination_wallet_id ?? ''
  form.wallet = ''
  // Reka SelectItem melarang value string kosong; 'none' dipetakan
  // kembali ke '' (tanpa kategori) saat submit.
  form.category_id = props.editing?.category?.id ?? 'none'
  transferGuard.value = null
}

watch(() => [props.open, props.editing] as const, ([open]) => {
  if (open) {
    resetForm()
  }
}, { immediate: true })

// Ganti tipe → kategori lama tidak lagi dijamin cocok (backend
// re-pairing CategoryTypeMismatch) → reset ke "Tanpa kategori".
watch(() => form.type, (next) => {
  if (next !== initialType) {
    form.category_id = 'none'
  }
})

// Guard sumber≠tujuan tidak boleh menggantung setelah nilai berubah.
watch(
  () => [form.type, form.wallet_id, form.destination_wallet_id] as const,
  () => {
    transferGuard.value = null
  }
)

function close(): void {
  emit('update:open', false)
}

function onSubmit(): void {
  if (isTransfer.value) {
    if (form.destination_wallet_id === '') {
      transferGuard.value = 'Pilih dompet tujuan terlebih dahulu.'

      return
    }

    if (form.wallet_id !== '' && form.destination_wallet_id === form.wallet_id) {
      transferGuard.value = 'Dompet sumber dan tujuan harus berbeda.'

      return
    }
  }

  emit('submit', {
    ...form,
    // Nama dompet terpilih untuk kolom legacy tampilan (ID posting
    // dikirim via wallet_id); bila tanpa pilihan (baris legacy), nama
    // lama dipertahankan apa adanya.
    wallet: selectedWalletName.value || (props.editing?.wallet ?? ''),
    category_id: form.category_id === 'none' ? '' : form.category_id
  })
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

        <!-- Sumber posting: select aktif untuk create DAN edit
             (pemindahan dompet didukung backend — UpdateTransactionRequest
             `wallet_id sometimes` + revalidasi delta gabungan atomik). -->
        <div>
          <label for="tx-wallet" class="mb-1 block text-sm font-medium">
            {{ isTransfer ? 'Dompet sumber' : 'Dompet' }}
          </label>
          <USelect
            id="tx-wallet"
            v-model="form.wallet_id"
            :items="activeWallets.map(wallet => ({ label: wallet.name, value: wallet.id }))"
            value-key="value"
            class="w-full"
            :loading="props.walletsPending"
            :disabled="props.walletsPending || props.walletsError !== null || activeWallets.length === 0"
            placeholder="Pilih dompet"
          />
          <p v-if="props.walletsError" class="mt-1 text-xs text-error">
            {{ props.walletsError }}
            <UButton variant="link" size="xs" class="px-1" @click="emit('retry-wallets')">Coba lagi</UButton>
          </p>
          <p v-else-if="!props.walletsPending && activeWallets.length === 0" class="mt-1 text-xs text-muted">
            Belum ada dompet aktif. Tambahkan dompet terlebih dahulu.
          </p>
          <p v-if="props.fieldErrors.wallet_id" class="mt-1 text-xs text-error">{{ props.fieldErrors.wallet_id }}</p>
        </div>

        <!-- Khusus transfer: tujuan wajib berbeda dari sumber
             (backend: required_if + different:wallet_id). Tanpa
             pemilihan otomatis — pengguna memilih secara eksplisit. -->
        <div v-if="isTransfer">
          <label for="tx-destination" class="mb-1 block text-sm font-medium">Dompet tujuan</label>
          <USelect
            id="tx-destination"
            v-model="form.destination_wallet_id"
            :items="activeWallets.map(wallet => ({ label: wallet.name, value: wallet.id }))"
            value-key="value"
            class="w-full"
            :loading="props.walletsPending"
            :disabled="props.walletsPending || props.walletsError !== null || activeWallets.length === 0"
            placeholder="Pilih dompet tujuan"
          />
          <p v-if="transferGuard" class="mt-1 text-xs text-error">{{ transferGuard }}</p>
          <p v-if="props.fieldErrors.destination_wallet_id" class="mt-1 text-xs text-error">
            {{ props.fieldErrors.destination_wallet_id }}
          </p>
        </div>

        <!-- Kategori disembunyikan untuk transfer (StoreTransactionRequest:
             category_id prohibited_if:type,transfer). -->
        <div v-if="!isTransfer">
          <label for="tx-category" class="mb-1 block text-sm font-medium">Kategori <span class="font-normal text-muted">(opsional)</span></label>
          <USelect
            id="tx-category"
            v-model="form.category_id"
            :items="[{ label: 'Tanpa kategori', value: 'none' }, ...props.categories.map(category => ({ label: category.name, value: category.id }))]"
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

        <!-- Kegagalan mutasi non-validasi (422 INSUFFICIENT_FUNDS,
             422 TRANSACTION_INVALID, 5xx) tidak boleh hilang diam-diam
             selama form terbuka. -->
        <UAlert
          v-if="props.submitError"
          color="error"
          variant="soft"
          title="Transaksi belum tersimpan."
          :description="props.submitError"
        />

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
