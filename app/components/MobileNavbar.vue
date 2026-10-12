<script setup lang="ts">
const quickActionsOpen = ref(false)

const quickActions = [
  { label: 'Tagihan', detail: 'Listrik, WiFi, & PDAM', caption: 'Jatuh Tempo', icon: 'i-lucide-zap', iconClass: 'text-amber-600' },
  { label: 'Daftar Belanja', detail: 'Bahan dapur & harian', caption: 'Belanja', icon: 'i-lucide-shopping-bag', iconClass: 'text-rose-600' },
  { label: 'Aset Rumah', detail: 'Elektronik & mebel', caption: 'Garansi', icon: 'i-lucide-house', iconClass: 'text-blue-600' },
  { label: 'Maintenance', detail: 'Cuci AC, filter & servis', caption: 'Jadwal', icon: 'i-lucide-puzzle', iconClass: 'text-emerald-700' },
  { label: 'Kendaraan & BBM', detail: 'Servis motor, oli, mesin, & bensin Shell/Pertamina', caption: 'Log Odo', icon: 'i-lucide-car-front', iconClass: 'text-violet-600', wide: true }
]
</script>

<template>
  <nav
    aria-label="Navigasi utama"
    class="fixed inset-x-0 bottom-2 md:bottom-4 mx-auto w-full max-w-100 pb-[env(safe-area-inset-bottom)] lg:hidden"
    style="z-index: 2000"
  >
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 z-1001 rounded-full border border-border bg-white shadow-sm dark:bg-stone-950"
    />

    <div class="grid grid-cols-5">
      <NuxtLink
        to="/dashboard"
        class="relative z-2001 flex min-h-16 flex-col items-center justify-center gap-1 text-xs"
      >
        <UIcon name="i-lucide-house" class="size-5" aria-hidden="true" />
        Beranda
      </NuxtLink>
      <NuxtLink
        to="/dashboard"
        class="relative z-2001 flex min-h-16 flex-col items-center justify-center gap-1 text-xs"
      >
        <UIcon name="i-lucide-chart-no-axes-column-increasing" class="size-5" aria-hidden="true" />
        Transaksi
      </NuxtLink>

      <div class="relative flex items-center justify-center">
        <UButton
          :aria-label="quickActionsOpen ? 'Tutup menu catatan' : 'Catat baru'"
          size="xl"
          class="relative z-2001 -top-2 size-14 justify-center rounded-full text-white shadow-lg transition-all"
          :aria-expanded="quickActionsOpen"
          @click="quickActionsOpen = !quickActionsOpen"
        >
          <UIcon
            name="i-lucide-plus"
            aria-hidden="true"
            class="size-10 transition-transform duration-200 ease-in-out"
            :class="quickActionsOpen ? 'rotate-45' : 'rotate-0'"
          />
        </UButton>

        <UDrawer
          v-model:open="quickActionsOpen"
          :portal="false"
          :modal="false"
          direction="bottom"
          title="Catat Baru"
          description="Pilih pencatatan rumah tangga yang ingin ditambahkan."
          :close="{ color: 'neutral', variant: 'soft', class: 'size-8 rounded-full' }"
          :ui="{
            content:
              'lg:hidden rounded-t-3xl text-stone-900 bg-background drop-shadow-xl border border-border dark:text-white bottom-[calc(4.5rem+env(safe-area-inset-bottom))] h-[50dvh] max-h-[50dvh] mt-0 z-[1000]',
            overlay: 'lg:hidden bg-black/50 dark:bg-black/50',
            container: 'w-full gap-3 p-4 overflow-y-auto',
            body: 'min-h-0'
          }"
        >
          <template #title>
            <span class="flex items-center gap-2">
              Catat Baru
              <span class="rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-semibold tracking-wide text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                HOMFLO QUICK
              </span>
            </span>
          </template>

          <template #body>
            <div class="flex flex-col gap-3">
              <UButton
                disabled
                aria-disabled="true"
                class="min-h-18 w-full justify-start gap-3 rounded-2xl bg-emerald-950 px-3 text-left text-white opacity-100 disabled:opacity-100 dark:bg-emerald-900"
                title="Fitur segera hadir"
              >
                <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <UIcon name="i-lucide-plus" class="size-6" aria-hidden="true" />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    Catat Transaksi
                    <span class="rounded-full bg-emerald-700 px-2 py-0.5 text-[9px] font-medium text-white">
                      Paling Sering
                    </span>
                  </span>
                  <span class="mt-1 block text-[10px] font-normal leading-tight text-white/75">
                    Pengeluaran, pemasukan, atau transfer harian
                  </span>
                </span>
                <UIcon name="i-lucide-chevron-right" class="size-5 shrink-0" aria-hidden="true" />
              </UButton>

              <div class="grid grid-cols-2 gap-2.5">
                <UButton
                  v-for="action in quickActions"
                  :key="action.label"
                  disabled
                  aria-disabled="true"
                  color="neutral"
                  variant="outline"
                  class="min-h-19 justify-start gap-2 rounded-2xl border-stone-200 bg-stone-50 px-2.5 py-2 text-left opacity-100 disabled:opacity-100 dark:border-stone-800 dark:bg-stone-900"
                  :class="action.wide ? 'col-span-2' : ''"
                  title="Fitur segera hadir"
                >
                  <UIcon :name="action.icon" class="size-6 shrink-0" :class="action.iconClass" aria-hidden="true" />
                  <span class="min-w-0 flex-1">
                    <span class="flex items-center justify-between gap-1 text-[11px] font-semibold leading-tight">
                      {{ action.label }}
                      <span class="shrink-0 text-[9px] font-normal text-stone-400">{{ action.caption }}</span>
                    </span>
                    <span class="mt-1 block text-[9px] font-normal leading-tight text-stone-500 dark:text-stone-400">
                      {{ action.detail }}
                    </span>
                  </span>
                </UButton>
              </div>
            </div>
          </template>
        </UDrawer>
      </div>

      <NuxtLink
        to="/dashboard"
        class="relative z-2001 flex min-h-16 flex-col items-center justify-center gap-1 text-xs"
      >
        <UIcon name="i-lucide-clipboard-list" class="size-5" aria-hidden="true" />
        Catatan
      </NuxtLink>
      <NuxtLink
        to="/account"
        class="relative z-2001 flex min-h-16 flex-col items-center justify-center gap-1 text-xs"
      >
        <UIcon name="i-lucide-ellipsis" class="size-5" aria-hidden="true" />
        Lainnya
      </NuxtLink>
    </div>
  </nav>
</template>
