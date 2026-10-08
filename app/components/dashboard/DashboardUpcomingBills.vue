<script setup lang="ts">
import type { DashboardUpcomingBill } from '~/types/dashboard'
import { formatRupiah } from '~/utils/format'

interface Props {
  bills: DashboardUpcomingBill[]
}

defineProps<Props>()
</script>

<template>
  <UCard :ui="{ body: 'p-4 sm:p-5' }">
    <template #header>
      <div>
        <h2 class="text-base font-semibold text-highlighted">Akan Datang</h2>
        <p class="mt-0.5 text-sm text-muted">Komitmen tagihan terdekat</p>
      </div>
    </template>

    <div v-if="bills.length === 0" class="py-6 text-center">
      <p class="text-sm text-muted">Tidak ada tagihan terdekat</p>
    </div>

    <ul v-else class="flex flex-col divide-y divide-default">
      <li v-for="bill in bills" :key="bill.id" class="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
        <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-elevated" aria-hidden="true">
          <UIcon :name="bill.icon" class="size-4.5 text-default" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-highlighted">{{ bill.title }}</p>
          <p class="truncate text-xs text-muted">{{ bill.dueLabel }}</p>
        </div>
        <p class="shrink-0 text-sm font-semibold text-highlighted">{{ formatRupiah(bill.amount) }}</p>
      </li>
    </ul>

    <template v-if="bills.length > 0" #footer>
      <UButton color="neutral" variant="ghost" block size="sm" disabled aria-disabled="true" title="Segera hadir">
        Jadwal lengkap
      </UButton>
    </template>
  </UCard>
</template>
