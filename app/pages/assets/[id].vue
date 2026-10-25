<script setup lang="ts">
import AssetFormModal from '~/components/assets/AssetFormModal.vue'
import type { AssetFormValues, AssetItem } from '~/types/assets'
import {
  assetPropertyLabel,
  isAssetPropertyArchived
} from '~/utils/assets'
import { formatRupiah, formatYmd } from '~/utils/format'

// Detail aset deep-linkable (/assets/{id}), mandiri terhadap daftar.
// Sumber data GET /api/assets/{id} lewat proxy Nuxt. Role ditentukan
// dari session (/api/auth/me → isHouseholdOwner): member hanya membaca.
// Cross-household / ID asing dimasking backend sebagai 404 +
// ASSET_NOT_FOUND — UI menampilkan state not-found, bukan empty state.
definePageMeta({ middleware: ['auth', 'onboarding'] })

const route = useRoute()
const toast = useToast()
const auth = useAuth()
const assets = useAssets()
const properties = useProperties()
const { submitting, error, fieldErrors } = assets
const {
  items: propertyItems,
  pending: propertiesPending,
  error: propertiesError
} = properties

const assetId = computed(() => String(route.params.id ?? ''))

const detail = ref<AssetItem | null>(null)
const loading = ref(true)
const detailError = ref<string | null>(null)
const notFound = ref(false)
const confirmDelete = ref(false)
const formOpen = ref(false)

const isOwner = computed(() => auth.isHouseholdOwner.value)

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

    if (candidate.error?.code === 'ASSET_NOT_FOUND') {
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
  assets.clearError()

  try {
    detail.value = await assets.fetchOne(assetId.value)
  } catch (err) {
    detail.value = null
    notFound.value = isNotFound(err)
    detailError.value = readError(err, 'Detail belum dapat dimuat.')
  } finally {
    loading.value = false
  }
}

// Selalu minta daftar aktif secara eksplisit; jangan mewarisi filter arsip
// dari state global halaman Property.
function loadActiveProperties(force = false): void {
  properties.clearError()
  void properties.load({ include_archived: false }, force)
}

function openEdit(): void {
  if (!detail.value) {
    return
  }

  assets.clearError()
  loadActiveProperties(true)
  formOpen.value = true
}

function retryProperties(): void {
  loadActiveProperties(true)
}

async function onFormSubmit(values: AssetFormValues): Promise<void> {
  const saved = await assets.update(assetId.value, values)

  if (saved) {
    formOpen.value = false
    toast.add({
      title: 'Aset diubah',
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
    confirmDelete.value = true

    return
  }

  const ok = await assets.remove(detail.value.id)

  if (ok) {
    toast.add({
      title: 'Aset dihapus',
      description: 'Data terhapus.',
      color: 'success'
    })

    await navigateTo('/assets')
  } else {
    // Jangan klaim sukses: tutup konfirmasi dan biarkan alert error
    // (assets.error) tampil apa adanya.
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
      to="/assets"
      class="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted hover:text-highlighted"
    >
      <UIcon name="i-lucide-arrow-left" class="size-4" aria-hidden="true" />
      Kembali ke daftar
    </NuxtLink>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col gap-3" aria-label="Memuat detail aset">
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
      <p class="text-sm font-medium text-highlighted">Aset tidak ditemukan.</p>
      <p class="text-sm text-muted">Aset mungkin sudah dihapus atau bukan milik rumah tangga ini.</p>
      <UButton color="neutral" variant="outline" to="/assets">Kembali ke daftar</UButton>
    </div>

    <!-- Error lain + retry -->
    <div v-else-if="detailError" class="flex flex-col gap-3">
      <UAlert color="error" variant="soft" title="Detail belum dapat dimuat." :description="detailError" />
      <div class="flex gap-2">
        <UButton color="neutral" variant="outline" to="/assets">Kembali ke daftar</UButton>
        <UButton block @click="loadDetail()">Coba lagi</UButton>
      </div>
    </div>

    <template v-else-if="detail">
      <section class="flex flex-col gap-3 rounded-2xl border border-default bg-background p-4 sm:p-5">
        <div class="flex items-center gap-3">
          <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-elevated" aria-hidden="true">
            <UIcon name="i-lucide-package" class="size-5 text-default" aria-hidden="true" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-xl font-bold tracking-tight text-highlighted">{{ detail.name }}</p>
            <p v-if="detail.description" class="mt-0.5 text-sm text-muted">{{ detail.description }}</p>
          </div>
        </div>

        <dl class="flex flex-col gap-2 text-sm">
          <div class="flex items-start justify-between gap-3">
            <dt class="shrink-0 text-muted">Properti</dt>
            <dd class="min-w-0 text-right font-medium">
              <span v-if="detail.property" class="inline-flex flex-wrap items-center justify-end gap-1.5">
                <NuxtLink
                  :to="`/properties/${detail.property.id}`"
                  class="min-w-0 break-words underline-offset-4 hover:underline"
                >
                  {{ detail.property.name }}
                </NuxtLink>
                <span
                  v-if="isAssetPropertyArchived(detail.property)"
                  class="shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning"
                >
                  Diarsipkan
                </span>
              </span>
              <span v-else class="text-muted">{{ assetPropertyLabel(detail.property) }}</span>
            </dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Lokasi</dt>
            <dd class="text-right font-medium">{{ detail.location ?? 'Tidak dicatat' }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Tanggal perolehan</dt>
            <dd class="font-medium">{{ detail.acquired_on ? formatYmd(detail.acquired_on) : 'Tidak dicatat' }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Biaya perolehan</dt>
            <dd class="font-medium">
              {{ detail.acquisition_cost ? formatRupiah(Number(detail.acquisition_cost)) : 'Tidak dicatat' }}
            </dd>
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
          Anda anggota rumah tangga — aset hanya dapat dilihat. Pengelolaan dilakukan pemilik.
        </p>

        <div v-else-if="confirmDelete" class="flex flex-wrap items-center gap-2">
          <p class="min-w-0 flex-1 text-xs text-muted">Hapus aset ini? Data yang dihapus tidak dapat dikembalikan.</p>
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

    <AssetFormModal
      v-model:open="formOpen"
      :editing="detail"
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
