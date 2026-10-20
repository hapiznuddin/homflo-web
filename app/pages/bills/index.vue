<script setup lang="ts">
import BillDetailModal from '~/components/bills/BillDetailModal.vue'
import BillFormModal from '~/components/bills/BillFormModal.vue'
import BillPaymentModal from '~/components/bills/BillPaymentModal.vue'
import BillRecurrenceModal from '~/components/bills/BillRecurrenceModal.vue'
import type { BillDetail, BillFormValues, BillItem, BillPayFormValues, BillRecurrenceFormValues } from '~/types/bills'
import { BILL_UI_STATUS_LABELS, billStatusChipClass, billUiStatus, frequencyLabel } from '~/utils/bills'
import { formatTransactionAmount } from '~/utils/transactions'
import { formatYmd } from '~/utils/format'

definePageMeta({ middleware: ['auth', 'onboarding'] })

const toast = useToast()
const auth = useAuth()

const bills = useBills()
const { items, pending, submitting, error, fieldErrors } = bills

const categories = useCategories()
const { items: categoryItems, pending: categoriesPending, error: categoriesError } = categories

const wallets = useWallets()
const { items: walletItems, pending: walletsPending, error: walletsError } = wallets

const tab = ref<'active' | 'archive'>('active')

const formOpen = ref(false)
const editing = ref<BillItem | null>(null)

const detailOpen = ref(false)
const detailId = ref('')
const detailItem = ref<BillDetail | null>(null)
const detailLoading = ref(false)
const detailError = ref<string | null>(null)
const confirmDelete = ref(false)
const confirmArchive = ref(false)

const payOpen = ref(false)

const recurrenceOpen = ref(false)
const recurrenceSource = ref<BillItem | null>(null)

// include_archived=true mengembalikan aktif + terarsip (kontrak backend);
// tab Arsip menyaring baris is_active=false di sisi tampilan (field
// backend, bukan status yang dihitung ulang).
const visibleItems = computed(() =>
  items.value.filter(bill => (tab.value === 'archive' ? !bill.is_active : bill.is_active))
)

const isOwner = computed(() => auth.isHouseholdOwner.value)

// Deteksi best-effort dari daftar yang sedang termuat: periode aktif
// terakhir dari sebuah jadwal (gap G-1 — tanpa GET recurrence).
const lastActivePeriod = computed(() => {
  const bill = detailItem.value
  const recurrenceId = bill?.recurrence?.id

  if (!bill || !recurrenceId) {
    return false
  }

  return items.value.every(other =>
    other.id === bill.id || !other.is_active || other.recurrence?.id !== recurrenceId
  )
})

async function switchTab(next: 'active' | 'archive'): Promise<void> {
  if (tab.value === next) {
    return
  }

  tab.value = next

  await bills.load({ include_archived: next === 'archive' }, true)
}

function openCreate(): void {
  if (items.value.length > 0) {
    bills.clearError()
  }

  editing.value = null
  formOpen.value = true
}

function openEdit(item: BillItem): void {
  if (items.value.length > 0) {
    bills.clearError()
  }

  editing.value = item
  detailOpen.value = false
  confirmDelete.value = false
  confirmArchive.value = false
  formOpen.value = true
}

async function reloadDetail(): Promise<void> {
  if (detailId.value === '') {
    return
  }

  detailError.value = null
  detailLoading.value = true

  try {
    detailItem.value = await bills.fetchOne(detailId.value)
  } catch (err) {
    detailError.value = readError(err, 'Detail belum dapat dimuat.')
  } finally {
    detailLoading.value = false
  }
}

async function openDetail(item: BillItem): Promise<void> {
  detailId.value = item.id
  detailItem.value = null
  detailError.value = null
  confirmDelete.value = false
  confirmArchive.value = false
  detailLoading.value = true
  detailOpen.value = true

  await reloadDetail()
}

async function onFormSubmit(values: BillFormValues): Promise<void> {
  const saved = editing.value
    ? await bills.update(editing.value.id, values)
    : await bills.create(values)

  if (saved) {
    const wasEditing = editing.value !== null

    formOpen.value = false
    editing.value = null
    toast.add({
      title: wasEditing ? 'Tagihan diubah' : 'Tagihan ditambah',
      description: 'Data tersimpan.',
      color: 'success'
    })
  }
}

async function onDeleteRequest(): Promise<void> {
  if (!detailItem.value) {
    return
  }

  if (!confirmDelete.value) {
    confirmDelete.value = true
    confirmArchive.value = false

    return
  }

  const target = detailItem.value
  const ok = await bills.remove(target.id)

  if (ok) {
    detailOpen.value = false
    detailItem.value = null
    detailId.value = ''
    confirmDelete.value = false
    toast.add({
      title: 'Tagihan dihapus',
      description: target.recurrence
        ? 'Periode ini dilewati secara permanen; jadwal tidak ikut berhenti.'
        : 'Data terhapus.',
      color: 'success'
    })
  }
}

async function onArchiveRequest(): Promise<void> {
  if (!detailItem.value) {
    return
  }

  if (!confirmArchive.value) {
    confirmArchive.value = true
    confirmDelete.value = false

    return
  }

  const result = await bills.archive(detailItem.value.id)

  if (result) {
    detailOpen.value = false
    detailItem.value = null
    detailId.value = ''
    confirmArchive.value = false
    toast.add({
      title: 'Tagihan diarsipkan',
      description: 'Tersimpan di tab Arsip; riwayat pembayaran tetap ada.',
      color: 'success'
    })
  }
}

function openPay(): void {
  if (items.value.length > 0) {
    bills.clearError()
  }

  // Dimuat saat dibutuhkan (freshness short-circuit mencegah permintaan
  // berulang); read-only GET /api/wallets.
  void wallets.load()
  payOpen.value = true
}

async function onPaySubmit(values: BillPayFormValues): Promise<void> {
  const result = await bills.pay(detailId.value, values)

  if (result) {
    payOpen.value = false
    toast.add({
      title: 'Tagihan dibayar',
      description: 'Pembayaran lunas tercatat.',
      color: 'success'
    })

    await reloadDetail()
    void wallets.refresh()
  }
}

function onPayOpenChange(value: boolean): void {
  payOpen.value = value

  if (!value) {
    // Tutup gagal/selesai dari UI: buang error modal agar daftar tidak
    // tertimpa alert, lalu segarkan status terbaru (mis. sudah dibayar).
    bills.clearError()
    void bills.refresh()
    void reloadDetail()
  }
}

function openRecurrence(bill: BillItem): void {
  if (!bill.recurrence) {
    return
  }

  if (items.value.length > 0) {
    bills.clearError()
  }

  detailOpen.value = false
  formOpen.value = false
  recurrenceSource.value = bill
  recurrenceOpen.value = true
}

async function onRecurrenceSubmit(changes: Partial<BillRecurrenceFormValues>): Promise<void> {
  const source = recurrenceSource.value

  if (!source?.recurrence) {
    return
  }

  const updated = await bills.updateRecurrence(source.recurrence.id, changes)

  if (updated) {
    recurrenceOpen.value = false
    recurrenceSource.value = null
    toast.add({
      title: 'Jadwal diubah',
      description: 'Hanya periode yang belum dibayar dan aktif yang diperbarui.',
      color: 'success'
    })
  }
}

function onRecurrenceOpenChange(value: boolean): void {
  recurrenceOpen.value = value

  if (!value) {
    recurrenceSource.value = null
    bills.clearError()
  }
}

function retry(): void {
  void bills.refresh()
}

await bills.load()
await categories.load()
</script>

<template>
  <div class="flex flex-col gap-4 sm:gap-5 w-full">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h1 class="truncate text-xl font-bold tracking-tight text-highlighted sm:text-2xl">Tagihan</h1>
        <p class="mt-0.5 text-sm text-muted">Tagihan rutin &amp; jatuh tempo rumah tangga.</p>
      </div>
      <UButton v-if="isOwner" icon="i-lucide-plus" @click="openCreate()">Tambah Tagihan</UButton>
    </div>

    <div class="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter tagihan">
      <UButton
        size="sm"
        :color="tab === 'active' ? 'primary' : 'neutral'"
        :variant="tab === 'active' ? 'soft' : 'outline'"
        :aria-pressed="tab === 'active'"
        @click="switchTab('active')"
      >
        Berjalan
      </UButton>
      <UButton
        size="sm"
        :color="tab === 'archive' ? 'primary' : 'neutral'"
        :variant="tab === 'archive' ? 'soft' : 'outline'"
        :aria-pressed="tab === 'archive'"
        @click="switchTab('archive')"
      >
        Arsip
      </UButton>
      <span class="text-xs text-muted">Tab Arsip menampilkan tagihan yang sudah diarsipkan.</span>
    </div>

    <div v-if="pending && visibleItems.length === 0" class="flex flex-col gap-3" aria-label="Memuat tagihan">
      <USkeleton v-for="index in 5" :key="index" class="h-16" />
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      title="Data tagihan belum dapat dimuat."
      :description="error"
      :actions="[{ label: 'Coba lagi', onClick: retry }]"
    />

    <template v-else>
      <div v-if="visibleItems.length === 0" class="py-10 text-center">
        <p class="text-sm text-muted">
          {{ tab === 'archive' ? 'Belum ada tagihan diarsipkan.' : 'Belum ada tagihan berjalan.' }}
        </p>
        <UButton
          v-if="tab === 'active' && isOwner"
          color="neutral"
          variant="outline"
          size="sm"
          class="mt-3"
          @click="openCreate()"
        >
          Tambah Tagihan
        </UButton>
      </div>

      <ul v-else class="flex flex-col divide-y divide-default rounded-2xl border border-default bg-background px-4">
        <li v-for="item in visibleItems" :key="item.id">
          <button
            type="button"
            class="flex w-full items-center gap-3 py-3 text-left first:pt-3 last:pb-3"
            @click="openDetail(item)"
          >
            <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-elevated" aria-hidden="true">
              <UIcon name="i-lucide-receipt" class="size-4.5 text-default" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-1">
                <span class="truncate text-sm font-medium text-highlighted">{{ item.title }}</span>
                <UIcon
                  v-if="item.recurrence"
                  name="i-lucide-repeat"
                  class="size-3.5 shrink-0 text-muted"
                  :title="`Jadwal ${frequencyLabel(item.recurrence.frequency)}`"
                />
              </span>
              <span class="block truncate text-xs text-muted">
                {{ item.due_date ? `Jatuh tempo ${formatYmd(item.due_date)}` : 'Tanpa tanggal jatuh tempo' }}
              </span>
            </span>
            <span class="flex shrink-0 flex-col items-end gap-1">
              <span class="text-sm font-semibold text-highlighted">{{ formatTransactionAmount(item.amount) }}</span>
              <span class="flex max-w-44 flex-wrap justify-end gap-1">
                <span
                  class="rounded-full px-2 py-0.5 text-[11px] font-medium"
                  :class="billStatusChipClass(billUiStatus(item))"
                >
                  {{ BILL_UI_STATUS_LABELS[billUiStatus(item)] }}
                </span>
                <span v-if="item.category" class="max-w-28 truncate rounded-full bg-elevated px-2 py-0.5 text-[11px] text-muted">
                  {{ item.category.name }}
                </span>
              </span>
            </span>
          </button>
        </li>
      </ul>
    </template>

    <BillFormModal
      v-model:open="formOpen"
      :editing="editing"
      :submitting="submitting"
      :error="error"
      :field-errors="fieldErrors"
      :categories="categoryItems"
      :categories-pending="categoriesPending"
      :categories-error="categoriesError"
      @submit="onFormSubmit"
      @retry-categories="categories.refresh()"
      @open-recurrence="openRecurrence"
    />

    <BillDetailModal
      v-model:open="detailOpen"
      :item="detailItem"
      :loading="detailLoading"
      :error="detailError"
      :deleting="submitting"
      :confirm-delete="confirmDelete"
      :archiving="submitting"
      :confirm-archive="confirmArchive"
      :is-owner="isOwner"
      :last-active-period="lastActivePeriod"
      @edit="openEdit"
      @pay="openPay()"
      @archive="onArchiveRequest()"
      @delete="onDeleteRequest()"
      @cancel-delete="confirmDelete = false"
      @cancel-archive="confirmArchive = false"
      @open-recurrence="openRecurrence"
      @retry="reloadDetail()"
    />

    <BillPaymentModal
      :open="payOpen"
      :bill="detailItem"
      :wallets="walletItems"
      :wallets-pending="walletsPending"
      :wallets-error="walletsError"
      :submitting="submitting"
      :error="error"
      @update:open="onPayOpenChange"
      @submit="onPaySubmit"
      @retry-wallets="wallets.refresh()"
    />

    <BillRecurrenceModal
      :open="recurrenceOpen"
      :bill="recurrenceSource"
      :submitting="submitting"
      :error="error"
      :field-errors="fieldErrors"
      @update:open="onRecurrenceOpenChange"
      @submit="onRecurrenceSubmit"
    />
  </div>
</template>
