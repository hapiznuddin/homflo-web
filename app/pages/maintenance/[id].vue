<script setup lang="ts">
import MaintenanceFormModal from '~/components/maintenance/MaintenanceFormModal.vue'
import type { MaintenanceFormValues, MaintenanceItem } from '~/types/maintenance'
import {
  maintenancePriorityLabel,
  maintenanceStatusChipClass,
  maintenanceStatusLabel
} from '~/utils/maintenance'
import { formatYmd } from '~/utils/format'

// Detail perawatan deep-linkable (/maintenance/{id}), mandiri terhadap
// daftar. Sumber data GET /api/maintenance/{id} lewat proxy Nuxt. Status
// lifecycle SELALU dari backend — UI hanya menampilkan aksi yang sesuai dan
// menangani kegagalan transisi dengan pesan jelas. ID asing / lintas
// household dimasking 404 + MAINTENANCE_NOT_FOUND → state not-found, bukan
// logout. Nama aset di-resolve lewat composable Assets yang sudah ada.
definePageMeta({ middleware: ['auth', 'onboarding'] })

const route = useRoute()
const toast = useToast()
const auth = useAuth()
const maintenance = useMaintenance()
const assetsApi = useAssets()

const { submitting, error, fieldErrors } = maintenance
const { items: assetItems, pending: assetsPending, error: assetsError } = assetsApi

const maintenanceId = computed(() => String(route.params.id ?? ''))

const detail = ref<MaintenanceItem | null>(null)
const loading = ref(true)
const detailError = ref<string | null>(null)
const notFound = ref(false)
const formOpen = ref(false)
const confirmComplete = ref(false)
const confirmCancel = ref(false)
const confirmDelete = ref(false)

const isOwner = computed(() => auth.isHouseholdOwner.value)
const isScheduled = computed(() => detail.value?.status === 'scheduled')

const assetName = computed(() => {
  const assetId = detail.value?.asset_id

  if (!assetId) {
    return null
  }

  return assetItems.value.find(asset => asset.id === assetId)?.name ?? null
})

const assetLine = computed(() => {
  if (!detail.value?.asset_id) {
    return 'Tanpa aset'
  }

  return assetName.value ?? 'Aset tidak tersedia'
})

// 404 (ID asing/rusak) = state khusus: tanpa retry — hanya tawarkan
// kembali ke daftar. Proxy [id].get mempertahankan status 401/404 utuh.
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

    if (candidate.error?.code === 'MAINTENANCE_NOT_FOUND') {
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
  confirmComplete.value = false
  confirmCancel.value = false
  confirmDelete.value = false
  maintenance.clearError()

  try {
    detail.value = await maintenance.fetchOne(maintenanceId.value)
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

  maintenance.clearError()
  void assetsApi.load()
  formOpen.value = true
}

function onFormOpenChange(value: boolean): void {
  formOpen.value = value

  if (!value) {
    maintenance.clearError()
  }
}

async function onFormSubmit(values: MaintenanceFormValues): Promise<void> {
  const saved = await maintenance.update(maintenanceId.value, values)

  if (saved) {
    formOpen.value = false
    toast.add({
      title: 'Perawatan diubah',
      description: 'Data tersimpan.',
      color: 'success'
    })

    await loadDetail()
  }
}

// Aksi lifecycle: complete/cancel tidak tersedia untuk status final. Bila
// backend menolak (mis. sudah selesai di sesi lain), error alert menampilkan
// pesan hasil mapping readError; panel konfirmasi ditutup tanpa klaim sukses.
async function runComplete(): Promise<void> {
  const result = await maintenance.complete(maintenanceId.value)

  confirmComplete.value = false

  if (result) {
    toast.add({
      title: 'Perawatan selesai',
      description: 'Ditandai selesai.',
      color: 'success'
    })

    await loadDetail()
  }
}

async function runCancel(): Promise<void> {
  const result = await maintenance.cancel(maintenanceId.value)

  confirmCancel.value = false

  if (result) {
    toast.add({
      title: 'Perawatan dibatalkan',
      description: 'Catatan dibatalkan.',
      color: 'success'
    })

    await loadDetail()
  }
}

async function runDelete(): Promise<void> {
  if (!detail.value) {
    return
  }

  if (!confirmDelete.value) {
    confirmDelete.value = true
    confirmComplete.value = false
    confirmCancel.value = false

    return
  }

  const ok = await maintenance.remove(detail.value.id)

  if (ok) {
    toast.add({
      title: 'Perawatan dihapus',
      description: 'Data terhapus.',
      color: 'success'
    })

    await navigateTo('/maintenance')
  } else {
    // Jangan klaim sukses: tutup konfirmasi dan biarkan alert error tampil.
    confirmDelete.value = false
  }
}

await loadDetail()
void assetsApi.load()
</script>

<template>
  <div class="flex w-full flex-col gap-4 sm:gap-5">
    <NuxtLink
      to="/maintenance"
      class="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted hover:text-highlighted"
    >
      <UIcon name="i-lucide-arrow-left" class="size-4" aria-hidden="true" />
      Kembali ke daftar
    </NuxtLink>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col gap-3" aria-label="Memuat detail perawatan">
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
      <p class="text-sm font-medium text-highlighted">Perawatan tidak ditemukan.</p>
      <p class="text-sm text-muted">Perawatan mungkin sudah dihapus atau bukan milik rumah tangga ini.</p>
      <UButton color="neutral" variant="outline" to="/maintenance">Kembali ke daftar</UButton>
    </div>

    <!-- Error lain + retry -->
    <div v-else-if="detailError" class="flex flex-col gap-3">
      <UAlert color="error" variant="soft" title="Detail belum dapat dimuat." :description="detailError" />
      <div class="flex gap-2">
        <UButton color="neutral" variant="outline" to="/maintenance">Kembali ke daftar</UButton>
        <UButton block @click="loadDetail()">Coba lagi</UButton>
      </div>
    </div>

    <template v-else-if="detail">
      <section class="flex flex-col gap-3 rounded-2xl border border-default bg-background p-4 sm:p-5">
        <div class="flex items-center gap-3">
          <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-elevated" aria-hidden="true">
            <UIcon name="i-lucide-wrench" class="size-5 text-default" aria-hidden="true" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-xl font-bold tracking-tight text-highlighted">{{ detail.title }}</p>
            <p v-if="detail.description" class="mt-0.5 text-sm text-muted">{{ detail.description }}</p>
          </div>
          <span class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium" :class="maintenanceStatusChipClass(detail.status)">
            {{ maintenanceStatusLabel(detail.status) }}
          </span>
        </div>

        <dl class="flex flex-col gap-2 text-sm">
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Aset</dt>
            <dd class="text-right font-medium">{{ assetLine }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Lokasi</dt>
            <dd class="text-right font-medium">{{ detail.location }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Tanggal jadwal</dt>
            <dd class="font-medium">{{ detail.scheduled_date ? formatYmd(detail.scheduled_date) : 'Tidak dicatat' }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Prioritas</dt>
            <dd class="font-medium">{{ maintenancePriorityLabel(detail.priority) }}</dd>
          </div>
          <div v-if="detail.completed_at" class="flex justify-between gap-3">
            <dt class="text-muted">Tanggal selesai</dt>
            <dd class="font-medium">{{ formatYmd(detail.completed_at) }}</dd>
          </div>
          <div v-if="detail.cancelled_at" class="flex justify-between gap-3">
            <dt class="text-muted">Tanggal pembatalan</dt>
            <dd class="font-medium">{{ formatYmd(detail.cancelled_at) }}</dd>
          </div>
        </dl>

        <UAlert
          v-if="error"
          color="error"
          variant="soft"
          title="Aksi terakhir gagal."
          :description="error"
        />

        <p v-if="!isOwner" class="text-xs text-muted">
          Anda anggota rumah tangga — perawatan hanya dapat dilihat. Pengelolaan dilakukan pemilik.
        </p>

        <!-- Aksi: owner-only, mengikuti status backend. scheduled →
             Selesai/Ubah/Batalkan/Hapus; completed & cancelled → final,
             hanya Hapus. -->
        <div v-else-if="!confirmComplete && !confirmCancel && !confirmDelete" class="flex flex-col gap-2 pt-1">
          <div v-if="isScheduled" class="flex gap-2">
            <UButton icon="i-lucide-circle-check" block @click="confirmComplete = true">Selesai</UButton>
            <UButton icon="i-lucide-calendar-clock" color="neutral" variant="outline" block @click="openEdit()">
              Ubah
            </UButton>
          </div>
          <div class="flex gap-2">
            <UButton
              v-if="isScheduled"
              icon="i-lucide-ban"
              color="warning"
              variant="outline"
              block
              @click="confirmCancel = true"
            >
              Batalkan
            </UButton>
            <UButton icon="i-lucide-trash-2" color="error" variant="outline" block @click="runDelete()">
              Hapus
            </UButton>
          </div>
          <p v-if="!isScheduled" class="text-xs text-muted">
            Perawatan sudah {{ maintenanceStatusLabel(detail.status).toLowerCase() }} —
            Selesai/Batalkan hanya tersedia untuk status terjadwal.
          </p>
        </div>

        <div v-else-if="confirmComplete" class="flex flex-col gap-2 pt-1">
          <UAlert
            color="success"
            variant="soft"
            title="Tandai perawatan ini selesai?"
            description="completed_at ditentukan server. Aplikasi tidak menyediakan pembukaan kembali setelah selesai."
          />
          <div class="flex gap-2">
            <UButton color="neutral" variant="outline" block @click="confirmComplete = false">Batal</UButton>
            <UButton block :loading="submitting" :disabled="submitting" @click="runComplete()">
              Ya, selesaikan
            </UButton>
          </div>
        </div>

        <div v-else-if="confirmCancel" class="flex flex-col gap-2 pt-1">
          <UAlert
            color="warning"
            variant="soft"
            title="Batalkan perawatan ini?"
            description="cancelled_at ditentukan server dan bersifat final — tidak ada pengaktifan kembali."
          />
          <div class="flex gap-2">
            <UButton color="neutral" variant="outline" block @click="confirmCancel = false">Batal</UButton>
            <UButton color="warning" block :loading="submitting" :disabled="submitting" @click="runCancel()">
              Ya, batalkan
            </UButton>
          </div>
        </div>

        <div v-else-if="confirmDelete" class="flex flex-col gap-2 pt-1">
          <UAlert
            color="error"
            variant="soft"
            title="Hapus perawatan ini?"
            description="Data yang dihapus tidak dapat dikembalikan."
          />
          <div class="flex gap-2">
            <UButton color="neutral" variant="outline" block @click="confirmDelete = false">Batal</UButton>
            <UButton color="error" block :loading="submitting" :disabled="submitting" @click="runDelete()">
              Ya, hapus
            </UButton>
          </div>
        </div>
      </section>
    </template>

    <MaintenanceFormModal
      :open="formOpen"
      :editing="detail"
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
