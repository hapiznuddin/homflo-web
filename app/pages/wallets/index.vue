<script setup lang="ts">
import type { WalletType } from '~/types/wallets'
import { formatTransactionAmount } from '~/utils/transactions'

// Halaman Dompet (P1-6): READ-ONLY. Daftar dompet berasal dari
// GET /api/wallets (member-wide) dan saldo adalah nilai server hasil
// perhitungan opening balance + transaksi + penyesuaian — bukan saldo
// berjalan yang disimpan dan bukan aritmetika client.
//
// Tidak ada proxy/aksi tulis di halaman ini: backend menyediakan kontrak
// tulis owner-only, tetapi Phase P1-6 memprioritaskan tampilan dan
// pemilihan dompet. Manajemen dompet adalah pekerjaan terpisah.
definePageMeta({ middleware: ['auth', 'onboarding'] })

const wallets = useWallets()
const { items, pending, error } = wallets

function typeLabel(type: WalletType): string {
  if (type === 'cash') {
    return 'Tunai'
  }

  if (type === 'bank') {
    return 'Bank'
  }

  return 'Dompet digital'
}

function typeIcon(type: WalletType): string {
  if (type === 'cash') {
    return 'i-lucide-banknote'
  }

  if (type === 'bank') {
    return 'i-lucide-landmark'
  }

  return 'i-lucide-smartphone'
}

function retry(): void {
  void wallets.refresh()
}

await wallets.load()
</script>

<template>
  <div class="flex w-full flex-col gap-4 sm:gap-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h1 class="truncate text-xl font-bold tracking-tight text-highlighted sm:text-2xl">Dompet</h1>
        <p class="mt-0.5 text-sm text-muted">Tempat uang rumah tangga dicatat.</p>
      </div>
      <UButton icon="i-lucide-plus" class="shrink-0" to="/transactions">Catat transaksi</UButton>
    </div>

    <div v-if="pending && items.length === 0" class="flex flex-col gap-3" aria-label="Memuat dompet">
      <USkeleton v-for="index in 3" :key="index" class="h-20 w-full rounded-2xl" />
    </div>

    <UAlert
      v-else-if="error && items.length === 0"
      color="error"
      variant="soft"
      title="Data dompet belum dapat dimuat."
      :description="error"
      :actions="[{ label: 'Coba lagi', onClick: retry }]"
    />

    <template v-else>
      <div
        v-if="items.length === 0"
        class="flex flex-col items-center gap-3 rounded-2xl border border-default bg-background px-4 py-10 text-center"
      >
        <span class="flex size-11 items-center justify-center rounded-xl bg-elevated" aria-hidden="true">
          <UIcon name="i-lucide-wallet-minimal" class="size-5 text-muted" />
        </span>
        <p class="text-sm font-medium text-highlighted">Belum ada dompet.</p>
        <p class="max-w-sm text-sm text-muted">
          Setiap rumah tangga seharusnya memiliki dompet default <span class="font-medium text-highlighted">Cash</span>.
          Jika daftar ini kosong, muat ulang data dompet.
        </p>
        <UButton color="neutral" variant="outline" size="sm" @click="retry()">Muat ulang</UButton>
      </div>

      <ul v-else class="flex flex-col divide-y divide-default rounded-2xl border border-default bg-background px-4">
        <li
          v-for="wallet in items"
          :key="wallet.id"
          class="flex items-center gap-3 py-3.5"
          :class="wallet.is_active ? '' : 'opacity-70'"
        >
          <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-elevated" aria-hidden="true">
            <UIcon :name="typeIcon(wallet.type)" class="size-5 text-default" />
          </span>

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p class="truncate text-sm font-medium text-highlighted">{{ wallet.name }}</p>
              <UBadge
                :color="wallet.is_active ? 'success' : 'neutral'"
                variant="soft"
                size="sm"
              >
                {{ wallet.is_active ? 'Aktif' : 'Nonaktif' }}
              </UBadge>
            </div>
            <p class="mt-0.5 truncate text-xs text-muted">
              {{ typeLabel(wallet.type) }} · Saldo awal {{ formatTransactionAmount(wallet.opening_balance) }}
            </p>
          </div>

          <div class="shrink-0 text-right">
            <p class="text-sm font-semibold" :class="wallet.is_active ? 'text-highlighted' : 'text-muted'">
              {{ formatTransactionAmount(wallet.balance) }}
            </p>
            <p class="text-[11px] text-muted">Saldo saat ini</p>
          </div>
        </li>
      </ul>

      <UAlert
        v-if="error && items.length > 0"
        color="error"
        variant="soft"
        title="Data dompet mungkin sudah tidak terbaru."
        :description="error"
        :actions="[{ label: 'Coba lagi', onClick: retry }]"
      />
    </template>

    <p class="text-xs text-muted">
      Saldo dompet dihitung server dari saldo awal, pemasukan, pengeluaran, transfer, dan penyesuaian.
      Tidak ada saldo berjalan yang disimpan.
    </p>
  </div>
</template>
