<script setup lang="ts">
import type { TransactionItem } from '~/types/transactions'
import { formatTransactionAmount } from '~/utils/transactions'
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

const typeLabel = computed(() => props.item?.type === 'income' ? 'Pemasukan' : 'Pengeluaran')
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
            <UIcon :name="props.item.type === 'income' ? 'i-lucide-trending-up' : 'i-lucide-trending-down'" class="size-5 text-default" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-lg font-bold tracking-tight" :class="props.item.type === 'income' ? 'text-success' : 'text-highlighted'">
              {{ formatTransactionAmount(props.item.amount) }}
            </p>
            <p class="text-sm text-muted">{{ typeLabel }}</p>
          </div>
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
      </div>
    </template>
  </UModal>
</template>
