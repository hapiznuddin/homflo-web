<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useToast } from '~/composables/useToast'
import { useAuth } from '~/composables/useAuth'
import { useProperties } from '~/composables/useProperties'
import { readError } from '~/composables/useApiError'
import { formatYmd } from '~/utils/format'
import UButton from '~/components/ui/button/index.vue'
import UIcon from '~/components/ui/icon/index.vue'
import USkeleton from '~/components/ui/skeleton/index.vue'
import UAlert from '~/components/ui/alert/index.vue'
import NuxtLink from 'nuxt/jsx'
import PropertyFormModal from '~/components/properties/PropertyFormModal.vue'
import type { PropertyItem } from '~/types/properties'

definePageMeta({ middleware: ['auth', 'verified'] })

const route = useRoute()
const toast = useToast()
const auth = useAuth()
const propertyId = computed(() => String(route.params.id ?? ''))
const { submitting, error, fieldErrors, fetchOne, refresh, clearError } = useProperties()
const detail = ref<PropertyItem | null>(null)
const loading = ref(true)
const notFound = ref(false)
const confirmArchive = ref(false)
const confirmRestore = ref(false)
const detailRequestSeq = ref(0)
const formOpen = ref(false)

// Load property detail
async function loadDetail(): Promise<void> {
  detailRequestSeq.value += 1
  const requestedId = propertyId.value
  const currentSeq = detailRequestSeq.value

  loading.value = true
  detailError.value = null
  notFound.value = false
  confirmArchive.value = false
  confirmRestore.value = false
  formOpen.value = false
  clearError()

  try {
    const fetched = await fetchOne(requestedId)

    if (detailRequestSeq.value !== currentSeq) {
      return
    }

    detail.value = fetched
  } catch (err) {
    if (detailRequestSeq.value !== currentSeq) {
      return
    }

    detail.value = null
    notFound.value = err.statusCode === 404 || err.status === 404

    // Check for PROPERTY_ARCHIVED error code
    const errorCode = err.code || err.error?.code
    if (errorCode === 'PROPERTY_ARCHIVED') {
      notFound.value = false
      detailError.value = 'Property adalah properti arsip dan tidak dapat diedit. Gunakan restore untuk mereaktifkan.'
    } else {
      detailError.value = readError(err, 'Detail properti belum dapat dimuat.')
    }
  } finally {
    if (detailRequestSeq.value === currentSeq) {
      loading.value = false
    }
  }

  if (detail.value) {
    // Refresh list to update archived status
    void refresh()
  }
}

// Watch route param changes
watch(propertyId, () => {
  void loadDetail()
})

// Format status kepemilikan
function ownershipStatusLabel(status: string | null): string {
  if (!status) return '—'
  return status === 'owned' ? 'Milik sendiri' : 'Disewa'
}

// Format tipe property
function typeLabel(type: string | null): string {
  if (!type) return '—'
  const labels: Record<string, string> = {
    house: 'Rumah',
    apartment: 'Apartemen',
    land: 'Tanah',
    shophouse: 'Ruko',
    other: 'Lainnya'
  }
  return labels[type] || type
}

// Check if property is archived
const isArchived = computed(() => detail.value?.archived_at !== null)

// Confirm archive
function openArchiveConfirm(): void {
  if (!detail.value) return
  confirmArchive.value = true
}

async function handleArchive(): Promise<void> {
  if (!detail.value) return
  confirmArchive.value = false
  clearError()

  const archived = await properties.archive(detail.value.id)

  if (archived) {
    toast.add({
      title: 'Property diarsipkan',
      description: 'Property berhasil diarsipkan.',
      color: 'success'
    })
    await loadDetail()
  } else {
    if (error.value === 'Property belum dapat diarsipkan.') {
      formOpen.value = true
    }
  }
}

// Confirm restore
function openRestoreConfirm(): void {
  if (!detail.value || !detail.value.archived_at) return
  confirmRestore.value = true
}

async function handleRestore(): Promise<void> {
  if (!detail.value) return
  confirmRestore.value = false
  clearError()

  const restored = await properties.restore(detail.value.id)

  if (restored) {
    toast.add({
      title: 'Property dikembalikan',
      description: 'Property berhasil dikembalikan ke status aktif.',
      color: 'success'
    })
    await loadDetail()
  } else {
    if (error.value.includes('belum dapat dikembalikan') || error.value.includes('belum dapat di').length > 0) {
      formOpen.value = true
    }
  }
}
</script>

<template>
  <div class="flex w-full flex-col gap-4 sm:gap-5">
    <!-- Back link -->
    <NuxtLink
      to="/properties"
      class="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted hover:text-highlighted"
    >
      <UIcon name="i-lucide-arrow-left" class="size-4" aria-hidden="true" /> Kembali ke daftar
    </NuxtLink>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col gap-3" aria-label="Memuat detail properti">
      <USkeleton class="h-24 w-full rounded-2xl" />
      <USkeleton class="h-40 w-full rounded-2xl" />
    </div>

    <!-- Not-found (404) -->
    <div v-else-if="notFound" class="flex flex-col items-center gap-3 rounded-2xl border border-default bg-background px-4 py-10 text-center">
      <span class="flex size-11 items-center justify-center rounded-xl bg-elevated" aria-hidden="true">
        <UIcon name="i-lucide-search-x" class="size-5 text-muted" aria-hidden="true" />
      </span>
      <p class="text-sm font-medium text-highlighted">Property tidak ditemukan.</p>
      <p class="text-sm text-muted">Property mungkin sudah dihapus atau bukan milik rumah tangga ini.</p>
      <UButton color="neutral" variant="outline" to="/properties">Kembali ke daftar</UButton>
    </div>

    <!-- Error -->
    <div v-else-if="detailError" class="flex flex-col gap-3">
      <UAlert color="error" variant="soft" title="Detail belum dapat dimuat." :description="detailError" />
      <div class="flex gap-2">
        <UButton color="neutral" variant="outline" to="/properties">Kembali ke daftar</UButton>
        <UButton block @click="loadDetail()">Coba lagi</UButton>
      </div>
    </div>    <!-- Detail content -->
    <template v-if="detail">
      <section class="flex flex-col gap-3 rounded-2xl border border-default bg-background p-4 sm:p-5">
        <div class="flex items-center gap-3">
          <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-elevated" aria-hidden="true">
            <UIcon :name="isArchived.value ? 'i-lucide-archive' : 'i-lucide-folder'" class="size-5 text-default" aria-hidden="true" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-xl font-bold tracking-tight text-highlighted">{{ detail.name }}</p>
            <p v-if="detail.address" class="mt-0.5 text-sm text-muted">Alamat: {{ detail.address }}</p>
          </div>
        </div>

        <h2 class="text-sm font-semibold tracking-wide text-muted uppercase">Metadata Property</h2>

        <dl class="flex flex-col gap-2 text-sm">
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Tipe</dt>
            <dd class="text-right font-medium">{{ typeLabel(detail.type) }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Status Kepemilikan</dt>
            <dd class="text-right font-medium" :class="[detail.ownership_status === 'owned' ? 'text-highlighted' : 'text-muted']">
              {{ ownershipStatusLabel(detail.ownership_status) }}
            </dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Deskripsi</dt>
            <dd class="text-right font-medium truncate max-w-xs">{{ detail.description || 'Tidak dicatat' }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Catatan</dt>
            <dd class="text-right font-medium truncate max-w-xs">{{ detail.notes || 'Tidak ada' }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Terakhir Diperbarui</dt>
            <dd class="text-right font-medium">{{ formatYmd(detail.updated_at.slice(0, 10)) }}</dd>
          </div>
          <div v-if="detail.archived_at" class="flex justify-between gap-3">
            <dt class="text-muted">Status</dt>
            <dd class="text-right font-medium text-error">Arsip sejak {{ formatYmd(detail.archived_at.slice(0, 10)) }}</dd>
          </div>
        </dl>
      </section>

      <!-- Action buttons based on ownership and archived status -->
      <div class="mt-4 flex gap-2">
        <!-- Owner-only actions -->
        <template v-if="auth.isHouseholdOwner.value">
          <!-- Edit button: only for active properties -->
          <UButton
            v-if="!isArchived.value"
            icon="i-lucide-pencil"
            color="neutral"
            variant="outline"
            block
            @click="formOpen = true"
          >
            Ubah Property
          </UButton>

          <!-- Archive button: only for active properties -->
          <UButton
            v-if="!isArchived.value"
            icon="i-lucide-archive"
            color="warning"
            variant="outline"
            block
            @click="openArchiveConfirm"
          >
            Arsipkan Property
          </UButton>

          <!-- Restore button: only for archived properties -->
          <UButton
            v-else
            icon="i-lucide-unarchive"
            color="primary"
            variant="outline"
            block
            @click="openRestoreConfirm"
          >
            Aktifkan Kembali
          </UButton>
        </template>

        <!-- Non-owner: just view -->
        <p v-else-if="!auth.isHouseholdOwner.value" class="text-xs text-muted">
          Anda anggota rumah tangga — properti hanya dapat dilihat. Pengelolaan dilakukan pemilik.
        </p>
      </div>

      <!-- Archive/Restore confirmation modals -->
      <PropertyFormModal
        v-model:open="confirmArchive"
        :editing="null"
        :submitting="submitting"
        :error="error"
        :field-errors="fieldErrors"
        @submit="handleArchive"
      />
      <PropertyFormModal
        v-model:open="confirmRestore"
        :editing="null"
        :submitting="submitting"
        :error="error"
        :field-errors="fieldErrors"
        @submit="handleRestore"
      />
    </template>
  </div>
</template>