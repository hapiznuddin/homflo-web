<script setup lang="ts">
import { formatRupiah } from '~/utils/format'

/**
 * Pratinjau layar aplikasi Homflo untuk panel CTA landing page.
 * Presentational only: tanpa API, tanpa auth, tanpa router. Struktur, istilah,
 * dan pola diambil dari layar mobile asli (dashboard dan daftar belanja);
 * seluruh angka adalah data contoh.
 */
defineProps<{ screen: 'money' | 'lists' }>()

const kpis = [
  {
    label: 'Pendapatan',
    value: formatRupiah(12400000),
    icon: 'i-lucide-trending-up',
    tone: 'text-success'
  },
  {
    label: 'Pengeluaran',
    value: formatRupiah(7850000),
    icon: 'i-lucide-trending-down',
    tone: 'text-muted'
  },
  {
    label: 'Arus Kas Bersih',
    value: formatRupiah(4550000, true),
    icon: 'i-lucide-wallet',
    tone: 'text-success'
  }
]

const budgets = [
  { name: 'Kebutuhan Rumah', percent: 68, bar: 'bg-primary' },
  { name: 'Tagihan', percent: 54, bar: 'bg-primary' },
  { name: 'Transportasi', percent: 41, bar: 'bg-warning' }
]

const bills = [
  { title: 'Internet', due: 'Jatuh tempo 5 Nov', amount: 416250, icon: 'i-lucide-wifi' },
  { title: 'Listrik', due: 'Sudah dibayar', amount: 289000, icon: 'i-lucide-zap' }
]

const lists = [
  {
    name: 'Belanja Mingguan',
    isDefault: true,
    active: 4,
    completed: 2,
    icon: 'i-lucide-shopping-cart'
  },
  {
    name: 'Kebutuhan Dapur',
    isDefault: false,
    active: 3,
    completed: 5,
    icon: 'i-lucide-shopping-cart'
  },
  {
    name: 'Peralatan Kebersihan',
    isDefault: false,
    active: 2,
    completed: 0,
    icon: 'i-lucide-shopping-cart'
  },
  { name: 'Perlengkapan Bayi', isDefault: false, active: 1, completed: 3, icon: 'i-lucide-folder' },
  {
    name: 'Belanja Bulanan',
    isDefault: false,
    active: 0,
    completed: 8,
    icon: 'i-lucide-shopping-cart'
  },
  {
    name: 'Perlengkapan Sekolah',
    isDefault: false,
    active: 2,
    completed: 1,
    icon: 'i-lucide-folder'
  }
]

const shoppingItems = [
  { title: 'Sabun cuci', qty: '1 pcs', done: false },
  { title: 'Beras', qty: '5 kg', done: false },
  { title: 'Minyak goreng', qty: '2 L', done: true }
]
</script>

<template>
  <div
    class="relative aspect-9/19 w-full overflow-hidden rounded-2xl border border-border bg-card p-1 shadow-lg"
  >
    <div class="relative flex h-full flex-col overflow-hidden rounded-[1.65rem] bg-background shadow-lg">
      <span
        class="absolute left-1/2 top-1.5 z-10 h-1 w-9 -translate-x-1/2 rounded-full bg-border"
        aria-hidden="true"
      />

      <!-- Status bar -->
      <div
        class="flex items-center justify-between px-3 pb-1 pt-2 text-[8px] font-medium text-muted tabular-nums"
      >
        <span>9:41</span>
        <span class="flex items-center gap-0.5" aria-hidden="true">
          <UIcon name="i-lucide-signal" class="size-2.5" />
          <UIcon name="i-lucide-wifi" class="size-2.5" />
          <UIcon name="i-lucide-battery-full" class="size-3" />
        </span>
      </div>

      <!-- Dashboard: ringkasan uang -->
      <template v-if="screen === 'money'">
        <div class="px-3 pb-2 pt-1">
          <p
            class="m-0 flex items-center gap-1 truncate text-[7px] font-medium leading-tight text-muted"
          >
            <UIcon name="i-lucide-house" class="size-2.5 shrink-0" aria-hidden="true" />
            Rumah Tangga Wijaya
          </p>
          <p class="m-0 mt-0.5 truncate text-[10px] font-semibold leading-tight text-highlighted">
            Selamat pagi, Rina
          </p>
        </div>

        <div class="flex flex-1 flex-col gap-1.5 overflow-hidden px-2.5">
          <div
            v-for="kpi in kpis"
            :key="kpi.label"
            class="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-2 py-1.5"
          >
            <div class="min-w-0">
              <p class="m-0 text-[7px] leading-tight text-muted">{{ kpi.label }}</p>
              <p
                class="m-0 truncate text-[11px] font-bold leading-tight tracking-tight tabular-nums"
                :class="kpi.tone"
              >
                {{ kpi.value }}
              </p>
            </div>
            <span
              class="flex size-5 shrink-0 items-center justify-center rounded-md bg-elevated text-muted"
            >
              <UIcon :name="kpi.icon" class="size-3" aria-hidden="true" />
            </span>
          </div>

          <div class="rounded-lg border border-border bg-card px-2 py-1.5">
            <p class="m-0 text-[8.5px] font-semibold leading-tight text-highlighted">Budget</p>
            <p class="m-0 text-[6.5px] leading-tight text-muted">
              Pengeluaran berdasarkan kategori
            </p>
            <ul class="m-0 mt-1.5 flex list-none flex-col gap-1.5 p-0">
              <li v-for="budget in budgets" :key="budget.name">
                <div class="flex items-baseline justify-between gap-1">
                  <p class="m-0 truncate text-[7.5px] font-medium text-highlighted">
                    {{ budget.name }}
                  </p>
                  <p class="m-0 shrink-0 text-[6.5px] text-muted tabular-nums">
                    {{ budget.percent }}%
                  </p>
                </div>
                <div class="mt-0.5 h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    class="h-full rounded-full"
                    :class="budget.bar"
                    :style="{ width: `${budget.percent}%` }"
                  />
                </div>
              </li>
            </ul>
          </div>

          <div class="rounded-lg border border-border bg-card px-2 py-1.5">
            <div class="flex items-baseline justify-between gap-1">
              <p class="m-0 text-[8.5px] font-semibold leading-tight text-highlighted">
                Akan Datang
              </p>
              <p class="m-0 text-[6.5px] text-muted">Semua tagihan</p>
            </div>
            <ul class="m-0 mt-1 flex list-none flex-col gap-1 p-0">
              <li v-for="bill in bills" :key="bill.title" class="flex items-center gap-1.5">
                <span
                  class="flex size-4 shrink-0 items-center justify-center rounded bg-elevated text-muted"
                >
                  <UIcon :name="bill.icon" class="size-2.5" aria-hidden="true" />
                </span>
                <div class="min-w-0 flex-1">
                  <p class="m-0 truncate text-[7.5px] font-medium leading-tight text-highlighted">
                    {{ bill.title }}
                  </p>
                  <p class="m-0 truncate text-[6.5px] leading-tight text-muted">{{ bill.due }}</p>
                </div>
                <p class="m-0 shrink-0 text-[7.5px] font-semibold text-highlighted tabular-nums">
                  {{ formatRupiah(bill.amount) }}
                </p>
              </li>
            </ul>
          </div>
        </div>
      </template>

      <!-- Daftar belanja -->
      <template v-else>
        <div class="flex items-center justify-between gap-2 px-3 pb-2 pt-1">
          <div class="min-w-0">
            <p class="m-0 text-[11px] font-bold leading-tight tracking-tight text-highlighted">
              Daftar Belanja
            </p>
            <p class="m-0 text-[6.5px] leading-tight text-muted">
              List belanja &amp; kebutuhan rumah
            </p>
          </div>
          <span
            class="flex size-5 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"
          >
            <UIcon name="i-lucide-plus" class="size-3" aria-hidden="true" />
          </span>
        </div>

        <div class="flex flex-1 flex-col gap-1.5 overflow-hidden px-2.5">
          <div class="flex items-center gap-1">
            <span
              class="rounded-full bg-soft-strong px-2 py-0.5 text-[7px] font-medium"
              >Aktif</span
            >
            <span class="rounded-full border border-border px-2 py-0.5 text-[7px] text-muted"
              >Arsip</span
            >
          </div>

          <ul
            class="m-0 flex list-none flex-col divide-y divide-default overflow-hidden rounded-lg border border-border bg-card px-2 p-0"
          >
            <li v-for="list in lists" :key="list.name" class="flex items-center gap-1.5 py-1.5">
              <span
                class="flex size-5 shrink-0 items-center justify-center rounded-md bg-elevated text-muted"
              >
                <UIcon :name="list.icon" class="size-3" aria-hidden="true" />
              </span>
              <div class="min-w-0 flex-1">
                <p
                  class="m-0 flex items-center gap-1 text-[8px] font-medium leading-tight text-highlighted"
                >
                  <span class="truncate">{{ list.name }}</span>
                  <span
                    v-if="list.isDefault"
                    class="shrink-0 rounded-full bg-elevated px-1 text-[6px] font-medium text-muted"
                  >
                    Default
                  </span>
                </p>
                <p class="m-0 text-[6.5px] leading-tight text-muted">
                  {{ list.active }} aktif · {{ list.completed }} completed
                </p>
              </div>
            </li>
          </ul>

          <div class="rounded-lg border border-border bg-card px-2 py-1.5">
            <div class="flex items-baseline justify-between gap-1">
              <p class="m-0 text-[8.5px] font-semibold leading-tight text-highlighted">
                Belanja Mingguan
              </p>
              <p class="m-0 text-[6.5px] text-muted">4 aktif</p>
            </div>
            <ul class="m-0 mt-1 flex list-none flex-col gap-1 p-0">
              <li v-for="item in shoppingItems" :key="item.title" class="flex items-center gap-1.5">
                <span
                  class="size-2.5 shrink-0 rounded-[3px] border"
                  :class="item.done ? 'border-primary bg-primary' : 'border-input'"
                  aria-hidden="true"
                />
                <p
                  class="m-0 flex-1 truncate text-[7.5px]"
                  :class="item.done ? 'text-muted line-through' : 'text-highlighted'"
                >
                  {{ item.title }}
                </p>
                <p class="m-0 shrink-0 text-[6.5px] text-muted">{{ item.qty }}</p>
              </li>
            </ul>
          </div>
        </div>
      </template>

      <!-- Bottom navigation, sama seperti MobileNavbar -->
      <div
        class="mt-auto grid shrink-0 grid-cols-5 items-end border-t border-border px-1 pb-1.5 pt-1"
      >
        <div
          class="flex flex-col items-center gap-0.5 text-[6px] leading-none"
          :class="screen === 'money' ? 'text-primary' : 'text-muted'"
        >
          <UIcon name="i-lucide-house" class="size-3.5" aria-hidden="true" />
          <span>Beranda</span>
        </div>
        <div
          class="flex flex-col items-center gap-0.5 text-[6px] leading-none"
          :class="screen === 'money' ? 'text-primary' : 'text-muted'"
        >
          <UIcon
            name="i-lucide-chart-no-axes-column-increasing"
            class="size-3.5"
            aria-hidden="true"
          />
          <span>Transaksi</span>
        </div>
        <div class="flex flex-col items-center">
          <span
            class="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
          >
            <UIcon name="i-lucide-plus" class="size-3.5" aria-hidden="true" />
          </span>
        </div>
        <div
          class="flex flex-col items-center gap-0.5 text-[6px] leading-none"
          :class="screen === 'lists' ? 'text-primary' : 'text-muted'"
        >
          <UIcon name="i-lucide-clipboard-list" class="size-3.5" aria-hidden="true" />
          <span>Daftar</span>
        </div>
        <div class="flex flex-col items-center gap-0.5 text-[6px] leading-none text-muted">
          <UIcon name="i-lucide-ellipsis" class="size-3.5" aria-hidden="true" />
          <span>Lainnya</span>
        </div>
      </div>
    </div>
  </div>
</template>
