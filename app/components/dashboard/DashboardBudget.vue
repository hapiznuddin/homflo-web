<script setup lang="ts">
import type { BudgetStatus, DashboardBudgetCategory } from '~/types/dashboard'
import { formatRupiah } from '~/utils/format'

interface Props {
  categories: DashboardBudgetCategory[]
}

defineProps<Props>()

const barColor: Record<BudgetStatus, string> = {
  'normal': 'bg-primary',
  'warning': 'bg-warning',
  'near-limit': 'bg-warning',
  'over': 'bg-destructive'
}
</script>

<template>
  <UCard :ui="{ body: 'p-4 sm:p-5' }">
    <template #header>
      <div>
        <h2 class="text-base font-semibold text-highlighted">Budget</h2>
        <p class="mt-0.5 text-sm text-muted">Pengeluaran berdasarkan kategori</p>
      </div>
    </template>

    <div v-if="categories.length === 0" class="py-6 text-center">
      <p class="text-sm text-muted">Belum ada anggaran</p>
    </div>

    <ul v-else class="flex flex-col gap-4">
      <li v-for="category in categories" :key="category.id">
        <div class="flex items-center gap-3">
          <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-elevated" aria-hidden="true">
            <UIcon :name="category.icon" class="size-4.5 text-default" />
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex items-baseline justify-between gap-2">
              <p class="truncate text-sm font-medium text-highlighted">{{ category.name }}</p>
              <p class="shrink-0 text-xs text-muted">{{ category.percent }}%</p>
            </div>
            <p class="mt-0.5 truncate text-xs text-muted">
              {{ formatRupiah(category.spent) }} / {{ formatRupiah(category.budget) }}
              <span v-if="category.note" class="font-medium text-warning"> · {{ category.note }}</span>
            </p>
            <UProgress
              :model-value="Math.min(category.percent, 100)"
              :ui="{ indicator: barColor[category.status] }"
              class="mt-2"
              :aria-label="`${category.name} ${category.percent} persen`"
            />
          </div>
        </div>
      </li>
    </ul>
  </UCard>
</template>
