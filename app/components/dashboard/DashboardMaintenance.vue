<script setup lang="ts">
import type { DashboardMaintenance, MaintenancePriority } from '~/types/dashboard'

interface Props {
  items: DashboardMaintenance[]
  /**
   * true ketika backend melaporkan domain maintenance sebagai
   * unsupported (`meta.unsupported_domains`). Saat unsupported, klaim
   * jumlah jadwal pada header diganti token "—" dan body menampilkan
   * "Belum tersedia" — berbeda jelas dari kondisi benar-benar kosong.
   */
  unsupported?: boolean
}

const props = withDefaults(defineProps<Props>(), { unsupported: false })

const subtitle = computed(() => (
  props.unsupported ? '—' : `${props.items.length} jadwal pemeliharaan terdekat`
))

const priorityLabel: Record<MaintenancePriority, string> = {
  tinggi: 'Prioritas Tinggi',
  sedang: 'Sedang',
  rutin: 'Rutin'
}

const priorityClass: Record<MaintenancePriority, string> = {
  tinggi: 'bg-destructive/10 text-destructive',
  sedang: 'bg-warning/10 text-warning',
  rutin: 'bg-primary/10 text-primary'
}
</script>

<template>
  <UCard :ui="{ body: 'p-4 sm:p-5' }">
    <template #header>
      <div>
        <h2 class="text-base font-semibold text-highlighted">Perawatan &amp; Pemeliharaan</h2>
        <p class="mt-0.5 text-sm text-muted">{{ subtitle }}</p>
      </div>
    </template>

    <!-- Unsupported dicek SEBELUM kosong: "Belum tersedia" ≠ "tidak ada". -->
    <div v-if="unsupported" class="py-6 text-center">
      <p class="text-sm text-muted">Belum tersedia</p>
    </div>

    <div v-else-if="items.length === 0" class="py-6 text-center">
      <p class="text-sm text-muted">Tidak ada jadwal pemeliharaan</p>
    </div>

    <ul v-else class="flex flex-col gap-3">
      <li
        v-for="item in items"
        :key="item.id"
        class="rounded-xl border border-default bg-elevated/50 p-3"
      >
        <div class="flex items-center justify-between gap-2">
          <p class="truncate text-sm font-medium text-highlighted">{{ item.title }}</p>
          <span
            class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
            :class="priorityClass[item.priority]"
          >
            {{ priorityLabel[item.priority] }}
          </span>
        </div>
        <p class="mt-1 truncate text-xs text-muted">{{ item.dateLabel }} · {{ item.location }}</p>
      </li>
    </ul>
  </UCard>
</template>
