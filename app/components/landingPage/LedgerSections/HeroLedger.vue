<script setup lang="ts">
import { formatRupiah } from '~/utils/format'

const rows = [
  {
    icon: 'i-lucide-receipt',
    label: 'Tagihan internet',
    meta: 'Jatuh tempo 5 Nov',
    value: formatRupiah(416250),
    state: 'Jatuh tempo'
  },
  {
    icon: 'i-lucide-wrench',
    label: 'Servis AC',
    meta: '12 Nov · terjadwal',
    value: 'Rumah',
    state: 'Perawatan'
  },
  {
    icon: 'i-lucide-car',
    label: 'Servis rutin 10.000 km',
    meta: '18 Nov · odometer 42.500 km',
    value: 'Mobil',
    state: 'Kendaraan'
  },
  {
    icon: 'i-lucide-shopping-basket',
    label: 'Belanja mingguan',
    meta: '4 item tersisa',
    value: formatRupiah(188000),
    state: 'Daftar'
  }
]
</script>

<template>
  <div class="overflow-hidden rounded-2xl border border-border bg-card">
    <div class="flex items-center justify-between gap-3 border-b border-rule px-4 py-3.5">
      <div class="flex min-w-0 items-center gap-2.5">
        <span
          class="inline-flex size-[30px] shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
          aria-hidden="true"
        >
          <UIcon name="i-lucide-house" class="size-4" />
        </span>
        <div>
          <p class="m-0 text-sm font-semibold leading-[1.3]">Rumah Tangga Budi</p>
          <p class="m-0 text-xs leading-[1.4] text-muted-foreground">November 2026</p>
        </div>
      </div>
      <span
        class="shrink-0 rounded-full border border-border px-2 py-[3px] text-xs leading-[1.4] text-muted-foreground"
        >Data contoh</span
      >
    </div>

    <div class="border-b border-rule bg-soft px-4 py-[18px]">
      <p class="m-0 text-xs leading-[1.4] text-muted-foreground">Sisa bulan ini</p>
      <p class="mt-1 mb-0 text-ledger font-semibold tabular-nums">{{ formatRupiah(4550000) }}</p>
      <p class="mt-1.5 mb-0 text-xs leading-[1.45] text-muted-foreground">
        Pemasukan {{ formatRupiah(12400000) }} · pengeluaran {{ formatRupiah(7850000) }}
      </p>
    </div>

    <div class="flex flex-col">
      <div
        v-for="row in rows"
        :key="row.label"
        class="grid grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-2.5 border-t border-rule px-4 py-3 first:border-t-0"
      >
        <span
          class="inline-flex size-[30px] items-center justify-center rounded-lg bg-soft text-primary"
          aria-hidden="true"
        >
          <UIcon :name="row.icon" class="size-4" />
        </span>
        <div class="min-w-0">
          <p class="m-0 text-[0.8125rem] font-medium leading-[1.35]">{{ row.label }}</p>
          <p class="m-0 text-xs leading-[1.4] text-muted-foreground">{{ row.meta }}</p>
        </div>
        <div class="min-w-0 text-end">
          <p class="m-0 text-xs font-semibold leading-[1.35] tabular-nums">{{ row.value }}</p>
          <p class="m-0 text-xs leading-[1.4] text-muted-foreground">{{ row.state }}</p>
        </div>
      </div>
    </div>

    <p class="m-0 border-t border-rule px-4 pt-2.5 pb-3 text-xs leading-[1.45] text-muted-foreground text-pretty">
      Pratinjau antarmuka dengan data sintetis. Bukan tangkapan layar akun pengguna.
    </p>
  </div>
</template>
