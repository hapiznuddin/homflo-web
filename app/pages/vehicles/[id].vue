<script setup lang="ts">
import VehicleFormModal from '~/components/vehicles/VehicleFormModal.vue'
import type { VehicleFormValues, VehicleItem } from '~/types/vehicles'
import { formatYmd } from '~/utils/format'

// Detail kendaraan deep-linkable (/vehicles/{id}), mandiri terhadap daftar.
// Sumber data GET /api/vehicles/{id} lewat proxy Nuxt. Role ditentukan dari
// session (/api/auth/me → isHouseholdOwner): member hanya membaca.
// Cross-household / ID asing dimasking backend sebagai 404 + VEHICLE_NOT_FOUND
// — UI menampilkan state not-found, bukan empty state, dan tidak logout.
// Service History / Vehicle Maintenance belum diimplementasikan; halaman ini
// tidak menampilkannya sebagai fitur yang sudah berfungsi.
definePageMeta({ middleware: ['auth', 'onboarding'] })

const route = useRoute()
const toast = useToast()
const auth = useAuth()
const vehicles = useVehicles()
const { submitting, error, errorCode, fieldErrors } = vehicles

const vehicleId = computed(() => String(route.params.id ?? ''))

const detail = ref<VehicleItem | null>(null)
const loading = ref(true)
const detailError = ref<string | null>(null)
const notFound = ref(false)
const confirmDelete = ref(false)
const formOpen = ref(false)

const isOwner = computed(() => auth.isHouseholdOwner.value)

// Konflik domain: kendaraan masih memiliki riwayat servis (409). Ditangani
// eksplisit — bukan sebagai kegagalan generik dan bukan sukses palsu.
const deleteBlocked = computed(() => errorCode.value === 'VEHICLE_HAS_MAINTENANCE_HISTORY')

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

async function loadDetail(): Promise<void> {
  loading.value = true
  detailError.value = null
  notFound.value = false
  confirmDelete.value = false
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
}

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
    </template>

    <VehicleFormModal
      v-model:open="formOpen"
      :editing="detail"
      :submitting="submitting"
      :error="error"
      :field-errors="fieldErrors"
      @submit="onFormSubmit"
    />
  </div>
</template>
