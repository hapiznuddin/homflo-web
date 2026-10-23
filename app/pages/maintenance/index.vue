<script setup lang="ts">
import MaintenanceFormModal from '~/components/maintenance/MaintenanceFormModal.vue'
import type { MaintenanceFilter, MaintenanceFormValues, MaintenanceItem } from '~/types/maintenance'
import {
  MAINTENANCE_FILTER_OPTIONS,
  filterMaintenance,
  maintenancePriorityChipClass,
  maintenancePriorityLabel,
  maintenanceStatusChipClass,
  maintenanceStatusLabel
} from '~/utils/maintenance'
import { formatYmd } from '~/utils/format'

// Daftar perawatan rumah tangga: semua member boleh membaca; create hanya
// owner (role dari /api/auth/me → useAuth().isHouseholdOwner). Baris membuka
// /maintenance/{id}. Endpoint list tidak mendukung query status, jadi filter
// status dilakukan client-side. Nama aset di-resolve lewat composable Assets
// yang sudah ada (sumber data tunggal) — bukan request asset kedua.
definePageMeta({ middleware: ['auth', 'onboarding'] })

const toast = useToast()
const auth = useAuth()
const maintenance = useMaintenance()
const assetsApi = useAssets()

const { items, pending, submitting, error, fieldErrors } = maintenance
const { items: assetItems, pending: assetsPending, error: assetsError } = assetsApi

const filter = ref<MaintenanceFilter>('all')
const formOpen = ref(false)
const isOwner = computed(() => auth.isHouseholdOwner.value)

const assetNames = computed(() => {
  const map = new Map<string, string>()

  for (const asset of assetItems.value) {
    map.set(asset.id, asset.name)
  }

  return map
})

const filtered = computed(() => filterMaintenance(items.value, filter.value))

function assetLabel(item: MaintenanceItem): string | null {
  return item.asset_id ? assetNames.value.get(item.asset_id) ?? null : null
}

function subtitle(item: MaintenanceItem): string {
  const parts: string[] = []
  const asset = assetLabel(item)

  if (asset) {
    parts.push(asset)
  }

  if (item.location) {
    parts.push(item.location)
  }

  if (item.scheduled_date) {
    parts.push(`Jadwal ${formatYmd(item.scheduled_date)}`)
  }

  return parts.join(' · ') || 'Tanpa detail'
}

function openCreate(): void {
  maintenance.clearError()
  void assetsApi.load()
  formOpen.value = true
}

async function onFormSubmit(values: MaintenanceFormValues): Promise<void> {
  const saved = await maintenance.create(values)

  if (saved) {
    formOpen.value = false
    toast.add({
      title: 'Perawatan ditambah',
      description: 'Data tersimpan.',
      color: 'success'
    })
  }
}

function onFormOpenChange(value: boolean): void {
  formOpen.value = value

  if (!value) {
    maintenance.clearError()
  }
}

function retry(): void {
  void maintenance.refresh()
}

await maintenance.load()
void assetsApi.load()
</script>

<template>
  <div class="flex w-full flex-col gap-4 sm:gap-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h1 class="truncate text-xl font-bold tracking-tight text-highlighted sm:text-2xl">Perawatan Rumah</h1>
        <p class="mt-0.5 text-sm text-muted">Jadwal perawatan dan servis barang rumah tangga.</p>
      </div>
      <div v-if="isOwner" class="flex shrink-0 gap-2">
        <UButton icon="i-lucide-plus" @click="openCreate()">Tambah Perawatan</UButton>
      </div>
    </div>

    <div class="flex flex-wrap gap-1.5" aria-label="Filter status perawatan">
      <UButton
        v-for="option in MAINTENANCE_FILTER_OPTIONS"
        :key="option.value"
        size="xs"
        :color="filter === option.value ? 'primary' : 'neutral'"
        :variant="filter === option.value ? 'solid' : 'outline'"
        @click="filter = option.value"
      >
        {{ option.label }}
      </UButton>
    </div>

    <div v-if="pending && items.length === 0" class="flex flex-col gap-3" aria-label="Memuat perawatan">
      <USkeleton v-for="index in 5" :key="index" class="h-16" />
    </div>

    <UAlert
      v-else-if="error && items.length === 0"
      color="error"
      variant="soft"
      title="Data perawatan belum dapat dimuat."
      :description="error"
      :actions="[{ label: 'Coba lagi', onClick: retry }]"
    />

    <template v-else>
      <div v-if="items.length === 0" class="py-10 text-center">
        <p class="text-sm text-muted">Belum ada catatan perawatan.</p>
        <UButton
          v-if="isOwner"
          color="neutral"
          variant="outline"
          size="sm"
          class="mt-3"
          @click="openCreate()"
        >
          Tambah Perawatan
        </UButton>
      </div>

      <div v-else-if="filtered.length === 0" class="py-10 text-center">
        <p class="text-sm text-muted">Tidak ada perawatan dengan status ini.</p>
      </div>

      <ul v-else class="flex flex-col divide-y divide-default rounded-2xl border border-default bg-background px-4">
        <li v-for="item in filtered" :key="item.id">
          <NuxtLink
            :to="`/maintenance/${item.id}`"
            class="flex w-full items-center gap-3 py-3 text-left first:pt-3 last:pb-3"
          >
            <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-elevated" aria-hidden="true">
              <UIcon name="i-lucide-wrench" class="size-4.5 text-default" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-medium text-highlighted">{{ item.title }}</span>
              <span class="block truncate text-xs text-muted">{{ subtitle(item) }}</span>
            </span>
            <span
              class="hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium sm:inline"
              :class="maintenancePriorityChipClass(item.priority)"
            >
              {{ maintenancePriorityLabel(item.priority) }}
            </span>
            <span
              class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
              :class="maintenanceStatusChipClass(item.status)"
            >
              {{ maintenanceStatusLabel(item.status) }}
            </span>
            <UIcon name="i-lucide-chevron-right" class="size-4 shrink-0 text-muted" aria-hidden="true" />
          </NuxtLink>
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

    <MaintenanceFormModal
      :open="formOpen"
      :editing="null"
      :submitting="submitting"
      :error="error"
      :field-errors="fieldErrors"
      :assets="assetItems"
      :assets-pending="assetsPending"
      :assets-error="assetsError"
      @update:open="onFormOpenChange"
      @submit="onFormSubmit"
      @retry-assets="assetsApi.refresh()"
    />
  </div>
</template>
