<script setup lang="ts">
import VehicleFormModal from '~/components/vehicles/VehicleFormModal.vue'
import type { VehicleFormValues, VehicleItem } from '~/types/vehicles'
import type {
  VehicleActiveObligationItem,
  VehicleServiceScheduleItem
} from '~/types/vehicleOverview'
import { VEHICLE_OVERVIEW_ITEM_LIMIT } from '~/utils/vehicleOverview'
import { formatYmd } from '~/utils/format'
import {
  formatObligationAmount,
  isObligationDueDatePast
} from '~/utils/vehicleObligations'

// Vehicles Overview: the existing household vehicle list plus two bounded,
// read-only previews sourced from the verified nested maintenance and
// obligation endpoints. The overview never creates a new route or aggregate:
// browser -> Nuxt /api -> Laravel. Vehicle create/edit/delete remain owned by
// useVehicles and the detail page.
definePageMeta({ middleware: ['auth', 'onboarding'] })

const toast = useToast()
const auth = useAuth()
const vehicles = useVehicles()
const { items, pending, submitting, error, fieldErrors } = vehicles
const overview = useVehicleOverview(items)

const {
  vehicleCount,
  scannedVehicleCount,
  overviewTruncated,
  serviceSchedules,
  servicesPending,
  servicesStarted,
  servicesError,
  servicesFailedVehicleIds,
  activeObligations,
  obligationsPending,
  obligationsStarted,
  obligationsError,
  obligationsFailedVehicleIds,
  refresh: refreshOverview,
  retryServices,
  retryObligations
} = overview

const formOpen = ref(false)
const isOwner = computed(() => auth.isHouseholdOwner.value)

const displayedServiceSchedules = computed(
  () => serviceSchedules.value.slice(0, VEHICLE_OVERVIEW_ITEM_LIMIT)
)
const displayedActiveObligations = computed(
  () => activeObligations.value.slice(0, VEHICLE_OVERVIEW_ITEM_LIMIT)
)

const vehicleSummaryLine = computed(() => {
  if (pending.value && items.value.length === 0 && !error.value) {
    return 'Memuat ringkasan kendaraan rumah tangga.'
  }

  if (error.value && items.value.length === 0) {
    return 'Ringkasan kendaraan belum dapat dimuat.'
  }

  if (vehicleCount.value === 0) {
    return 'Belum ada kendaraan tercatat.'
  }

  return `${vehicleCount.value} kendaraan tercatat · jadwal servis dan kewajiban mendatang.`
})

const overviewLimitDescription = computed(
  () => `Jadwal servis dan kewajiban dihitung dari ${scannedVehicleCount.value} kendaraan pertama dari ${vehicleCount.value} kendaraan pada daftar. Daftar kendaraan lengkap tetap tersedia di bawah.`
)

const servicesPartialTitle = computed(
  () => servicesFailedVehicleIds.value.length >= scannedVehicleCount.value
    ? 'Jadwal servis belum dapat diperbarui.'
    : 'Sebagian jadwal servis belum dapat dimuat.'
)

const servicesPartialDescription = computed(() => {
  const base = `${servicesFailedVehicleIds.value.length} dari ${scannedVehicleCount.value} kendaraan gagal dimuat.`

  return servicesError.value ? `${base} ${servicesError.value}` : base
})

const obligationsPartialTitle = computed(
  () => obligationsFailedVehicleIds.value.length >= scannedVehicleCount.value
    ? 'Kewajiban aktif belum dapat diperbarui.'
    : 'Sebagian kewajiban aktif belum dapat dimuat.'
)

const obligationsPartialDescription = computed(() => {
  const base = `${obligationsFailedVehicleIds.value.length} dari ${scannedVehicleCount.value} kendaraan gagal dimuat.`

  return obligationsError.value ? `${base} ${obligationsError.value}` : base
})

const servicesLimitNote = computed(() => {
  if (serviceSchedules.value.length <= displayedServiceSchedules.value.length) {
    return null
  }

  const scope = servicesFailedVehicleIds.value.length > 0
    ? 'jadwal yang berhasil dimuat'
    : 'jadwal terdekat'

  return `Menampilkan ${displayedServiceSchedules.value.length} dari ${serviceSchedules.value.length} ${scope}.`
})

const obligationsLimitNote = computed(() => {
  if (activeObligations.value.length <= displayedActiveObligations.value.length) {
    return null
  }

  const scope = obligationsFailedVehicleIds.value.length > 0
    ? 'kewajiban yang berhasil dimuat'
    : 'kewajiban terdekat'

  return `Menampilkan ${displayedActiveObligations.value.length} dari ${activeObligations.value.length} ${scope}.`
})

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

    await refreshOverview()
  }
}

function retryVehicles(): void {
  void vehicles.refresh()
}

function retryServiceSchedules(): void {
  void retryServices()
}

function retryActiveObligations(): void {
  void retryObligations()
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

function vehicleIdentity(item: VehicleItem): string {
  return item.plate_number ? `${item.name} · ${item.plate_number}` : item.name
}

function serviceDateLine(item: VehicleServiceScheduleItem): string {
  return item.maintenance.scheduled_date
    ? `Jadwal ${formatYmd(item.maintenance.scheduled_date)}`
    : 'Tanggal belum dicatat'
}

function serviceOdometerLine(item: VehicleServiceScheduleItem): string | null {
  return item.maintenance.odometer != null
    ? `${item.maintenance.odometer.toLocaleString('id-ID')} km`
    : null
}

function obligationDueDateLine(item: VehicleActiveObligationItem): string {
  return `Jatuh tempo ${formatYmd(item.obligation.due_date)}`
}

function obligationAmount(item: VehicleActiveObligationItem): string | null {
  return formatObligationAmount(item.obligation.amount)
}

await vehicles.load()

// Keep the vehicle list immediately usable while the bounded overview loads
// independently after hydration. Each section owns its pending/error state.
onMounted(() => {
  void refreshOverview()
})
</script>

<template>
  <div class="flex w-full flex-col gap-4 sm:gap-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h1 class="truncate text-xl font-bold tracking-tight text-highlighted sm:text-2xl">Kendaraan</h1>
        <p class="mt-0.5 text-sm text-muted">{{ vehicleSummaryLine }}</p>
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
      :actions="[{ label: 'Coba lagi', onClick: retryVehicles }]"
    />

    <template v-else>
      <!-- The overview intentionally scans a bounded prefix of the vehicle
           list. Say so explicitly instead of implying the previews cover every
           vehicle when the household owns more than the scan limit. -->
      <UAlert
        v-if="overviewTruncated"
        color="warning"
        variant="soft"
        title="Ringkasan mencakup sebagian kendaraan."
        :description="overviewLimitDescription"
      />

      <div class="grid gap-4 lg:grid-cols-2">
        <section
          class="flex flex-col gap-3 rounded-2xl border border-default bg-background p-4 sm:p-5"
          aria-label="Jadwal servis mendatang"
        >
          <div class="min-w-0">
            <h2 class="text-sm font-semibold tracking-wide text-muted uppercase">Jadwal Servis Mendatang</h2>
            <p class="mt-1 text-sm text-muted">
              Catatan servis berstatus terjadwal, diurutkan berdasarkan tanggal.
            </p>
          </div>

          <div
            v-if="!servicesStarted || (servicesPending && serviceSchedules.length === 0)"
            class="flex flex-col gap-2"
            aria-label="Memuat jadwal servis mendatang"
          >
            <USkeleton v-for="index in 3" :key="index" class="h-16" />
          </div>

          <UAlert
            v-else-if="servicesError && serviceSchedules.length === 0"
            color="error"
            variant="soft"
            title="Jadwal servis mendatang belum dapat dimuat."
            :description="servicesError"
            :actions="[{ label: 'Coba lagi', onClick: retryServiceSchedules }]"
          />

          <template v-else>
            <div
              v-if="servicesError"
              class="rounded-lg bg-elevated px-3 py-2 text-xs text-muted"
            >
              <p>
                <span class="font-medium text-highlighted">{{ servicesPartialTitle }}</span>
                {{ servicesPartialDescription }}
              </p>
              <UButton
                size="xs"
                color="neutral"
                variant="outline"
                class="mt-2"
                @click="retryServiceSchedules()"
              >
                Coba lagi
              </UButton>
            </div>

            <div v-if="displayedServiceSchedules.length === 0" class="py-6 text-center">
              <p class="text-sm text-muted">Belum ada jadwal servis mendatang.</p>
              <p class="mt-1 text-xs text-muted">Hanya catatan berstatus terjadwal yang ditampilkan.</p>
            </div>

            <ul
              v-else
              class="flex flex-col divide-y divide-default rounded-xl border border-default px-3"
            >
              <li v-for="item in displayedServiceSchedules" :key="item.maintenance.id">
                <NuxtLink
                  :to="`/vehicles/${item.vehicle.id}`"
                  class="flex w-full items-start gap-3 py-3 text-left"
                >
                  <span
                    class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-elevated"
                    aria-hidden="true"
                  >
                    <UIcon name="i-lucide-wrench" class="size-4 text-default" />
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-xs text-muted">{{ vehicleIdentity(item.vehicle) }}</span>
                    <span class="block truncate text-sm font-medium text-highlighted">
                      {{ item.maintenance.title }}
                    </span>
                    <span class="mt-0.5 block text-xs text-muted">
                      {{ serviceDateLine(item) }}
                      <template v-if="serviceOdometerLine(item)">
                        · {{ serviceOdometerLine(item) }}
                      </template>
                    </span>
                  </span>
                  <UIcon
                    name="i-lucide-chevron-right"
                    class="mt-1 size-4 shrink-0 text-muted"
                    aria-hidden="true"
                  />
                </NuxtLink>
              </li>
            </ul>

            <p v-if="servicesLimitNote" class="text-xs text-muted">{{ servicesLimitNote }}</p>
          </template>
        </section>

        <section
          class="flex flex-col gap-3 rounded-2xl border border-default bg-background p-4 sm:p-5"
          aria-label="Kewajiban aktif"
        >
          <div class="min-w-0">
            <h2 class="text-sm font-semibold tracking-wide text-muted uppercase">Kewajiban Aktif</h2>
            <p class="mt-1 text-sm text-muted">
              Kewajiban administratif berstatus aktif, diurutkan berdasarkan jatuh tempo.
            </p>
          </div>

          <div
            v-if="!obligationsStarted || (obligationsPending && activeObligations.length === 0)"
            class="flex flex-col gap-2"
            aria-label="Memuat kewajiban aktif"
          >
            <USkeleton v-for="index in 3" :key="index" class="h-16" />
          </div>

          <UAlert
            v-else-if="obligationsError && activeObligations.length === 0"
            color="error"
            variant="soft"
            title="Kewajiban aktif belum dapat dimuat."
            :description="obligationsError"
            :actions="[{ label: 'Coba lagi', onClick: retryActiveObligations }]"
          />

          <template v-else>
            <div
              v-if="obligationsError"
              class="rounded-lg bg-elevated px-3 py-2 text-xs text-muted"
            >
              <p>
                <span class="font-medium text-highlighted">{{ obligationsPartialTitle }}</span>
                {{ obligationsPartialDescription }}
              </p>
              <UButton
                size="xs"
                color="neutral"
                variant="outline"
                class="mt-2"
                @click="retryActiveObligations()"
              >
                Coba lagi
              </UButton>
            </div>

            <div v-if="displayedActiveObligations.length === 0" class="py-6 text-center">
              <p class="text-sm text-muted">Belum ada kewajiban aktif.</p>
              <p class="mt-1 text-xs text-muted">Hanya kewajiban berstatus aktif yang ditampilkan.</p>
            </div>

            <ul
              v-else
              class="flex flex-col divide-y divide-default rounded-xl border border-default px-3"
            >
              <li v-for="item in displayedActiveObligations" :key="item.obligation.id">
                <NuxtLink
                  :to="`/vehicles/${item.vehicle.id}`"
                  class="flex w-full items-start gap-3 py-3 text-left"
                >
                  <span
                    class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-elevated"
                    aria-hidden="true"
                  >
                    <UIcon name="i-lucide-file-badge" class="size-4 text-default" />
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-xs text-muted">
                      {{ item.obligation.obligation_type.name }} · {{ vehicleIdentity(item.vehicle) }}
                    </span>
                    <span class="block truncate text-sm font-medium text-highlighted">
                      {{ item.obligation.title }}
                    </span>
                    <span class="mt-0.5 block text-xs text-muted">
                      {{ obligationDueDateLine(item) }}
                      <span
                        v-if="isObligationDueDatePast(item.obligation)"
                        class="ml-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      >
                        Tanggal sudah lewat
                      </span>
                    </span>
                    <span
                      v-if="obligationAmount(item)"
                      class="mt-0.5 block text-xs text-muted"
                    >
                      {{ obligationAmount(item) }}
                    </span>
                  </span>
                  <UIcon
                    name="i-lucide-chevron-right"
                    class="mt-1 size-4 shrink-0 text-muted"
                    aria-hidden="true"
                  />
                </NuxtLink>
              </li>
            </ul>

            <p v-if="obligationsLimitNote" class="text-xs text-muted">{{ obligationsLimitNote }}</p>
          </template>
        </section>
      </div>

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
