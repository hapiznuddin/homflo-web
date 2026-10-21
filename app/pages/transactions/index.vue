<script setup lang="ts">
import TransactionDetailModal from '~/components/transactions/TransactionDetailModal.vue'
import TransactionFormModal from '~/components/transactions/TransactionFormModal.vue'
import type { TransactionFormValues, TransactionItem, TransactionType } from '~/types/transactions'
import { formatTransactionAmount, transactionAmountClass, transactionAmountSign, transactionTypeIcon, transactionTypeLabel } from '~/utils/transactions'
import { formatYmd } from '~/utils/format'

definePageMeta({ middleware: ['auth', 'onboarding'] })

const toast = useToast()
const tx = useTransactions()
const { items, meta, pending, submitting, error, fieldErrors } = tx

const categories = useCategories()
const { items: categoryItems, pending: categoriesPending, error: categoriesError } = categories

// Pilihan dompet aktif untuk form create (read-only API; hanya is_active
// yang ditawarkan — pola bills page). Tanpa halaman manajemen dompet di
// web, pengguna tanpa dompet melihat empty state jujur di form.
const wallets = useWallets()
const { items: walletItems, pending: walletsPending, error: walletsError } = wallets

const typeFilter = ref<'all' | TransactionType>('all')
const categoryFilter = ref('all')
const dateFrom = ref('')
const dateTo = ref('')

const formOpen = ref(false)
const editing = ref<TransactionItem | null>(null)

const detailOpen = ref(false)
const detailId = ref('')
const detailItem = ref<TransactionItem | null>(null)
const detailLoading = ref(false)
const detailError = ref<string | null>(null)
const confirmDelete = ref(false)

const hasActiveFilter = computed(() => typeFilter.value !== 'all' || categoryFilter.value !== 'all' || dateFrom.value !== '' || dateTo.value !== '')

function displayTitle(item: TransactionItem): string {
  if (item.description && item.description.trim() !== '') {
    return item.description
  }

  if (item.category) {
    return item.category.name
  }

  return transactionTypeLabel(item.type)
}

function typeIcon(item: TransactionItem): string {
  if (item.category?.icon) {
    return item.category.icon
  }

  return transactionTypeIcon(item.type)
}

async function applyFilters(): Promise<void> {
  await tx.load({
    ...(typeFilter.value === 'all' ? {} : { type: typeFilter.value }),
    ...(categoryFilter.value === 'all' ? {} : { category_id: categoryFilter.value }),
    ...(dateFrom.value === '' ? {} : { date_from: dateFrom.value }),
    ...(dateTo.value === '' ? {} : { date_to: dateTo.value })
  }, true)
}

async function resetFilters(): Promise<void> {
  typeFilter.value = 'all'
  categoryFilter.value = 'all'
  dateFrom.value = ''
  dateTo.value = ''

  await tx.load({}, true)
}

async function goToPage(page: number): Promise<void> {
  if (page < 1 || page > meta.value.last_page || page === meta.value.current_page) {
    return
  }

  await tx.load({ ...tx.filters.value, page }, true)
}

function openCreate(): void {
  editing.value = null
  tx.clearError()
  formOpen.value = true
}

function openEdit(item: TransactionItem): void {
  editing.value = item
  detailOpen.value = false
  confirmDelete.value = false
  tx.clearError()
  formOpen.value = true
}

async function onFormSubmit(values: TransactionFormValues): Promise<void> {
  const saved = editing.value
    ? await tx.update(editing.value.id, values)
    : await tx.create(values)

  if (saved) {
    const wasEditing = editing.value !== null

    formOpen.value = false
    editing.value = null
    toast.add({
      title: wasEditing ? 'Transaksi diubah' : 'Transaksi ditambah',
      description: 'Data tersimpan.',
      color: 'success'
    })
  }
}

async function openDetail(item: TransactionItem): Promise<void> {
  detailId.value = item.id
  detailItem.value = null
  detailError.value = null
  confirmDelete.value = false
  detailLoading.value = true
  detailOpen.value = true

  try {
    detailItem.value = await tx.fetchOne(item.id)
  } catch (err) {
    detailError.value = readError(err, 'Detail belum dapat dimuat.')
  } finally {
    detailLoading.value = false
  }
}

async function retryDetail(): Promise<void> {
  if (detailId.value === '') {
    return
  }

  detailError.value = null
  detailLoading.value = true

  try {
    detailItem.value = await tx.fetchOne(detailId.value)
  } catch (err) {
    detailError.value = readError(err, 'Detail belum dapat dimuat.')
  } finally {
    detailLoading.value = false
  }
}

async function onDeleteRequest(): Promise<void> {
  if (!detailItem.value) {
    return
  }

  if (!confirmDelete.value) {
    confirmDelete.value = true

    return
  }

  const id = detailItem.value.id
  const ok = await tx.remove(id)

  if (ok) {
    detailOpen.value = false
    detailItem.value = null
    confirmDelete.value = false
    toast.add({
      title: 'Transaksi dihapus',
      description: 'Data terhapus.',
      color: 'success'
    })
  }
}

function retry(): void {
  void tx.refresh()
}

await tx.load()
await categories.load()

// Non-blocking (state global dipakai bersama halaman bills; fresh-guard
// composable mencegah pemuatan berulang).
void wallets.load()
</script>

<template>
  <div class="flex flex-col gap-4 sm:gap-5 w-full">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h1 class="truncate text-xl font-bold tracking-tight text-highlighted sm:text-2xl">Transaksi</h1>
        <p class="mt-0.5 text-sm text-muted">Arus kas keluar &amp; masuk rumah tangga.</p>
      </div>
      <div class="flex shrink-0 gap-2">
        <UButton icon="i-lucide-tags" color="neutral" variant="outline" to="/categories">Kelola kategori</UButton>
        <UButton icon="i-lucide-plus" @click="openCreate()">Tambah</UButton>
      </div>
    </div>

    <div class="flex flex-col gap-2 rounded-2xl border border-default bg-background p-3 sm:flex-row sm:items-end">
      <div class="min-w-0 flex-1">
        <label for="tx-filter-type" class="mb-1 block text-xs font-medium text-muted">Jenis</label>
        <USelect
          id="tx-filter-type"
          v-model="typeFilter"
          :items="[
            { label: 'Semua', value: 'all' },
            { label: 'Pemasukan', value: 'income' },
            { label: 'Pengeluaran', value: 'expense' },
            { label: 'Transfer', value: 'transfer' }
          ]"
          value-key="value"
          class="w-full"
          @change="applyFilters()"
        />
      </div>
      <div class="min-w-0 flex-1">
        <label for="tx-filter-category" class="mb-1 block text-xs font-medium text-muted">Kategori</label>
        <USelect
          id="tx-filter-category"
          v-model="categoryFilter"
          :items="[{ label: 'Semua', value: 'all' }, ...categoryItems.map(category => ({ label: category.name, value: category.id }))]"
          value-key="value"
          class="w-full"
          :loading="categoriesPending"
          :disabled="categoriesPending || categoriesError !== null"
          @change="applyFilters()"
        />
        <p v-if="categoriesError" class="mt-1 text-xs text-error">
          {{ categoriesError }}
          <UButton variant="link" size="xs" class="px-1" @click="categories.refresh()">Coba lagi</UButton>
        </p>
      </div>
      <div class="min-w-0 flex-1">
        <label for="tx-filter-from" class="mb-1 block text-xs font-medium text-muted">Dari tanggal</label>
        <UInput id="tx-filter-from" v-model="dateFrom" type="date" class="w-full" @change="applyFilters()" />
      </div>
      <div class="min-w-0 flex-1">
        <label for="tx-filter-to" class="mb-1 block text-xs font-medium text-muted">Sampai tanggal</label>
        <UInput id="tx-filter-to" v-model="dateTo" type="date" class="w-full" @change="applyFilters()" />
      </div>
      <UButton v-if="hasActiveFilter" color="neutral" variant="ghost" class="shrink-0" @click="resetFilters()">
        Atur ulang
      </UButton>
    </div>

    <div v-if="pending && items.length === 0" class="flex flex-col gap-3" aria-label="Memuat transaksi">
      <USkeleton v-for="index in 5" :key="index" class="h-16" />
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      title="Data transaksi belum dapat dimuat."
      :description="error"
      :actions="[{ label: 'Coba lagi', onClick: retry }]"
    />

    <template v-else>
      <div v-if="items.length === 0" class="py-10 text-center">
        <p class="text-sm text-muted">
          {{ hasActiveFilter ? 'Tidak ada transaksi yang cocok dengan filter.' : 'Belum ada transaksi tercatat.' }}
        </p>
        <UButton v-if="!hasActiveFilter" color="neutral" variant="outline" size="sm" class="mt-3" @click="openCreate()">
          Tambah Transaksi
        </UButton>
      </div>

      <ul v-else class="flex flex-col divide-y divide-default rounded-2xl border border-default bg-background px-4">
        <li v-for="item in items" :key="item.id">
          <button
            type="button"
            class="flex w-full items-center gap-3 py-3 text-left first:pt-3 last:pb-3"
            @click="openDetail(item)"
          >
            <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-elevated" aria-hidden="true">
              <UIcon :name="typeIcon(item)" class="size-4.5 text-default" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-medium text-highlighted">{{ displayTitle(item) }}</span>
              <span class="block truncate text-xs text-muted">{{ formatYmd(item.occurred_on) }}<span v-if="item.wallet"> · {{ item.wallet }}</span><span v-if="item.bill_payment"> · Pembayaran tagihan</span></span>
            </span>
            <span class="flex shrink-0 flex-col items-end gap-1">
              <span class="text-sm font-semibold" :class="transactionAmountClass(item.type)">
                {{ transactionAmountSign(item.type) }}{{ formatTransactionAmount(item.amount) }}
              </span>
              <span v-if="item.category" class="max-w-28 truncate rounded-full bg-elevated px-2 py-0.5 text-[11px] text-muted">
                {{ item.category.name }}
              </span>
            </span>
          </button>
        </li>
      </ul>

      <div v-if="meta.total > 0" class="flex items-center justify-between gap-2 text-sm text-muted">
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          :disabled="meta.current_page <= 1 || pending"
          @click="goToPage(meta.current_page - 1)"
        >
          Sebelumnya
        </UButton>
        <p aria-live="polite">Halaman {{ meta.current_page }} dari {{ meta.last_page }} · {{ meta.total }} transaksi</p>
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          :disabled="meta.current_page >= meta.last_page || pending"
          @click="goToPage(meta.current_page + 1)"
        >
          Berikutnya
        </UButton>
      </div>
    </template>

    <TransactionFormModal
      v-model:open="formOpen"
      :editing="editing"
      :submitting="submitting"
      :submit-error="error"
      :field-errors="fieldErrors"
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

    <TransactionDetailModal
      v-model:open="detailOpen"
      :item="detailItem"
      :loading="detailLoading"
      :error="detailError"
      :deleting="submitting"
      :confirm-delete="confirmDelete"
      @edit="openEdit"
      @delete="onDeleteRequest"
      @cancel-delete="confirmDelete = false"
      @retry="retryDetail"
    />
  </div>
</template>
