<script setup lang="ts">
interface QuickAction {
  label: string
  icon: string
  primary?: boolean
}

// Destination routes do not exist yet, so every action stays disabled
// with an honest label instead of faking navigation.
const actions: QuickAction[] = [
  { label: 'Tambah Transaksi', icon: 'i-lucide-plus', primary: true },
  { label: 'Tambah Tagihan', icon: 'i-lucide-receipt' },
  { label: 'Tambah Aset', icon: 'i-lucide-wallet' },
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
        color="neutral"
        :variant="action.primary ? 'solid' : 'outline'"
        :icon="action.icon"
        block
        disabled
        aria-disabled="true"
        title="Segera hadir"
        class="min-h-12"
        :class="action.primary ? 'bg-primary text-white hover:bg-primary/85 active:bg-primary/85' : ''"
      >
        {{ action.label }}
      </UButton>
    </div>
  </section>
</template>
