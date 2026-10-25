<script setup lang="ts">
import PropertyFormModal from '~/components/properties/PropertyFormModal.vue'
import { readError, readErrorCode } from '~/composables/useApiError'
import type { PropertyFormValues, PropertyItem } from '~/types/properties'
import { formatYmd } from '~/utils/format'
import {
  isPropertyArchived,
  propertyOwnershipLabel,
  propertyTypeLabel
} from '~/utils/properties'

// Detail Property deep-linkable (/properties/{id}), mandiri terhadap list.
// Sumber data GET /api/properties/{id} lewat proxy Nuxt. Semua anggota boleh
// membaca; edit/archive/restore hanya owner dan backend tetap otoritas.
// Property terarsip tetap dapat dibaca, tetapi PATCH ditolak backend dengan
// 409 PROPERTY_ARCHIVED — UI mengarahkan pengguna ke restore.
definePageMeta({ middleware: ['auth', 'verified'] })

const route = useRoute()
const toast = useToast()
const auth = useAuth()
const properties = useProperties()
const { submitting, error, errorCode, fieldErrors } = properties

const propertyId = computed(() => String(route.params.id ?? ''))
const detail = ref<PropertyItem | null>(null)
const loading = ref(true)
const detailError = ref<string | null>(null)
const notFound = ref(false)
const confirmArchive = ref(false)
const confirmRestore = ref(false)
const formOpen = ref(false)
const notice = ref<string | null>(null)
const detailRequestSeq = ref(0)

const isOwner = computed(() => auth.isHouseholdOwner.value)
const archived = computed(() => isPropertyArchived(detail.value))

function isNotFound(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) {
    return false
  }

  const statusCode = (err as { statusCode?: number }).statusCode
  const status = (err as { status?: number }).status

  return statusCode === 404 || status === 404 || readErrorCode(err) === 'PROPERTY_NOT_FOUND'
}

async function loadDetail(): Promise<void> {
  const requestedId = propertyId.value
  const currentSeq = detailRequestSeq.value + 1

  detailRequestSeq.value = currentSeq
  loading.value = true
  detailError.value = null
  notFound.value = false
  confirmArchive.value = false
  confirmRestore.value = false
  formOpen.value = false
  properties.clearError()

  try {
    const fetched = await properties.fetchOne(requestedId)

    if (detailRequestSeq.value !== currentSeq) {
      return
    }

    detail.value = fetched
  } catch (err) {
    if (detailRequestSeq.value !== currentSeq) {
      return
    }

    detail.value = null
    notFound.value = isNotFound(err)
    detailError.value = notFound.value ? null : readError(err, 'Detail properti belum dapat dimuat.')
  } finally {
    if (detailRequestSeq.value === currentSeq) {
      loading.value = false
    }
  }
}

watch(propertyId, () => {
  notice.value = null
  void loadDetail()
})

function openEdit(): void {
  if (!detail.value || archived.value) {
    return
  }

  properties.clearError()
  notice.value = null
  formOpen.value = true
}

async function onFormSubmit(values: PropertyFormValues): Promise<void> {
  if (!detail.value) {
    return
  }

  const saved = await properties.update(detail.value.id, values)

  if (saved) {
    formOpen.value = false
    notice.value = null
    toast.add({
      title: 'Properti diubah',
      description: 'Data tersimpan.',
      color: 'success'
    })
    await loadDetail()
    return
  }

  if (errorCode.value === 'PROPERTY_ARCHIVED') {
    // State lokal basi (mis. diarsipkan dari tab lain): tutup form, muat
    // ulang detail agar tombol restore muncul, dan pertahankan pesan.
    notice.value = error.value ?? 'Properti sudah diarsipkan. Pulihkan terlebih dahulu sebelum mengubahnya.'
    formOpen.value = false
    await loadDetail()
  } else if (errorCode.value === 'PROPERTY_NOT_FOUND') {
    formOpen.value = false
    await loadDetail()
  }
}

function openArchiveConfirm(): void {
  if (!detail.value || archived.value) {
    return
  }

  properties.clearError()
  confirmArchive.value = true
}

async function handleArchive(): Promise<void> {
  if (!detail.value) {
    return
  }

  const saved = await properties.archive(detail.value.id)

  if (saved) {
    confirmArchive.value = false
    notice.value = null
    toast.add({
      title: 'Properti diarsipkan',
      description: 'Properti tidak dihapus permanen dan dapat dipulihkan.',
      color: 'success'
    })
    await loadDetail()
  }
}

function openRestoreConfirm(): void {
  if (!detail.value || !archived.value) {
    return
  }

  properties.clearError()
  confirmRestore.value = true
}

async function handleRestore(): Promise<void> {
  if (!detail.value) {
    return
  }

  const saved = await properties.restore(detail.value.id)

  if (saved) {
    confirmRestore.value = false
    notice.value = null
    toast.add({
      title: 'Properti dikembalikan',
      description: 'Properti aktif kembali.',
      color: 'success'
    })
    await loadDetail()
  }
}

function retry(): void {
  void loadDetail()
}

await loadDetail()
</script>

<template>
  <div class="flex w-full flex-col gap-4 sm:gap-5">
    <NuxtLink
      to="/properties"
      class="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted hover:text-highlighted"
    >
      <UIcon name="i-lucide-arrow-left" class="size-4" aria-hidden="true" />
      Kembali ke daftar
    </NuxtLink>

    <div v-if="loading" class="flex flex-col gap-3" aria-label="Memuat detail properti">
      <USkeleton class="h-24 w-full rounded-2xl" />
      <USkeleton class="h-40 w-full rounded-2xl" />
    </div>

    <div
      v-else-if="notFound"
      class="flex flex-col items-center gap-3 rounded-2xl border border-default bg-background px-4 py-10 text-center"
    >
      <span class="flex size-11 items-center justify-center rounded-xl bg-elevated" aria-hidden="true">
        <UIcon name="i-lucide-search-x" class="size-5 text-muted" aria-hidden="true" />
      </span>
      <p class="text-sm font-medium text-highlighted">Properti tidak ditemukan.</p>
      <p class="text-sm text-muted">Properti mungkin sudah dihapus atau bukan milik rumah tangga ini.</p>
      <UButton color="neutral" variant="outline" to="/properties">Kembali ke daftar</UButton>
    </div>

    <div v-else-if="detailError" class="flex flex-col gap-3">
      <UAlert color="error" variant="soft" title="Detail belum dapat dimuat." :description="detailError" />
      <div class="flex gap-2">
        <UButton color="neutral" variant="outline" to="/properties">Kembali ke daftar</UButton>
        <UButton block @click="retry()">Coba lagi</UButton>
      </div>
    </div>

    <template v-else-if="detail">
      <UAlert
        v-if="notice"
        color="warning"
        variant="soft"
        title="Properti sudah diarsipkan."
        :description="notice"
      />

      <UAlert
        v-else-if="archived"
        color="warning"
        variant="soft"
        title="Properti dalam arsip."
        description="Properti ini hanya dapat dibaca. Aktifkan kembali untuk mengubahnya."
      />

      <section class="flex flex-col gap-3 rounded-2xl border border-default bg-background p-4 sm:p-5">
        <div class="flex items-start gap-3">
          <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-elevated" aria-hidden="true">
            <UIcon
              :name="archived ? 'i-lucide-archive' : 'i-lucide-folder'"
              class="size-5 text-default"
              aria-hidden="true"
            />
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="break-words text-xl font-bold tracking-tight text-highlighted">{{ detail.name }}</p>
              <span v-if="archived" class="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                Arsip
              </span>
            </div>
            <p class="mt-0.5 text-sm text-muted">{{ detail.address }}</p>
          </div>
        </div>

        <h2 class="text-sm font-semibold tracking-wide text-muted uppercase">Metadata Properti</h2>

        <dl class="flex flex-col gap-2 text-sm">
          <div class="flex justify-between gap-3">
            <dt class="shrink-0 text-muted">Tipe</dt>
            <dd class="min-w-0 text-right font-medium">{{ propertyTypeLabel(detail.type) }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="shrink-0 text-muted">Status kepemilikan</dt>
            <dd class="min-w-0 text-right font-medium">{{ propertyOwnershipLabel(detail.ownership_status) }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="shrink-0 text-muted">Deskripsi</dt>
            <dd class="min-w-0 max-w-[65%] text-right font-medium break-words">{{ detail.description || 'Tidak dicatat' }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="shrink-0 text-muted">Catatan</dt>
            <dd class="min-w-0 max-w-[65%] text-right font-medium break-words">{{ detail.notes || 'Tidak ada' }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="shrink-0 text-muted">Terakhir diperbarui</dt>
            <dd class="min-w-0 text-right font-medium">{{ formatYmd(detail.updated_at.slice(0, 10)) }}</dd>
          </div>
          <div v-if="detail.archived_at" class="flex justify-between gap-3">
            <dt class="shrink-0 text-muted">Diarsipkan</dt>
            <dd class="min-w-0 text-right font-medium text-warning">
              {{ formatYmd(detail.archived_at.slice(0, 10)) }}
            </dd>
          </div>
        </dl>
      </section>

      <div v-if="isOwner" class="flex flex-col gap-2 sm:flex-row">
        <UButton
          v-if="!archived"
          icon="i-lucide-pencil"
          color="neutral"
          variant="outline"
          block
          @click="openEdit()"
        >
          Ubah Properti
        </UButton>
        <UButton
          v-if="!archived"
          icon="i-lucide-archive"
          color="warning"
          variant="outline"
          block
          @click="openArchiveConfirm()"
        >
          Arsipkan Properti
        </UButton>
        <UButton
          v-else
          icon="i-lucide-archive-restore"
          color="primary"
          variant="outline"
          block
          @click="openRestoreConfirm()"
        >
          Aktifkan Kembali
        </UButton>
      </div>

      <p v-else class="text-xs text-muted">
        Anda anggota rumah tangga — properti hanya dapat dilihat. Pengelolaan dilakukan pemilik.
      </p>

      <UAlert
        v-if="error && !formOpen && !confirmArchive && !confirmRestore"
        color="error"
        variant="soft"
        title="Aksi terakhir gagal."
        :description="error"
      />

      <PropertyFormModal
        v-model:open="formOpen"
        :editing="detail"
        :submitting="submitting"
        :error="error"
        :field-errors="fieldErrors"
        @submit="onFormSubmit"
      />

      <UModal v-model:open="confirmArchive" title="Arsipkan properti?">
        <template #body>
          <div class="flex flex-col gap-4">
            <p class="text-sm text-muted">
              Properti ini akan diarsipkan dan hilang dari daftar aktif. Data tidak dihapus permanen
              dan dapat dipulihkan kapan saja.
            </p>
            <UAlert
              v-if="error"
              color="error"
              variant="soft"
              title="Properti belum dapat diarsipkan."
              :description="error"
            />
            <div class="flex gap-2">
              <UButton
                color="neutral"
                variant="outline"
                block
                :disabled="submitting"
                @click="confirmArchive = false"
              >
                Batal
              </UButton>
              <UButton
                color="warning"
                block
                :loading="submitting"
                :disabled="submitting"
                @click="handleArchive()"
              >
                Ya, arsipkan
              </UButton>
            </div>
          </div>
        </template>
      </UModal>

      <UModal v-model:open="confirmRestore" title="Aktifkan kembali properti?">
        <template #body>
          <div class="flex flex-col gap-4">
            <p class="text-sm text-muted">
              Properti akan kembali ke daftar aktif dan dapat diubah kembali.
            </p>
            <UAlert
              v-if="error"
              color="error"
              variant="soft"
              title="Properti belum dapat dikembalikan."
              :description="error"
            />
            <div class="flex gap-2">
              <UButton
                color="neutral"
                variant="outline"
                block
                :disabled="submitting"
                @click="confirmRestore = false"
              >
                Batal
              </UButton>
              <UButton
                block
                :loading="submitting"
                :disabled="submitting"
                @click="handleRestore()"
              >
                Ya, aktifkan
              </UButton>
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </div>
</template>
