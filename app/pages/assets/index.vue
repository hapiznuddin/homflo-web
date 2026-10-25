<script setup lang="ts">
import AssetFormModal from '~/components/assets/AssetFormModal.vue'
import type { AssetFormValues, AssetItem } from '~/types/assets'
import {
  assetPropertyLabel,
  isAssetPropertyArchived
} from '~/utils/assets'
import { formatRupiah, formatYmd } from '~/utils/format'

// Daftar aset rumah tangga: semua member boleh membaca; create hanya
// owner (role dari /api/auth/me → useAuth().isHouseholdOwner). Baris
// membuka /assets/{id}; edit/hapus hidup di halaman detail (pola
// transaksi). Backend sudah mengurutkan berdasarkan nama — UI memakai
// urutan server apa adanya, tanpa search/filter/pagination.
definePageMeta({ middleware: ['auth', 'onboarding'] })

const toast = useToast()
const auth = useAuth()
const assets = useAssets()
const properties = useProperties()
const { items, pending, submitting, error, fieldErrors } = assets
const {
  items: propertyItems,
  pending: propertiesPending,
  error: propertiesError
} = properties

const formOpen = ref(false)
const isOwner = computed(() => auth.isHouseholdOwner.value)

// Selector hanya boleh menampilkan Property aktif. Jangan memakai load()
// tanpa argumen karena filter arsip dari halaman Property dapat terwarisi.
function loadActiveProperties(force = false): void {
  properties.clearError()
  void properties.load({ include_archived: false }, force)
}

function openCreate(): void {
  assets.clearError()
  loadActiveProperties(true)
  formOpen.value = true
}

function retryProperties(): void {
  loadActiveProperties(true)
}

async function onFormSubmit(values: AssetFormValues): Promise<void> {
  const saved = await assets.create(values)

  if (saved) {
    formOpen.value = false
    toast.add({
      title: 'Aset ditambah',
      description: 'Data tersimpan.',
      color: 'success'
    })
  }
}

function retry(): void {
  void assets.refresh()
}

function detailLine(item: AssetItem): string {
  const parts: string[] = []

  if (item.location) {
    parts.push(item.location)
  }

  if (item.acquired_on) {
    parts.push(`Diperoleh ${formatYmd(item.acquired_on)}`)
  }

  return parts.join(' · ') || 'Tanpa lokasi & tanggal perolehan'
}

function costLabel(item: AssetItem): string | null {
  return item.acquisition_cost ? formatRupiah(Number(item.acquisition_cost)) : null
}

await assets.load()
</script>

<template>
  <div class="flex w-full flex-col gap-4 sm:gap-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h1 class="truncate text-xl font-bold tracking-tight text-highlighted sm:text-2xl">Aset Rumah</h1>
        <p class="mt-0.5 text-sm text-muted">Barang dan aset bernilai yang dimiliki rumah tangga.</p>
      </div>
      <div v-if="isOwner" class="flex shrink-0 gap-2">
        <UButton icon="i-lucide-plus" @click="openCreate()">Tambah Aset</UButton>
      </div>
    </div>

    <div v-if="pending && items.length === 0" class="flex flex-col gap-3" aria-label="Memuat aset">
      <USkeleton v-for="index in 5" :key="index" class="h-16" />
    </div>

    <UAlert
      v-else-if="error && items.length === 0"
      color="error"
      variant="soft"
      title="Data aset belum dapat dimuat."
      :description="error"
      :actions="[{ label: 'Coba lagi', onClick: retry }]"
    />

    <template v-else>
      <div v-if="items.length === 0" class="py-10 text-center">
        <p class="text-sm text-muted">Belum ada aset tercatat.</p>
        <UButton
          v-if="isOwner"
          color="neutral"
          variant="outline"
          size="sm"
          class="mt-3"
          @click="openCreate()"
        >
          Tambah Aset
        </UButton>
      </div>

      <ul v-else class="flex flex-col divide-y divide-default rounded-2xl border border-default bg-background px-4">
        <li v-for="item in items" :key="item.id">
          <NuxtLink
            :to="`/assets/${item.id}`"
            class="flex w-full items-center gap-3 py-3 text-left first:pt-3 last:pb-3"
          >
            <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-elevated" aria-hidden="true">
              <UIcon name="i-lucide-package" class="size-4.5 text-default" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-medium text-highlighted">{{ item.name }}</span>
              <span class="block truncate text-xs text-muted">{{ detailLine(item) }}</span>
              <span class="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs">
                <UIcon name="i-lucide-folder" class="size-3.5 shrink-0 text-muted" aria-hidden="true" />
                <span class="truncate text-muted">{{ assetPropertyLabel(item.property) }}</span>
                <span
                  v-if="isAssetPropertyArchived(item.property)"
                  class="shrink-0 rounded-full bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning"
                >
                  Diarsipkan
                </span>
              </span>
            </span>
            <span v-if="costLabel(item)" class="shrink-0 text-sm font-medium text-highlighted">
              {{ costLabel(item) }}
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

    <AssetFormModal
      v-model:open="formOpen"
      :editing="null"
      :submitting="submitting"
      :error="error"
      :field-errors="fieldErrors"
      :properties="propertyItems"
      :properties-pending="propertiesPending"
      :properties-error="propertiesError"
      @submit="onFormSubmit"
      @retry-properties="retryProperties"
    />
  </div>
</template>
