<script setup lang="ts">
import VehicleFormModal from '~/components/vehicles/VehicleFormModal.vue'
import type { VehicleFormValues, VehicleItem } from '~/types/vehicles'

// Daftar kendaraan rumah tangga: semua member boleh membaca; create hanya
// owner (role dari /api/auth/me → useAuth().isHouseholdOwner). Baris membuka
// /vehicles/{id}; edit/hapus hidup di halaman detail (pola transaksi/aset).
// Backend sudah mengurutkan berdasarkan nama lalu id — UI memakai urutan
// server apa adanya, tanpa search/filter/pagination.
definePageMeta({ middleware: ['auth', 'onboarding'] })

const toast = useToast()
const auth = useAuth()
const vehicles = useVehicles()
const { items, pending, submitting, error, fieldErrors } = vehicles

const formOpen = ref(false)
const isOwner = computed(() => auth.isHouseholdOwner.value)

function openCreate(): void {
  vehicles.clearError()
  formOpen.value = true
}

async function onFormSubmit(values: VehicleFormValues): Promise<void> {
  const saved = await vehicles.create(values)

  if (saved) {
    formOpen.value = false
    toast.add({
      title: 'Kendaraan ditambah',
      description: 'Data tersimpan.',
      color: 'success'
    })
  }
}

function retry(): void {
  void vehicles.refresh()
}

// Rangkaian identitas ringkas: hanya menampilkan field yang benar-benar
// tersedia (tanpa mengarang nilai default).
function detailLine(item: VehicleItem): string {
  const parts: string[] = []

  if (item.brand) {
    parts.push(item.brand)
  }

  if (item.model) {
    parts.push(item.model)
  }

  if (item.year != null) {
    parts.push(String(item.year))
  }

  if (item.type) {
    parts.push(item.type)
  }

  if (item.plate_number) {
    parts.push(item.plate_number)
  }

  return parts.join(' · ') || 'Tanpa detail tambahan'
}

function odometerLabel(item: VehicleItem): string | null {
  return item.odometer != null ? `${item.odometer.toLocaleString('id-ID')} km` : null
}

await vehicles.load()
</script>

<template>
  <div class="flex w-full flex-col gap-4 sm:gap-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h1 class="truncate text-xl font-bold tracking-tight text-highlighted sm:text-2xl">Kendaraan</h1>
        <p class="mt-0.5 text-sm text-muted">Kendaraan yang dimiliki rumah tangga.</p>
      </div>
      <div v-if="isOwner" class="flex shrink-0 gap-2">
        <UButton icon="i-lucide-plus" @click="openCreate()">Tambah Kendaraan</UButton>
      </div>
    </div>

    <div v-if="pending && items.length === 0" class="flex flex-col gap-3" aria-label="Memuat kendaraan">
      <USkeleton v-for="index in 5" :key="index" class="h-16" />
    </div>

    <UAlert
      v-else-if="error && items.length === 0"
      color="error"
      variant="soft"
      title="Data kendaraan belum dapat dimuat."
      :description="error"
      :actions="[{ label: 'Coba lagi', onClick: retry }]"
    />

    <template v-else>
      <div v-if="items.length === 0" class="py-10 text-center">
        <p class="text-sm text-muted">Belum ada kendaraan tercatat.</p>
        <UButton
          v-if="isOwner"
          color="neutral"
          variant="outline"
          size="sm"
          class="mt-3"
          @click="openCreate()"
        >
          Tambah Kendaraan
        </UButton>
      </div>

      <ul v-else class="flex flex-col divide-y divide-default rounded-2xl border border-default bg-background px-4">
        <li v-for="item in items" :key="item.id">
          <NuxtLink
            :to="`/vehicles/${item.id}`"
            class="flex w-full items-center gap-3 py-3 text-left first:pt-3 last:pb-3"
          >
            <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-elevated" aria-hidden="true">
              <UIcon name="i-lucide-car" class="size-4.5 text-default" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-medium text-highlighted">{{ item.name }}</span>
              <span class="block truncate text-xs text-muted">{{ detailLine(item) }}</span>
            </span>
            <span v-if="odometerLabel(item)" class="shrink-0 text-sm font-medium text-highlighted">
              {{ odometerLabel(item) }}
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

    <VehicleFormModal
      v-model:open="formOpen"
      :editing="null"
      :submitting="submitting"
      :error="error"
      :field-errors="fieldErrors"
      @submit="onFormSubmit"
    />
  </div>
</template>
