<script setup lang="ts">
interface QuickAction {
  label: string
  icon: string
  primary?: boolean
  /** Rute tujuan bila tersedia; tanpa `to` aksi tetap disabled (jujur). */
  to?: string
}

// "Tambah Transaksi" mengarah ke /transactions (Phase 15.3.1) dan
// "Tambah Aset" ke /assets (Phase 16.2), memakai alur create yang sudah
// ada di halaman tersebut; aksi lain menunggu rutenya dan tetap
// disabled dengan label jujur.
const actions: QuickAction[] = [
  { label: 'Tambah Transaksi', icon: 'i-lucide-plus', primary: true, to: '/transactions' },
  { label: 'Tambah Tagihan', icon: 'i-lucide-receipt' },
  { label: 'Tambah Aset', icon: 'i-lucide-wallet', to: '/assets' },
  { label: 'Tambah Kendaraan', icon: 'i-lucide-car' }
]
</script>

<template>
  <section aria-label="Aksi cepat">
    <h2 class="text-sm font-semibold tracking-wide text-muted uppercase">Aksi Cepat</h2>
    <div class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <UButton
        v-for="action in actions"
        :key="action.label"
        :to="action.to"
        color="neutral"
        :variant="action.primary ? 'solid' : 'outline'"
        :icon="action.icon"
        block
        :disabled="!action.to"
        :aria-disabled="!action.to"
        :title="action.to ? undefined : 'Segera hadir'"
        class="min-h-12"
        :class="action.primary ? 'bg-primary text-white hover:bg-primary/85 active:bg-primary/85' : ''"
      >
        {{ action.label }}
      </UButton>
    </div>
  </section>
</template>
