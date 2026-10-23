<script setup lang="ts">
import VehicleFormModal from '~/components/vehicles/VehicleFormModal.vue'
import VehicleMaintenanceFormModal from '~/components/vehicles/VehicleMaintenanceFormModal.vue'
import type { VehicleFormValues, VehicleItem } from '~/types/vehicles'
import type {
  VehicleMaintenanceFilter,
  VehicleMaintenanceFormValues,
  VehicleMaintenanceItem
} from '~/types/vehicleMaintenance'
import {
  VEHICLE_MAINTENANCE_FILTER_OPTIONS,
  groupVehicleMaintenance,
  vehicleMaintenanceStatusChipClass,
  vehicleMaintenanceStatusLabel
} from '~/utils/vehicleMaintenance'
import { formatYmd } from '~/utils/format'

// Detail kendaraan deep-linkable (/vehicles/{id}), mandiri terhadap daftar.
// Sumber data GET /api/vehicles/{id} dan
// GET /api/vehicles/{id}/maintenance lewat proxy Nuxt. Role ditentukan dari
// session (/api/auth/me → isHouseholdOwner): member hanya membaca.
// Cross-household / ID asing dimasking backend sebagai 404 — UI menampilkan
// state not-found, bukan empty state, dan tidak logout.
//
// Riwayat servis memakai satu resource vehicle_maintenance. Status lifecycle
// (scheduled/completed) SELALU dari backend; Complete hanya ditawarkan untuk
// record scheduled dan status baru ditampilkan setelah server mengonfirmasi.
// Filter status dilakukan client-side karena endpoint list tidak mendukung
// query status. Data disimpan per vehicle ID agar perpindahan route tidak
// mencampur catatan kendaraan lain.
definePageMeta({ middleware: ['auth', 'onboarding'] })

const route = useRoute()
const toast = useToast()
const auth = useAuth()

const vehicleId = computed(() => String(route.params.id ?? ''))

const vehicles = useVehicles()
const maintenance = useVehicleMaintenance(vehicleId)
const { submitting, error, errorCode, fieldErrors } = vehicles
const {
  items: maintenanceItems,
  pending: maintenancePending,
  submitting: maintenanceSubmitting,
  error: maintenanceError,
  fieldErrors: maintenanceFieldErrors
} = maintenance

const detail = ref<VehicleItem | null>(null)
const loading = ref(true)
const detailError = ref<string | null>(null)
const notFound = ref(false)
const confirmDelete = ref(false)
const formOpen = ref(false)

const maintenanceFilter = ref<VehicleMaintenanceFilter>('all')
const maintenanceFormOpen = ref(false)
const editingMaintenance = ref<VehicleMaintenanceItem | null>(null)
const confirmCompleteId = ref<string | null>(null)
const confirmDeleteId = ref<string | null>(null)

const isOwner = computed(() => auth.isHouseholdOwner.value)

// Konflik domain: kendaraan masih memiliki riwayat servis (409). Ditangani
// eksplisit — bukan sebagai kegagalan generik dan bukan sukses palsu.
const deleteBlocked = computed(() => errorCode.value === 'VEHICLE_HAS_MAINTENANCE_HISTORY')

interface MaintenanceSection {
  key: 'scheduled' | 'completed'
  title: string
  emptyLabel: string
  items: VehicleMaintenanceItem[]
}

// Dua kelompok dari data yang sama: setiap record hanya muncul di satu
// kelompok menurut status backend (tidak diduplikasi). Filter status
// menyembunyikan kelompok yang tidak dipilih tanpa mengubah data server.
const maintenanceSections = computed<MaintenanceSection[]>(() => {
  const groups = groupVehicleMaintenance(maintenanceItems.value)
  const sections: MaintenanceSection[] = []

  if (maintenanceFilter.value !== 'completed') {
    sections.push({
      key: 'scheduled',
      title: 'Jadwal Servis',
      emptyLabel: 'Belum ada jadwal servis.',
      items: groups.scheduled
    })
  }

  if (maintenanceFilter.value !== 'scheduled') {
    sections.push({
      key: 'completed',
      title: 'Riwayat Servis Selesai',
      emptyLabel: 'Belum ada riwayat servis selesai.',
      items: groups.completed
    })
  }

  return sections
})

const maintenanceEmpty = computed(() => maintenanceItems.value.length === 0)

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

    if (candidate.error?.code === 'VEHICLE_NOT_FOUND') {
      return true
    }

    node = candidate.data
  }

  return false
}

function closeMaintenancePanels(): void {
  maintenanceFormOpen.value = false
  editingMaintenance.value = null
  confirmCompleteId.value = null
  confirmDeleteId.value = null
}

async function loadDetail(): Promise<void> {
  loading.value = true
  detailError.value = null
  notFound.value = false
  confirmDelete.value = false
  closeMaintenancePanels()
  vehicles.clearError()

  try {
    detail.value = await vehicles.fetchOne(vehicleId.value)
  } catch (err) {
    detail.value = null
    notFound.value = isNotFound(err)
    detailError.value = readError(err, 'Detail belum dapat dimuat.')
  } finally {
    loading.value = false
  }

  if (detail.value) {
    // Riwayat servis punya state loading/error sendiri; kegagalannya tidak
    // menghapus Informasi Kendaraan yang sudah tampil.
    void maintenance.load(true)
  }
}

// Route kendaraan berubah tanpa remount: muat ulang detail + servis. State
// servis dikunci per vehicle ID sehingga data kendaraan lama tidak terbawa.
watch(vehicleId, () => {
  void loadDetail()
})

function openEdit(): void {
  if (!detail.value) {
    return
  }

  vehicles.clearError()
  formOpen.value = true
}

async function onFormSubmit(values: VehicleFormValues): Promise<void> {
  const saved = await vehicles.update(vehicleId.value, values)

  if (saved) {
    formOpen.value = false
    toast.add({
      title: 'Kendaraan diubah',
      description: 'Data tersimpan.',
      color: 'success'
    })

    await loadDetail()
  }
}

async function onDeleteRequest(): Promise<void> {
  if (!detail.value) {
    return
  }

  if (!confirmDelete.value) {
    vehicles.clearError()
    confirmDelete.value = true

    return
  }

  const ok = await vehicles.remove(detail.value.id)

  if (ok) {
    toast.add({
      title: 'Kendaraan dihapus',
      description: 'Data terhapus.',
      color: 'success'
    })

    await navigateTo('/vehicles')
  } else {
    // Jangan klaim sukses: tutup konfirmasi dan biarkan data kendaraan tetap
    // tampil. Penolakan riwayat servis (409) ditampilkan lewat deleteBlocked.
    confirmDelete.value = false
  }
}

function cancelDelete(): void {
  confirmDelete.value = false
}

function maintenanceDateLine(item: VehicleMaintenanceItem): string {
  if (item.status === 'completed' && item.completed_at) {
    return `Selesai ${formatYmd(item.completed_at)}`
  }

  if (item.scheduled_date) {
    return `Jadwal ${formatYmd(item.scheduled_date)}`
  }

  return 'Tanggal belum dicatat'
}

function maintenanceOdometer(item: VehicleMaintenanceItem): string | null {
  return item.odometer != null ? `${item.odometer.toLocaleString('id-ID')} km` : null
}

function openCreateMaintenance(): void {
  maintenance.clearError()
  editingMaintenance.value = null
  confirmCompleteId.value = null
  confirmDeleteId.value = null
  maintenanceFormOpen.value = true
}

function openEditMaintenance(item: VehicleMaintenanceItem): void {
  maintenance.clearError()
  editingMaintenance.value = item
  confirmCompleteId.value = null
  confirmDeleteId.value = null
  maintenanceFormOpen.value = true
}

function onMaintenanceFormOpenChange(value: boolean): void {
  maintenanceFormOpen.value = value

  if (!value) {
    editingMaintenance.value = null
    maintenance.clearError()
  }
}

async function onMaintenanceFormSubmit(values: VehicleMaintenanceFormValues): Promise<void> {
  const editing = editingMaintenance.value
  const saved = editing
    ? await maintenance.update(editing.id, values)
    : await maintenance.create(values)

  if (saved) {
    maintenanceFormOpen.value = false
    editingMaintenance.value = null
    toast.add({
      title: editing ? 'Catatan servis diubah' : 'Catatan servis ditambah',
      description: 'Data tersimpan.',
      color: 'success'
    })
  }
}

function askComplete(item: VehicleMaintenanceItem): void {
  maintenance.clearError()
  confirmDeleteId.value = null
  confirmCompleteId.value = item.id
}

// Complete satu arah: status hanya dianggap berubah setelah server
// mengonfirmasi. Kegagalan (mis. 422 sudah selesai) tampil sebagai error dan
// tidak pernah menjadi toast sukses.
async function runComplete(item: VehicleMaintenanceItem): Promise<void> {
  const result = await maintenance.complete(item.id)

  confirmCompleteId.value = null

  if (result) {
    toast.add({
      title: 'Servis selesai',
      description: 'Catatan servis ditandai selesai.',
      color: 'success'
    })
  }
}

// Hapus dua langkah: klik pertama hanya membuka konfirmasi. Hanya record
// servis yang dihapus — kendaraan tidak pernah ikut terhapus.
async function requestDelete(item: VehicleMaintenanceItem): Promise<void> {
  if (confirmDeleteId.value !== item.id) {
    maintenance.clearError()
    confirmCompleteId.value = null
    confirmDeleteId.value = item.id

    return
  }

  const ok = await maintenance.remove(item.id)

  confirmDeleteId.value = null

  if (ok) {
    toast.add({
      title: 'Catatan servis dihapus',
      description: 'Data terhapus.',
      color: 'success'
    })
  }
}

function retryMaintenance(): void {
  void maintenance.refresh()
}

await loadDetail()
</script>

<template>
  <div class="flex w-full flex-col gap-4 sm:gap-5">
    <NuxtLink
      to="/vehicles"
      class="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted hover:text-highlighted"
    >
      <UIcon name="i-lucide-arrow-left" class="size-4" aria-hidden="true" />
      Kembali ke daftar
    </NuxtLink>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col gap-3" aria-label="Memuat detail kendaraan">
      <USkeleton class="h-24 w-full rounded-2xl" />
      <USkeleton class="h-40 w-full rounded-2xl" />
    </div>

    <!-- Not-found (404): tanpa retry, hanya jalan pulang. -->
    <div
      v-else-if="notFound"
      class="flex flex-col items-center gap-3 rounded-2xl border border-default bg-background px-4 py-10 text-center"
    >
      <span class="flex size-11 items-center justify-center rounded-xl bg-elevated" aria-hidden="true">
        <UIcon name="i-lucide-search-x" class="size-5 text-muted" aria-hidden="true" />
      </span>
      <p class="text-sm font-medium text-highlighted">Kendaraan tidak ditemukan.</p>
      <p class="text-sm text-muted">Kendaraan mungkin sudah dihapus atau bukan milik rumah tangga ini.</p>
      <UButton color="neutral" variant="outline" to="/vehicles">Kembali ke daftar</UButton>
    </div>

    <!-- Error lain + retry -->
    <div v-else-if="detailError" class="flex flex-col gap-3">
      <UAlert color="error" variant="soft" title="Detail belum dapat dimuat." :description="detailError" />
      <div class="flex gap-2">
        <UButton color="neutral" variant="outline" to="/vehicles">Kembali ke daftar</UButton>
        <UButton block @click="loadDetail()">Coba lagi</UButton>
      </div>
    </div>

    <template v-else-if="detail">
      <section class="flex flex-col gap-3 rounded-2xl border border-default bg-background p-4 sm:p-5">
        <div class="flex items-center gap-3">
          <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-elevated" aria-hidden="true">
            <UIcon name="i-lucide-car" class="size-5 text-default" aria-hidden="true" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-xl font-bold tracking-tight text-highlighted">{{ detail.name }}</p>
            <p v-if="detail.plate_number" class="mt-0.5 text-sm text-muted">{{ detail.plate_number }}</p>
          </div>
        </div>

        <h2 class="text-sm font-semibold tracking-wide text-muted uppercase">Informasi Kendaraan</h2>

        <dl class="flex flex-col gap-2 text-sm">
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Merek</dt>
            <dd class="text-right font-medium">{{ detail.brand ?? 'Tidak dicatat' }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Model</dt>
            <dd class="text-right font-medium">{{ detail.model ?? 'Tidak dicatat' }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Tahun</dt>
            <dd class="text-right font-medium">{{ detail.year ?? 'Tidak dicatat' }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Plat nomor</dt>
            <dd class="text-right font-medium">{{ detail.plate_number ?? 'Tidak dicatat' }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Tipe</dt>
            <dd class="text-right font-medium">{{ detail.type ?? 'Tidak dicatat' }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Odometer</dt>
            <dd class="text-right font-medium">
              {{ detail.odometer != null ? `${detail.odometer.toLocaleString('id-ID')} km` : 'Tidak dicatat' }}
            </dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Diperbarui</dt>
            <dd class="text-right font-medium">{{ formatYmd(detail.updated_at.slice(0, 10)) }}</dd>
          </div>
        </dl>

        <!-- Konflik riwayat servis (409): pesan eksplisit, tanpa sukses palsu. -->
        <UAlert
          v-if="deleteBlocked"
          color="warning"
          variant="soft"
          title="Kendaraan tidak dapat dihapus."
          description="Kendaraan ini memiliki riwayat servis sehingga tidak dapat dihapus. Hapus riwayat servisnya terlebih dahulu."
        />

        <UAlert
          v-else-if="error"
          color="error"
          variant="soft"
          title="Aksi terakhir gagal."
          :description="error"
        />

        <p v-if="!isOwner" class="text-xs text-muted">
          Anda anggota rumah tangga — kendaraan hanya dapat dilihat. Pengelolaan dilakukan pemilik.
        </p>

        <div v-else-if="confirmDelete" class="flex flex-wrap items-center gap-2">
          <p class="min-w-0 flex-1 text-xs text-muted">Hapus kendaraan ini? Data yang dihapus tidak dapat dikembalikan.</p>
          <UButton color="neutral" variant="outline" size="sm" :disabled="submitting" @click="cancelDelete()">
            Batal
          </UButton>
          <UButton color="error" size="sm" :loading="submitting" :disabled="submitting" @click="onDeleteRequest()">
            Ya, hapus
          </UButton>
        </div>

        <div v-else-if="isOwner" class="flex gap-2">
          <UButton icon="i-lucide-pencil" color="neutral" variant="outline" block @click="openEdit()">
            Ubah
          </UButton>
          <UButton icon="i-lucide-trash-2" color="error" variant="outline" block @click="onDeleteRequest()">
            Hapus
          </UButton>
        </div>
      </section>

      <section
        class="flex flex-col gap-3 rounded-2xl border border-default bg-background p-4 sm:p-5"
        aria-label="Riwayat servis"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 class="text-sm font-semibold tracking-wide text-muted uppercase">Riwayat Servis</h2>
            <p class="mt-1 text-sm text-muted">Jadwal dan riwayat servis kendaraan ini.</p>
          </div>
          <UButton v-if="isOwner" icon="i-lucide-plus" size="sm" @click="openCreateMaintenance()">
            Tambah Servis
          </UButton>
        </div>

        <div class="flex flex-wrap gap-1.5" aria-label="Filter status servis">
          <UButton
            v-for="option in VEHICLE_MAINTENANCE_FILTER_OPTIONS"
            :key="option.value"
            size="xs"
            :color="maintenanceFilter === option.value ? 'primary' : 'neutral'"
            :variant="maintenanceFilter === option.value ? 'solid' : 'outline'"
            @click="maintenanceFilter = option.value"
          >
            {{ option.label }}
          </UButton>
        </div>

        <div
          v-if="maintenancePending && maintenanceItems.length === 0"
          class="flex flex-col gap-2"
          aria-label="Memuat riwayat servis"
        >
          <USkeleton v-for="index in 3" :key="index" class="h-14" />
        </div>

        <UAlert
          v-else-if="maintenanceError && maintenanceItems.length === 0"
          color="error"
          variant="soft"
          title="Riwayat servis belum dapat dimuat."
          :description="maintenanceError"
          :actions="[{ label: 'Coba lagi', onClick: retryMaintenance }]"
        />

        <template v-else>
          <div v-if="maintenanceEmpty" class="py-6 text-center">
            <p class="text-sm text-muted">Belum ada catatan servis untuk kendaraan ini.</p>
            <UButton
              v-if="isOwner"
              color="neutral"
              variant="outline"
              size="sm"
              class="mt-3"
              @click="openCreateMaintenance()"
            >
              Tambah Servis
            </UButton>
          </div>

          <template v-else>
            <div v-for="section in maintenanceSections" :key="section.key" class="flex flex-col gap-2">
              <h3 class="text-xs font-semibold tracking-wide text-muted uppercase">{{ section.title }}</h3>

              <p v-if="section.items.length === 0" class="py-2 text-sm text-muted">{{ section.emptyLabel }}</p>

              <ul v-else class="flex flex-col divide-y divide-default rounded-xl border border-default px-3">
                <li v-for="item in section.items" :key="item.id" class="py-3">
                  <div class="flex items-start gap-3">
                    <span
                      class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-elevated"
                      aria-hidden="true"
                    >
                      <UIcon
                        :name="item.status === 'completed' ? 'i-lucide-circle-check' : 'i-lucide-wrench'"
                        class="size-4 text-default"
                      />
                    </span>
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-start justify-between gap-2">
                        <div class="min-w-0">
                          <p class="truncate text-sm font-medium text-highlighted">{{ item.title }}</p>
                          <p v-if="item.description" class="mt-0.5 text-xs text-muted">{{ item.description }}</p>
                          <p class="mt-0.5 text-xs text-muted">
                            {{ maintenanceDateLine(item) }}
                            <template v-if="maintenanceOdometer(item)"> · {{ maintenanceOdometer(item) }}</template>
                          </p>
                        </div>
                        <span
                          class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
                          :class="vehicleMaintenanceStatusChipClass(item.status)"
                        >
                          {{ vehicleMaintenanceStatusLabel(item.status) }}
                        </span>
                      </div>

                      <div
                        v-if="isOwner && confirmCompleteId !== item.id && confirmDeleteId !== item.id"
                        class="mt-2 flex flex-wrap gap-2"
                      >
                        <UButton
                          v-if="item.status === 'scheduled'"
                          size="xs"
                          icon="i-lucide-circle-check"
                          @click="askComplete(item)"
                        >
                          Selesai
                        </UButton>
                        <UButton
                          size="xs"
                          color="neutral"
                          variant="outline"
                          icon="i-lucide-pencil"
                          @click="openEditMaintenance(item)"
                        >
                          Ubah
                        </UButton>
                        <UButton
                          size="xs"
                          color="error"
                          variant="outline"
                          icon="i-lucide-trash-2"
                          @click="requestDelete(item)"
                        >
                          Hapus
                        </UButton>
                      </div>

                      <div
                        v-if="confirmCompleteId === item.id"
                        class="mt-2 flex flex-col gap-2 rounded-lg border border-default p-2"
                      >
                        <p class="text-xs text-muted">
                          Tandai servis ini selesai? Tanggal selesai ditentukan server dan tidak dapat dibuka kembali.
                        </p>
                        <div class="flex gap-2">
                          <UButton
                            size="xs"
                            color="neutral"
                            variant="outline"
                            block
                            :disabled="maintenanceSubmitting"
                            @click="confirmCompleteId = null"
                          >
                            Batal
                          </UButton>
                          <UButton
                            size="xs"
                            block
                            :loading="maintenanceSubmitting"
                            :disabled="maintenanceSubmitting"
                            @click="runComplete(item)"
                          >
                            Ya, selesaikan
                          </UButton>
                        </div>
                      </div>

                      <div
                        v-if="confirmDeleteId === item.id"
                        class="mt-2 flex flex-col gap-2 rounded-lg border border-default p-2"
                      >
                        <p class="text-xs text-muted">
                          Hapus catatan servis ini? Kendaraan tetap tersimpan; data yang dihapus tidak dapat dikembalikan.
                        </p>
                        <div class="flex gap-2">
                          <UButton
                            size="xs"
                            color="neutral"
                            variant="outline"
                            block
                            :disabled="maintenanceSubmitting"
                            @click="confirmDeleteId = null"
                          >
                            Batal
                          </UButton>
                          <UButton
                            size="xs"
                            color="error"
                            block
                            :loading="maintenanceSubmitting"
                            :disabled="maintenanceSubmitting"
                            @click="requestDelete(item)"
                          >
                            Ya, hapus
                          </UButton>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              </ul>
            </div>

            <UAlert
              v-if="maintenanceError"
              color="error"
              variant="soft"
              title="Aksi terakhir gagal."
              :description="maintenanceError"
            />
          </template>
        </template>

        <p v-if="!isOwner" class="text-xs text-muted">
          Anda anggota rumah tangga — riwayat servis hanya dapat dilihat. Pengelolaan dilakukan pemilik.
        </p>
      </section>
    </template>

    <VehicleFormModal
      v-model:open="formOpen"
      :editing="detail"
      :submitting="submitting"
      :error="error"
      :field-errors="fieldErrors"
      @submit="onFormSubmit"
    />

    <VehicleMaintenanceFormModal
      :open="maintenanceFormOpen"
      :editing="editingMaintenance"
      :submitting="maintenanceSubmitting"
      :error="maintenanceError"
      :field-errors="maintenanceFieldErrors"
      @update:open="onMaintenanceFormOpenChange"
      @submit="onMaintenanceFormSubmit"
    />
  </div>
</template>
