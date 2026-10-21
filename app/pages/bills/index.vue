<script setup lang="ts">
import BillFormModal from '~/components/bills/BillFormModal.vue'
import type { BillFormValues } from '~/types/bills'
import { BILL_UI_STATUS_LABELS, billStatusChipClass, billUiStatus, frequencyLabel } from '~/utils/bills'
import { formatTransactionAmount } from '~/utils/transactions'
import { formatYmd } from '~/utils/format'

// Bills Overview (Phase 15.3.3): empat tab status — Akan Datang (default),
// Terlambat, Lunas, Arsip — semuanya kelompok field status SERVER
// (billUiStatus: unpaid/overdue/paid/archived; tanpa kalkulasi tanggal di
// browser). Baris membuka Bill Detail (/bills/{id}) sebagai anchor biasa:
// deep-linkable tanpa state modal. Arsip = kontrak include_archived
// (true → aktif + arsip; tanpa param → hanya aktif); tab status lain
// berbagi data aktif yang sama tanpa request ulang.
definePageMeta({ middleware: ['auth', 'onboarding'] })

type TabKey = 'upcoming' | 'overdue' | 'paid' | 'archive'

const TABS: { key: TabKey, label: string }[] = [
  { key: 'upcoming', label: 'Akan Datang' },
  { key: 'overdue', label: 'Terlambat' },
  { key: 'paid', label: 'Lunas' },
  { key: 'archive', label: 'Arsip' }
]

const EMPTY_COPY: Record<TabKey, string> = {
  upcoming: 'Belum ada tagihan yang akan datang.',
  overdue: 'Tidak ada tagihan terlambat.',
  paid: 'Belum ada tagihan lunas.',
  archive: 'Belum ada tagihan diarsipkan.'
}

// Pemetaan key tab → status server (billUiStatus): Akan Datang = unpaid
// (server tidak menghitung overdue di sini — field overdue server yang
// menentukan), Terlambat = overdue, Lunas = paid, Arsip = archived.
const TAB_STATUS: Record<TabKey, ReturnType<typeof billUiStatus>> = {
  upcoming: 'unpaid',
  overdue: 'overdue',
  paid: 'paid',
  archive: 'archived'
}

const toast = useToast()
const auth = useAuth()

const bills = useBills()
const { items, pending, submitting, error, fieldErrors } = bills

const categories = useCategories()
const { items: categoryItems, pending: categoriesPending, error: categoriesError } = categories

const tab = ref<TabKey>('upcoming')
const formOpen = ref(false)

const isOwner = computed(() => auth.isHouseholdOwner.value)

// Grouping tab = filter client-side dari field status server
// (billUiStatus) — bukan query baru; backend hanya mengenal
// include_archived untuk membedakan set data aktif vs aktif + arsip.
const visibleItems = computed(() =>
  items.value.filter(bill => billUiStatus(bill) === TAB_STATUS[tab.value])
)

async function switchTab(next: TabKey): Promise<void> {
  if (tab.value === next) {
    return
  }

  const leavingArchive = tab.value === 'archive'

  tab.value = next

  // Hanya transisi yang melibatkan tab Arsip yang butuh set data berbeda
  // (include_archived); tiga tab status berbagi data aktif yang sama.
  if (next === 'archive' || leavingArchive) {
    await bills.load({ include_archived: next === 'archive' }, true)
  }
}

function openCreate(): void {
  if (items.value.length > 0) {
    bills.clearError()
  }

  formOpen.value = true
}

async function onCreateSubmit(values: BillFormValues): Promise<void> {
  const saved = await bills.create(values)

  if (saved) {
    formOpen.value = false
    toast.add({
      title: 'Tagihan ditambah',
      description: 'Data tersimpan.',
      color: 'success'
    })
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
        v-for="item in TABS"
        :key="item.key"
        size="sm"
        :color="tab === item.key ? 'primary' : 'neutral'"
        :variant="tab === item.key ? 'soft' : 'outline'"
        :aria-pressed="tab === item.key"
        @click="switchTab(item.key)"
      >
        {{ item.label }}
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
          {{ EMPTY_COPY[tab] }}
        </p>
        <UButton
          v-if="tab === 'upcoming' && isOwner"
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
          <NuxtLink
            :to="`/bills/${item.id}`"
            class="flex w-full items-center gap-3 py-3 text-left first:pt-3 last:pb-3"
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
          </NuxtLink>
        </li>
      </ul>
    </template>

    <BillFormModal
      v-model:open="formOpen"
      :editing="null"
      :submitting="submitting"
      :error="error"
      :field-errors="fieldErrors"
      :categories="categoryItems"
      :categories-pending="categoriesPending"
      :categories-error="categoriesError"
      @submit="onCreateSubmit"
      @retry-categories="categories.refresh()"
    />
  </div>
</template>
