<script setup lang="ts">
import type { DashboardUpcomingBill } from '~/types/dashboard'
import { formatRupiah } from '~/utils/format'

interface Props {
  bills: DashboardUpcomingBill[]
  /**
   * true ketika backend melaporkan domain bills sebagai unsupported
   * (`meta.unsupported_domains`). Status ini BERBEDA dari data kosong:
   * card wajib jujur "Belum tersedia", bukan mengklaim "tidak ada".
   */
  unsupported?: boolean
}

withDefaults(defineProps<Props>(), { unsupported: false })
</script>

<template>
  <UCard :ui="{ body: 'p-4 sm:p-5' }">
    <template #header>
      <div class="flex items-start justify-between gap-2">
        <div>
          <h2 class="text-base font-semibold text-highlighted">Akan Datang</h2>
          <p class="mt-0.5 text-sm text-muted">Komitmen tagihan terdekat</p>
        </div>
        <!-- Tautan daftar Bills mengikuti pola "Semua anggaran" (Phase 15.3.1):
             anchor focusable; sumber data/kontrak kartu tidak berubah. -->
        <UButton color="neutral" variant="ghost" size="sm" to="/bills">
          Semua tagihan
        </UButton>
      </div>
    </template>

    <!-- Unsupported dicek SEBELUM kosong: "Belum tersedia" ≠ "tidak ada". -->
    <div v-if="unsupported" class="py-6 text-center">
      <p class="text-sm text-muted">Belum tersedia</p>
    </div>

    <div v-else-if="bills.length === 0" class="py-6 text-center">
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
