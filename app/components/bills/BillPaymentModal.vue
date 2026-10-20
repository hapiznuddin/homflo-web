<script setup lang="ts">
import type { BillItem, BillPayFormValues } from '~/types/bills'
import type { WalletItem } from '~/types/wallets'
import { formatTransactionAmount } from '~/utils/transactions'

// Form pembayaran LUNAS (kontrak 14.3.3): body hanya { wallet_id wajib,
// occurred_on opsional }. Tidak ada input nominal (diturunkan backend di
// bawah lock) dan tidak ada pilihan kategori (diwarisi dari bill).
// Pemilihan wallet dan saldo yang tampil hanya UX — validasi saldo tetap
// backend (INSUFFICIENT_FUNDS), otorisasi tetap backend.

interface Props {
  open: boolean
  bill: BillItem | null
  wallets: WalletItem[]
  walletsPending: boolean
  walletsError: string | null
  submitting: boolean
  error: string | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [open: boolean]
  'submit': [values: BillPayFormValues]
  'retry-wallets': []
}>()

const modalOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const form = reactive({
  wallet_id: 'none',
  occurred_on: ''
})

const walletError = ref<string | null>(null)

// Kontrak §5.8: pemilih hanya menampilkan dompet aktif; dompet non-aktif
// tetap ditolak backend (404 WALLET_NOT_FOUND) bila dikirim paksa.
const activeWallets = computed(() => props.wallets.filter(wallet => wallet.is_active))

const walletItems = computed(() =>
  activeWallets.value.map(wallet => ({
    label: `${wallet.name} · ${formatTransactionAmount(wallet.balance)}`,
    value: wallet.id
  }))
)

watch(() => [props.open, props.bill] as const, ([open]) => {
  if (open) {
    form.wallet_id = 'none'
    form.occurred_on = ''
    walletError.value = null
  }
}, { immediate: true })

watch(() => form.wallet_id, () => {
  walletError.value = null
})

function close(): void {
  emit('update:open', false)
}

function onSubmit(): void {
  if (form.wallet_id === 'none') {
    walletError.value = 'Pilih dompet yang akan digunakan.'

    return
  }

  emit('submit', {
    wallet_id: form.wallet_id,
    occurred_on: form.occurred_on
  })
}
</script>

<template>
  <UModal v-model:open="modalOpen" title="Bayar tagihan">
    <template #body>
      <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
        <UAlert
          v-if="props.error"
          color="error"
          variant="soft"
          title="Pembayaran gagal."
          :description="props.error"
        />

        <div v-if="props.bill" class="flex flex-col gap-1 rounded-2xl border border-default bg-elevated/50 p-3">
          <p class="truncate text-sm font-medium text-highlighted">{{ props.bill.title }}</p>
          <div class="flex items-baseline justify-between gap-3">
            <span class="text-xs text-muted">Sisa tagihan (dihitung backend)</span>
            <span class="text-lg font-bold text-highlighted">{{ formatTransactionAmount(props.bill.remaining_amount) }}</span>
          </div>
          <p class="text-[11px] text-muted">
            Nominal pelunasan penuh ditentukan backend di bawah penguncian — bukan dari form ini.
          </p>
        </div>

        <div>
          <label for="pay-wallet" class="mb-1 block text-sm font-medium">Dompet sumber</label>
          <USelect
            id="pay-wallet"
            v-model="form.wallet_id"
            :items="[{ label: 'Pilih dompet', value: 'none' }, ...walletItems]"
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
          <p v-else-if="!props.walletsPending && activeWallets.length === 0" class="mt-1 text-xs text-error">
            Belum ada dompet aktif. Aktifkan atau buat dompet di halaman terkait (di luar cakupan halaman ini).
          </p>
          <p v-if="walletError" class="mt-1 text-xs text-error">{{ walletError }}</p>
          <p class="mt-1 text-[11px] text-muted">
            Saldo tercantum hanya untuk tampilan; kecukupan saldo divalidasi backend.
          </p>
        </div>

        <div>
          <label for="pay-date" class="mb-1 block text-sm font-medium">Tanggal pembayaran <span class="font-normal text-muted">(opsional)</span></label>
          <UInput id="pay-date" v-model="form.occurred_on" type="date" class="w-full" />
          <p class="mt-1 text-xs text-muted">
            Kosongkan untuk memakai hari bisnis menurut server (WIB) — bukan jam browser.
          </p>
        </div>

        <div class="flex gap-2">
          <UButton type="button" color="neutral" variant="outline" block @click="close">Batal</UButton>
          <UButton
            type="submit"
            block
            :loading="props.submitting"
            :disabled="props.submitting || activeWallets.length === 0"
          >
            Bayar sekarang
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
