<script setup lang="ts">
import TransactionFormModal from '~/components/transactions/TransactionFormModal.vue'
import type { TransactionFormValues, TransactionItem } from '~/types/transactions'
import { formatTransactionAmount, transactionAmountClass, transactionTypeIcon, transactionTypeLabel } from '~/utils/transactions'
import { formatYmd } from '~/utils/format'

// Detail satu transaksi (deep-linkable) — menggantikan modal detail
// (Phase 15.2.3): sumber tunggal tampilan detail, dibuka dari
// Transaction List maupun Recent Transactions Dashboard dengan ID benar.
definePageMeta({ middleware: ['auth', 'onboarding'] })

const route = useRoute()
const toast = useToast()
const tx = useTransactions()
const categories = useCategories()
const wallets = useWallets()

const { items: categoryItems, pending: categoriesPending, error: categoriesError } = categories
const { items: walletItems, pending: walletsPending, error: walletsError } = wallets

const transactionId = computed(() => String(route.params.id ?? ''))

const detail = ref<TransactionItem | null>(null)
const loading = ref(true)
const detailError = ref<string | null>(null)
const notFound = ref(false)
const confirmDelete = ref(false)
const formOpen = ref(false)

// 404 (ID asing/rusak) = state khusus: tanpa retry — hanya tawarkan
// kembali ke daftar. Proxy [id].get mempertahankan status 401/404 utuh.
function isNotFound(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) {
    return false
  }

  const top = err as { statusCode?: number, status?: number, data?: unknown }

  if (top.statusCode === 404 || top.status === 404) {
    return true
  }

  // Envelope Laravel: { data: { error: { code } } } — bisa nested satu
  // level lagi saat diteruskan Nitro.
  let node: unknown = top

  for (let depth = 0; depth < 3; depth++) {
    if (typeof node !== 'object' || node === null) {
      break
    }

    const candidate = node as { error?: { code?: string }, data?: unknown }

    if (candidate.error?.code === 'TRANSACTION_NOT_FOUND') {
      return true
    }

    node = candidate.data
  }

  return false
}

async function loadDetail(): Promise<void> {
  loading.value = true
  detailError.value = null
  notFound.value = false
  confirmDelete.value = false

  try {
    detail.value = await tx.fetchOne(transactionId.value)
  } catch (err) {
    detail.value = null
    notFound.value = isNotFound(err)
    detailError.value = readError(err, 'Detail belum dapat dimuat.')
  } finally {
    loading.value = false
  }
}

function openEdit(): void {
  if (!detail.value) {
    return
  }

  tx.clearError()
  // Non-blocking (fresh-guard composable mencegah pemuatan berulang;
  // state global dipakai bersama halaman transactions).
  void categories.load()
  void wallets.load()
  formOpen.value = true
}

async function onFormSubmit(values: TransactionFormValues): Promise<void> {
  if (!detail.value) {
    return
  }

  const saved = await tx.update(detail.value.id, values)

  if (saved) {
    formOpen.value = false
    detail.value = saved
    toast.add({
      title: 'Transaksi diubah',
      description: 'Data tersimpan.',
      color: 'success'
    })
  }
}

async function onDeleteRequest(): Promise<void> {
  if (!detail.value) {
    return
  }

  if (!confirmDelete.value) {
    confirmDelete.value = true

    return
  }

  const ok = await tx.remove(detail.value.id)

  if (ok) {
    toast.add({
      title: 'Transaksi dihapus',
      description: 'Data terhapus.',
      color: 'success'
    })

    await navigateTo('/transactions')
  }
}

await loadDetail()
</script>

<template>
  <div class="flex w-full flex-col gap-4 sm:gap-5">
    <NuxtLink
      to="/transactions"
      class="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted hover:text-highlighted"
    >
      <UIcon name="i-lucide-arrow-left" class="size-4" aria-hidden="true" />
      Kembali ke daftar
    </NuxtLink>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col gap-3" aria-label="Memuat detail transaksi">
      <USkeleton class="h-24 w-full rounded-2xl" />
      <USkeleton class="h-40 w-full rounded-2xl" />
    </div>

    <!-- Not-found (404): tanpa retry, hanya jalan pulang. -->
    <div
      v-else-if="notFound"
      class="flex flex-col items-center gap-3 rounded-2xl border border-default bg-background px-4 py-10 text-center"
    >
      <span class="flex size-11 items-center justify-center rounded-xl bg-elevated" aria-hidden="true">
        <UIcon name="i-lucide-search-x" class="size-5 text-muted" />
      </span>
      <p class="text-sm font-medium text-highlighted">Transaksi tidak ditemukan.</p>
      <p class="text-sm text-muted">Transaksi mungkin sudah dihapus atau bukan milik rumah tangga ini.</p>
      <UButton color="neutral" variant="outline" to="/transactions">Kembali ke daftar</UButton>
    </div>

    <!-- Error lain + retry -->
    <div v-else-if="detailError" class="flex flex-col gap-3">
      <UAlert color="error" variant="soft" title="Detail belum dapat dimuat." :description="detailError" />
      <div class="flex gap-2">
        <UButton color="neutral" variant="outline" to="/transactions">Kembali ke daftar</UButton>
        <UButton block @click="loadDetail()">Coba lagi</UButton>
      </div>
    </div>

    <template v-else-if="detail">
      <section class="flex flex-col gap-3 rounded-2xl border border-default bg-background p-4 sm:p-5">
        <div class="flex items-center gap-3">
          <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-elevated" aria-hidden="true">
            <UIcon :name="transactionTypeIcon(detail.type)" class="size-5 text-default" />
          </span>
          <div class="min-w-0 flex-1">
            <!-- Transfer netral: tanpa tanda +/-, warna netral — bukan
                 income/expense (Phase 15.2.1). -->
            <p class="text-xl font-bold tracking-tight" :class="transactionAmountClass(detail.type)">
              {{ formatTransactionAmount(detail.amount) }}
            </p>
            <p class="text-sm text-muted">{{ transactionTypeLabel(detail.type) }}</p>
          </div>
        </div>

        <!-- Sumber transaksi dari pembayaran tagihan (D-08): tampilan
             read-only + aksi edit/hapus disembunyikan — guard backend
             BILL_PAYMENT_LOCKED tetap otoritas; ini UX saja. -->
        <div
          v-if="detail.bill_payment"
          class="flex items-start gap-2 rounded-2xl border border-default bg-elevated/50 px-3 py-2 text-sm"
        >
          <UIcon name="i-lucide-receipt" class="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
          <p class="min-w-0">
            <span class="font-medium text-highlighted">Pembayaran tagihan</span>
            — {{ detail.bill_payment.bill_title }}. Transaksi ini terkait pembayaran tagihan dan tidak
            dapat diubah atau dihapus dari sini.
          </p>
        </div>

        <dl class="flex flex-col gap-2 text-sm">
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Tanggal</dt>
            <dd class="font-medium">{{ formatYmd(detail.occurred_on) }}</dd>
          </div>
          <div v-if="detail.category" class="flex justify-between gap-3">
            <dt class="text-muted">Kategori</dt>
            <dd class="font-medium">{{ detail.category.name }}</dd>
          </div>
          <!-- Dompet: source_wallet/destination_wallet dari presenter
               {id,name,type,is_active}; fallback kolom legacy `wallet`
               untuk baris sebelum dompet. -->
          <div class="flex justify-between gap-3">
            <dt class="text-muted">{{ detail.type === 'transfer' ? 'Dompet sumber' : 'Dompet' }}</dt>
            <dd class="font-medium">{{ detail.source_wallet?.name ?? detail.wallet ?? '—' }}</dd>
          </div>
          <div v-if="detail.type === 'transfer'" class="flex justify-between gap-3">
            <dt class="text-muted">Dompet tujuan</dt>
            <dd class="font-medium">{{ detail.destination_wallet?.name ?? '—' }}</dd>
          </div>
          <div v-if="detail.description" class="flex flex-col gap-1">
            <dt class="text-muted">Deskripsi</dt>
            <dd>{{ detail.description }}</dd>
          </div>
        </dl>

        <template v-if="!detail.bill_payment">
          <div v-if="!confirmDelete" class="flex gap-2 pt-1">
            <UButton color="neutral" variant="outline" block @click="openEdit()">Ubah</UButton>
            <UButton color="error" variant="outline" block @click="confirmDelete = true">Hapus</UButton>
          </div>

          <div v-else class="flex flex-col gap-2 pt-1">
            <UAlert color="error" variant="soft" title="Hapus transaksi ini?" description="Data yang dihapus tidak dapat dikembalikan." />
            <div class="flex gap-2">
              <UButton color="neutral" variant="outline" block @click="confirmDelete = false">Batal</UButton>
              <UButton color="error" block :loading="tx.submitting.value" :disabled="tx.submitting.value" @click="onDeleteRequest()">
                Ya, hapus
              </UButton>
            </div>
          </div>
        </template>
      </section>
    </template>

    <TransactionFormModal
      v-model:open="formOpen"
      :editing="detail"
      :submitting="tx.submitting.value"
      :submit-error="tx.error.value"
      :field-errors="tx.fieldErrors.value"
      :categories="categoryItems"
      :categories-pending="categoriesPending"
      :categories-error="categoriesError"
      :wallets="walletItems"
      :wallets-pending="walletsPending"
      :wallets-error="walletsError"
      @submit="onFormSubmit"
      @retry-categories="categories.refresh()"
      @retry-wallets="wallets.refresh()"
    />
  </div>
</template>
