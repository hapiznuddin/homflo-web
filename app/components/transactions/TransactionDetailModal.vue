<script setup lang="ts">
import type { TransactionItem } from '~/types/transactions'
import { formatTransactionAmount, transactionAmountClass, transactionTypeIcon, transactionTypeLabel } from '~/utils/transactions'
import { formatYmd } from '~/utils/format'

interface Props {
  open: boolean
  item: TransactionItem | null
  loading: boolean
  error: string | null
  deleting: boolean
  confirmDelete: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [open: boolean]
  'edit': [item: TransactionItem]
  'delete': []
  'cancel-delete': []
  'retry': []
}>()

const modalOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

// Transfer tampil netral ("Transfer", ikon panah dua arah, warna
// netral) — bukan "Pengeluaran" (Phase 15.2.1, preseden dashboard 15.1).
const typeLabel = computed(() => props.item ? transactionTypeLabel(props.item.type) : '')
</script>

<template>
  <UModal v-model:open="modalOpen" title="Detail transaksi">
    <template #body>
      <div v-if="props.loading" class="flex flex-col gap-3" aria-label="Memuat detail transaksi">
        <USkeleton class="h-8 w-full" />
        <USkeleton class="h-5 w-2/3" />
        <USkeleton class="h-5 w-1/2" />
      </div>

      <div v-else-if="props.error" class="flex flex-col gap-3">
        <UAlert color="error" variant="soft" title="Detail belum dapat dimuat." :description="props.error" />
        <UButton color="neutral" variant="outline" block @click="emit('retry')">Coba lagi</UButton>
      </div>

      <div v-else-if="props.item" class="flex flex-col gap-3">
        <div class="flex items-center gap-3">
          <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-elevated" aria-hidden="true">
            <UIcon :name="transactionTypeIcon(props.item.type)" class="size-5 text-default" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-lg font-bold tracking-tight" :class="transactionAmountClass(props.item.type)">
              {{ formatTransactionAmount(props.item.amount) }}
            </p>
            <p class="text-sm text-muted">{{ typeLabel }}</p>
          </div>
        </div>

        <!-- Sumber transaksi dari pembayaran tagihan (D-08): tampilan
             read-only + aksi edit/hapus disembunyikan — guard backend
             BILL_PAYMENT_LOCKED tetap otoritas; ini UX saja. -->
        <div
          v-if="props.item.bill_payment"
          class="flex items-start gap-2 rounded-2xl border border-default bg-elevated/50 px-3 py-2 text-sm"
        >
          <UIcon name="i-lucide-receipt" class="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
          <p class="min-w-0">
            <span class="font-medium text-highlighted">Pembayaran tagihan</span>
            — {{ props.item.bill_payment.bill_title }}. Transaksi ini terkait pembayaran tagihan dan tidak
            dapat diubah atau dihapus dari sini.
          </p>
        </div>

        <dl class="flex flex-col gap-2 text-sm">
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Tanggal</dt>
            <dd class="font-medium">{{ formatYmd(props.item.occurred_on) }}</dd>
          </div>
          <div v-if="props.item.category" class="flex justify-between gap-3">
            <dt class="text-muted">Kategori</dt>
            <dd class="font-medium">{{ props.item.category.name }}</dd>
          </div>
          <div v-if="props.item.wallet" class="flex justify-between gap-3">
            <dt class="text-muted">Dompet</dt>
            <dd class="font-medium">{{ props.item.wallet }}</dd>
          </div>
          <div v-if="props.item.description" class="flex flex-col gap-1">
            <dt class="text-muted">Deskripsi</dt>
            <dd>{{ props.item.description }}</dd>
          </div>
        </dl>

        <template v-if="!props.item.bill_payment">
          <div v-if="!props.confirmDelete" class="flex gap-2 pt-1">
            <UButton color="neutral" variant="outline" block @click="emit('edit', props.item)">Ubah</UButton>
            <UButton color="error" variant="outline" block @click="emit('delete')">Hapus</UButton>
          </div>

          <div v-else class="flex flex-col gap-2 pt-1">
            <UAlert color="error" variant="soft" title="Hapus transaksi ini?" description="Data yang dihapus tidak dapat dikembalikan." />
            <div class="flex gap-2">
              <UButton color="neutral" variant="outline" block @click="emit('cancel-delete')">Batal</UButton>
              <UButton color="error" block :loading="props.deleting" :disabled="props.deleting" @click="emit('delete')">Ya, hapus</UButton>
            </div>
          </div>
        </template>
      </div>
    </template>
  </UModal>
</template>
