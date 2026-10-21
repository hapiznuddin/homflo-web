<script setup lang="ts">
import BudgetFormModal from '~/components/budgets/BudgetFormModal.vue'
import type { BudgetFormValues, BudgetItem } from '~/types/budgets'
import { formatTransactionAmount } from '~/utils/transactions'
import { formatMonthLabel } from '~/utils/format'

definePageMeta({ middleware: ['auth', 'onboarding'] })

const toast = useToast()
const bg = useBudgets()
const { items, period, pending, submitting, error, fieldErrors } = bg

const categories = useCategories()
const { items: categoryItems, pending: categoriesPending, error: categoriesError } = categories

const formOpen = ref(false)
const editing = ref<BudgetItem | null>(null)
const confirmDeleteId = ref<string | null>(null)

function periodKeyOf(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

function parsePeriodKey(key: string): { year: number, month: number } | null {
  const match = key.match(/^(\d{4})-(0[1-9]|1[0-2])$/)

  if (!match) {
    return null
  }

  return { year: Number(match[1]), month: Number(match[2]) }
}

const periodSelectKey = ref(periodKeyOf(period.value.year, period.value.month))

const periodSelectItems = computed(() => {
  const now = new Date()
  const options: Array<{ label: string, value: string }> = []

  for (let offset = 0; offset < 13; offset++) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    const year = date.getFullYear()
    const month = date.getMonth() + 1

    options.push({ label: formatMonthLabel(year, month), value: periodKeyOf(year, month) })
  }

  return options
})

async function onPeriodChange(): Promise<void> {
  const parsed = parsePeriodKey(periodSelectKey.value)

  if (parsed) {
    await bg.load({ year: parsed.year, month: parsed.month, label: formatMonthLabel(parsed.year, parsed.month) }, true)
  }
}

function openCreate(): void {
  editing.value = null
  formOpen.value = true
}

function openEdit(item: BudgetItem): void {
  editing.value = item
  formOpen.value = true
}

async function onFormSubmit(values: BudgetFormValues): Promise<void> {
  const saved = editing.value
    ? await bg.update(editing.value.id, values)
    : await bg.create(values)

  if (saved) {
    const wasEditing = editing.value !== null

    formOpen.value = false
    editing.value = null
    toast.add({
      title: wasEditing ? 'Anggaran diubah' : 'Anggaran ditambah',
      description: 'Data tersimpan.',
      color: 'success'
    })
  }
}

async function onDeleteRequest(item: BudgetItem): Promise<void> {
  if (confirmDeleteId.value !== item.id) {
    confirmDeleteId.value = item.id

    return
  }

  const ok = await bg.remove(item.id)

  confirmDeleteId.value = null

  if (ok) {
    toast.add({
      title: 'Anggaran dihapus',
      description: 'Data terhapus.',
      color: 'success'
    })
  }
}

function cancelDelete(): void {
  confirmDeleteId.value = null
}

// Catatan sisa mengikuti pola mapper dashboard (Sisa/Lebih) dari field
// `remaining` server — hanya format tampilan, tanpa aritmetika baru.
function usageNote(item: BudgetItem): string {
  const remaining = Number(item.remaining)

  if (!Number.isFinite(remaining)) {
    return ''
  }

  return remaining < 0
    ? `Lebih ${formatTransactionAmount(String(Math.abs(remaining)))}`
    : `Sisa ${formatTransactionAmount(item.remaining)}`
}

function retry(): void {
  void bg.refresh()
}

await bg.load()
await categories.load()
</script>

<template>
  <div class="flex flex-col gap-4 sm:gap-5 w-full">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h1 class="truncate text-xl font-bold tracking-tight text-highlighted sm:text-2xl">Anggaran</h1>
        <p class="mt-0.5 text-sm text-muted">Target pengeluaran per kategori setiap bulan.</p>
      </div>
      <UButton icon="i-lucide-plus" class="shrink-0" @click="openCreate()">Tambah</UButton>
    </div>

    <div class="flex flex-col gap-2 rounded-2xl border border-default bg-background p-3 sm:flex-row sm:items-end">
      <div class="min-w-0 flex-1">
        <label for="bg-filter-period" class="mb-1 block text-xs font-medium text-muted">Periode</label>
        <USelect
          id="bg-filter-period"
          v-model="periodSelectKey"
          :items="periodSelectItems"
          value-key="value"
          class="w-full"
          @change="onPeriodChange()"
        />
      </div>
    </div>

    <div v-if="pending && items.length === 0" class="flex flex-col gap-3" aria-label="Memuat anggaran">
      <USkeleton v-for="index in 5" :key="index" class="h-16" />
    </div>

    <UAlert
      v-else-if="error && items.length === 0"
      color="error"
      variant="soft"
      title="Data anggaran belum dapat dimuat."
      :description="error"
      :actions="[{ label: 'Coba lagi', onClick: retry }]"
    />

    <template v-else>
      <div v-if="items.length === 0" class="py-10 text-center">
        <p class="text-sm text-muted">Belum ada anggaran periode ini.</p>
        <UButton color="neutral" variant="outline" size="sm" class="mt-3" @click="openCreate()">
          Tambah Anggaran
        </UButton>
      </div>

      <ul v-else class="flex flex-col divide-y divide-default rounded-2xl border border-default bg-background px-4">
        <li v-for="item in items" :key="item.id" class="flex items-center gap-3 py-3">
          <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-elevated" aria-hidden="true">
            <UIcon :name="item.category?.icon ?? 'i-lucide-wallet'" class="size-4.5 text-default" />
          </span>
          <!-- Pemakaian memakai field usage server apa adanya (Phase 12/15.3.1):
               tanpa agregasi/klasifikasi baru di client. no_budget jujur tanpa
               persentase numerik. Susunan baris meniru kartu Budget dashboard. -->
          <div class="min-w-0 flex-1">
            <div class="flex items-baseline justify-between gap-2">
              <p class="truncate text-sm font-medium text-highlighted">{{ item.category?.name ?? 'Tanpa kategori' }}</p>
              <p v-if="item.usage_percentage !== null" class="shrink-0 text-xs text-muted">{{ item.usage_percentage }}%</p>
              <p v-else class="shrink-0 text-xs text-muted">Tanpa target</p>
            </div>
            <p class="mt-0.5 truncate text-xs text-muted">
              {{ formatMonthLabel(item.year, item.month) }} · {{ formatTransactionAmount(item.actual_spending) }} / {{ formatTransactionAmount(item.amount) }}<template v-if="usageNote(item)"> · {{ usageNote(item) }}</template>
            </p>
            <UProgress
              v-if="item.usage_percentage !== null"
              size="sm"
              :model-value="Math.min(item.usage_percentage, 100)"
              class="mt-2"
              :aria-label="`${item.category?.name ?? 'Anggaran'} ${item.usage_percentage} persen`"
            />
          </div>
          <template v-if="confirmDeleteId !== item.id">
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              square
              icon="i-lucide-pencil"
              aria-label="Ubah anggaran"
              @click="openEdit(item)"
            />
            <UButton
              color="error"
              variant="ghost"
              size="sm"
              square
              icon="i-lucide-trash-2"
              aria-label="Hapus anggaran"
              @click="onDeleteRequest(item)"
            />
          </template>
          <template v-else>
            <UButton color="neutral" variant="outline" size="sm" @click="cancelDelete()">Batal</UButton>
            <UButton color="error" size="sm" :loading="submitting" :disabled="submitting" @click="onDeleteRequest(item)">
              Ya, hapus
            </UButton>
          </template>
        </li>
      </ul>

      <UAlert
        v-if="error && items.length > 0"
        color="error"
        variant="soft"
        title="Aksi terakhir gagal."
        :description="error"
      />
    </template>

    <BudgetFormModal
      v-model:open="formOpen"
      :editing="editing"
      :submitting="submitting"
      :field-errors="fieldErrors"
      :categories="categoryItems"
      :categories-pending="categoriesPending"
      :categories-error="categoriesError"
      :default-year="period.year"
      :default-month="period.month"
      @submit="onFormSubmit"
      @retry-categories="categories.refresh()"
    />
  </div>
</template>
