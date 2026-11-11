<script setup lang="ts">
import { formatRupiah } from '~/utils/format'

const kpis = [
  {
    label: 'Pendapatan',
    value: formatRupiah(12400000),
    icon: 'i-lucide-arrow-down-left',
    tone: ''
  },
  { label: 'Pengeluaran', value: formatRupiah(7850000), icon: 'i-lucide-arrow-up-right', tone: '' },
  {
    label: 'Arus kas',
    value: formatRupiah(4550000, true),
    icon: 'i-lucide-wallet',
    tone: 'text-success'
  }
]

const budgets = [
  { label: 'Kebutuhan Rumah', used: 68, amount: 'Rp 1.360.000 dari Rp 2.000.000' },
  { label: 'Tagihan', used: 54, amount: 'Rp 1.620.000 dari Rp 3.000.000' },
  { label: 'Transportasi', used: 41, amount: 'Rp 615.000 dari Rp 1.500.000' }
]

const bills = [
  { label: 'Internet', due: 'Jatuh tempo 5 Nov', amount: 416250, paid: false },
  { label: 'Listrik', due: 'Sudah dibayar', amount: 289000, paid: true }
]

const transactions = [
  { label: 'Belanja supermarket', meta: 'Rekening utama, 2 Nov', amount: -685000 },
  { label: 'Gaji bulanan', meta: 'Rekening utama, 1 Nov', amount: 12400000 },
  { label: 'Transfer antar dompet', meta: 'Dompet tunai, 1 Nov', amount: 1500000 }
]

const shopping = [
  { label: 'Beras 5 kg', price: 72000, done: true },
  { label: 'Telur 1 kg', price: 32000, done: false },
  { label: 'Sabun cuci 2 pcs', price: 46000, done: false }
]
</script>

<template>
  <div class="lp-parallax lp-parallax-hero lp-depth" style="--lp-parallax: 36px">
    <div
      class="overflow-hidden rounded-[18px] w-full max-w-6xl mx-auto border border-rule bg-card text-foreground shadow-[0_36px_90px_-45px_rgba(0,0,0,0.5)] sm:rounded-[24px]"
    >
      <div class="flex items-center justify-between gap-3 border-b border-rule px-4 py-3.5 sm:px-5">
        <div class="flex min-w-0 items-center gap-2.5">
          <span
            class="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
            aria-hidden="true"
          >
            <UIcon name="i-lucide-house" class="size-4" />
          </span>
          <div class="min-w-0">
            <p class="m-0 truncate text-sm font-semibold leading-[1.3]">Rumah Tangga Budi</p>
            <p class="m-0 text-xs leading-[1.4] text-muted-foreground">Ringkasan November 2026</p>
          </div>
        </div>
        <span
          class="shrink-0 rounded-full border border-border px-2 py-1 text-xs leading-[1.4] text-muted-foreground"
          >Data contoh</span
        >
      </div>

      <div class="grid grid-cols-1 gap-3 p-3.5 sm:p-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div class="flex min-w-0 flex-col gap-3">
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div
              v-for="kpi in kpis"
              :key="kpi.label"
              class="rounded-xl border border-rule bg-background p-3"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="m-0 text-xs leading-[1.35] text-muted-foreground">{{ kpi.label }}</p>
                <UIcon :name="kpi.icon" class="size-3.5 text-muted-foreground" aria-hidden="true" />
              </div>
              <p
                class="mt-1.5 mb-0 truncate text-base font-semibold leading-tight tracking-[-0.02em] tabular-nums"
                :class="kpi.tone"
              >
                {{ kpi.value }}
              </p>
            </div>
          </div>

          <div class="rounded-xl border border-rule bg-background p-3.5">
            <div class="mb-3 flex items-center justify-between gap-2">
              <div>
                <p class="m-0 text-sm font-semibold leading-[1.35]">Anggaran bulan ini</p>
                <p class="m-0 text-xs leading-[1.35] text-muted-foreground">
                  Pagu dan sisa per kategori
                </p>
              </div>
              <span class="shrink-0 text-xs leading-[1.35] text-muted-foreground">3 kategori</span>
            </div>
            <div v-for="budget in budgets" :key="budget.label" class="mb-3 last:mb-0">
              <div class="flex items-baseline justify-between gap-2.5 text-xs leading-[1.35]">
                <span class="font-medium">{{ budget.label }}</span>
                <span class="tabular-nums text-muted-foreground">{{ budget.used }}%</span>
              </div>
              <div
                class="my-1.5 h-1.5 overflow-hidden rounded-full bg-soft-strong"
                aria-hidden="true"
              >
                <span
                  class="block h-full rounded-[inherit] bg-primary"
                  :style="{ width: `${budget.used}%` }"
                />
              </div>
              <p class="m-0 text-xs leading-[1.35] text-muted-foreground">{{ budget.amount }}</p>
            </div>
          </div>

          <div class="hidden rounded-xl border border-rule bg-background p-3.5 lg:block">
            <div class="mb-1.5 flex items-center justify-between gap-2">
              <p class="m-0 text-sm font-semibold leading-[1.35]">Transaksi terbaru</p>
              <span class="text-xs leading-[1.35] text-muted-foreground">Contoh</span>
            </div>
            <div
              v-for="transaction in transactions"
              :key="transaction.label"
              class="flex items-center gap-2 border-t border-rule py-2 first-of-type:border-t-0"
            >
              <div class="min-w-0 flex-auto">
                <p class="m-0 truncate text-xs font-medium leading-[1.35]">
                  {{ transaction.label }}
                </p>
                <p class="m-0 truncate text-xs leading-[1.35] text-muted-foreground">
                  {{ transaction.meta }}
                </p>
              </div>
              <p
                class="m-0 shrink-0 text-xs font-semibold tabular-nums"
                :class="transaction.amount > 0 ? 'text-success' : ''"
              >
                {{
                  transaction.amount > 0
                    ? formatRupiah(transaction.amount, true)
                    : formatRupiah(transaction.amount)
                }}
              </p>
            </div>
          </div>
        </div>

        <div class="flex min-w-0 flex-col gap-3">
          <div class="rounded-xl border border-rule bg-background p-3.5">
            <div class="mb-1.5 flex items-center justify-between gap-2">
              <p class="m-0 text-sm font-semibold leading-[1.35]">Akan datang</p>
              <span class="text-xs leading-[1.35] text-muted-foreground">2 tagihan</span>
            </div>
            <div
              v-for="bill in bills"
              :key="bill.label"
              class="flex items-center gap-2.5 border-t border-rule py-2.5 first-of-type:border-t-0"
            >
              <span
                class="inline-flex size-[28px] shrink-0 items-center justify-center rounded-lg bg-soft text-primary"
                aria-hidden="true"
              >
                <UIcon :name="bill.paid ? 'i-lucide-check' : 'i-lucide-receipt'" class="size-4" />
              </span>
              <div class="min-w-0 flex-auto">
                <p class="m-0 truncate text-xs font-medium leading-[1.35]">{{ bill.label }}</p>
                <p class="m-0 truncate text-xs leading-[1.35] text-muted-foreground">
                  {{ bill.due }}
                </p>
              </div>
              <p class="m-0 shrink-0 text-xs font-semibold tabular-nums">
                {{ formatRupiah(bill.amount) }}
              </p>
            </div>
          </div>

          <div class="hidden rounded-xl border border-rule bg-background p-3.5 sm:block">
            <div class="mb-1.5 flex items-center justify-between gap-2">
              <p class="m-0 text-sm font-semibold leading-[1.35]">Daftar belanja</p>
              <span class="text-xs leading-[1.35] text-muted-foreground">3 item</span>
            </div>
            <div
              v-for="item in shopping"
              :key="item.label"
              class="flex items-center gap-2 border-t border-rule py-2 first-of-type:border-t-0"
            >
              <span
                class="inline-flex size-[16px] shrink-0 items-center justify-center rounded-[4px] border text-primary-foreground"
                :class="item.done ? 'border-primary bg-primary' : 'border-border'"
                aria-hidden="true"
              >
                <UIcon v-if="item.done" name="i-lucide-check" class="size-3" />
              </span>
              <span
                class="min-w-0 flex-auto truncate text-xs"
                :class="item.done ? 'text-muted-foreground line-through' : ''"
                >{{ item.label }}</span
              >
              <span class="shrink-0 text-xs font-semibold tabular-nums">{{
                formatRupiah(item.price)
              }}</span>
            </div>
          </div>

          <div class="rounded-xl bg-soft px-3.5 py-3">
            <p class="m-0 text-xs leading-[1.35] text-muted-foreground">Sisa bulan ini</p>
            <p
              class="mt-0.5 mb-0 text-lg font-semibold leading-[1.25] tracking-[-0.02em] tabular-nums"
            >
              {{ formatRupiah(4550000) }}
            </p>
            <p class="m-0 text-xs leading-[1.35] text-muted-foreground">
              Setelah pemasukan dan pengeluaran tercatat
            </p>
          </div>
        </div>
      </div>

      <p
        class="m-0 border-t border-rule px-4 pt-2.5 pb-3 text-xs leading-[1.45] text-muted-foreground sm:px-5"
      >
        Pratinjau antarmuka dengan data sintetis. Bukan tangkapan layar akun pengguna.
      </p>
    </div>
  </div>
</template>
