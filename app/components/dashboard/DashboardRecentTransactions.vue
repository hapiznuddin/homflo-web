<script setup lang="ts">
import type { DashboardTransaction } from '~/types/dashboard'
import { formatRupiah } from '~/utils/format'

interface Props {
  transactions: DashboardTransaction[]
}

defineProps<Props>()
</script>

<template>
  <UCard :ui="{ body: 'p-4 sm:p-5' }">
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <div>
          <h2 class="text-base font-semibold text-highlighted">Transaksi Terbaru</h2>
          <p class="mt-0.5 text-sm text-muted">Aktivitas arus kas keluar &amp; masuk terakhir</p>
        </div>
        <UButton color="neutral" variant="ghost" size="sm" disabled aria-disabled="true" title="Segera hadir">
          Semua transaksi
        </UButton>
      </div>
    </template>

    <div v-if="transactions.length === 0" class="py-6 text-center">
      <p class="text-sm text-muted">Belum ada transaksi bulan ini</p>
      <UButton color="neutral" variant="outline" size="sm" class="mt-3" disabled aria-disabled="true" title="Segera hadir">
        Tambah Transaksi
      </UButton>
    </div>

    <ul v-else class="flex flex-col divide-y divide-default">
      <li v-for="tx in transactions" :key="tx.id" class="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
        <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-elevated" aria-hidden="true">
          <UIcon :name="tx.icon" class="size-4.5 text-default" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-highlighted">{{ tx.title }}</p>
          <p class="truncate text-xs text-muted">{{ tx.dateLabel }} · {{ tx.wallet }}</p>
        </div>
        <p
          class="shrink-0 text-sm font-semibold"
          :class="tx.direction === 'in' ? 'text-success' : 'text-muted'"
        >
          {{ formatRupiah(tx.amount, true) }}
        </p>
      </li>
    </ul>
  </UCard>
</template>
