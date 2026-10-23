<script setup lang="ts">
import VehicleObligationFormModal from '~/components/vehicles/VehicleObligationFormModal.vue'
import VehicleObligationTypesModal from '~/components/vehicles/VehicleObligationTypesModal.vue'
import type {
  VehicleObligationFormValues,
  VehicleObligationItem
} from '~/types/vehicleObligations'
import {
  formatObligationAmount,
  isObligationDueDatePast,
  obligationStatusChipClass,
  obligationStatusLabel
} from '~/utils/vehicleObligations'
import { formatYmd } from '~/utils/format'

interface Props {
  vehicleId: string
  isOwner: boolean
}

const props = defineProps<Props>()

const toast = useToast()
const obligations = useVehicleObligations(() => props.vehicleId)
const types = useObligationTypes()

const {
  items,
  pending,
  submitting,
  error,
  fieldErrors
} = obligations
const {
  items: typeItems,
  pending: typesPending,
  error: typesError
} = types

const formOpen = ref(false)
const editing = ref<VehicleObligationItem | null>(null)
const confirmDeleteId = ref<string | null>(null)
const expandedId = ref<string | null>(null)
const typesOpen = ref(false)
// Mencegah empty-state palsu sebelum request pertama selesai (termasuk SSR).
const started = ref(false)

onMounted(() => {
  // Daftar dan katalog dimuat paralel; status loading daftar hanya bergantung
  // pada request obligations agar katalog yang lambat tidak menahan list.
  void types.load()
  void obligations.load(true).finally(() => {
    started.value = true
  })
})

// Route kendaraan berubah tanpa remount: state per vehicle ID di composable
// dikunci per ID, dan panel lokal ditutup agar record lama tidak terbawa.
watch(() => props.vehicleId, () => {
  editing.value = null
  formOpen.value = false
  confirmDeleteId.value = null
  expandedId.value = null
  void obligations.load(true)
})

function retry(): void {
  void obligations.refresh()
}

function retryTypes(): void {
  void types.load(true)
}

function openCreate(): void {
  obligations.clearError()
  editing.value = null
  confirmDeleteId.value = null
  expandedId.value = null
  formOpen.value = true
}

function openEdit(item: VehicleObligationItem): void {
  obligations.clearError()
  editing.value = item
  confirmDeleteId.value = null
  formOpen.value = true
}

function onFormOpenChange(open: boolean): void {
  formOpen.value = open

  if (!open) {
    editing.value = null
    obligations.clearError()
  }
}

async function onFormSubmit(values: VehicleObligationFormValues): Promise<void> {
  const current = editing.value
  const saved = current
    ? await obligations.update(current.id, values)
    : await obligations.create(values)

  if (saved) {
    formOpen.value = false
    editing.value = null
    toast.add({
      title: current ? 'Kewajiban diubah' : 'Kewajiban ditambah',
      description: 'Data tersimpan.',
      color: 'success'
    })
  }
}

function toggleDetail(item: VehicleObligationItem): void {
  expandedId.value = expandedId.value === item.id ? null : item.id
}

// Hapus dua langkah: klik pertama hanya membuka konfirmasi. Hanya record
// kewajiban yang dihapus — kendaraan dan kewajiban lain tidak tersentuh.
async function requestDelete(item: VehicleObligationItem): Promise<void> {
  if (confirmDeleteId.value !== item.id) {
    obligations.clearError()
    confirmDeleteId.value = item.id
    expandedId.value = null

    return
  }

  const removed = await obligations.remove(item.id)

  confirmDeleteId.value = null

  if (removed) {
    if (expandedId.value === item.id) {
      expandedId.value = null
    }

    toast.add({
      title: 'Kewajiban dihapus',
      description: 'Data terhapus.',
      color: 'success'
    })
  }
}

function cancelDelete(): void {
  confirmDeleteId.value = null
}

function dueDateLine(item: VehicleObligationItem): string {
  return `Jatuh tempo ${formatYmd(item.due_date)}`
}

function issuedDateLine(item: VehicleObligationItem): string | null {
  return item.issued_date ? `Terbit ${formatYmd(item.issued_date)}` : null
}

function typeKind(item: VehicleObligationItem): string {
  return item.obligation_type.is_system ? 'Bawaan' : 'Custom'
}

function onTypesChanged(): void {
  // Rename tipe custom juga mengubah label yang tertanam pada obligation.
  void obligations.refresh()
}
</script>

<template>
  <section
    class="flex flex-col gap-3 rounded-2xl border border-default bg-background p-4 sm:p-5"
    aria-label="Kewajiban kendaraan"
  >
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h2 class="text-sm font-semibold tracking-wide text-muted uppercase">Kewajiban</h2>
        <p class="mt-1 text-sm text-muted">
          Pajak, registrasi, dan kewajiban administratif kendaraan ini.
        </p>
      </div>
      <div v-if="props.isOwner" class="flex shrink-0 flex-wrap gap-2">
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-lucide-tags"
          @click="typesOpen = true"
        >
          Kelola Jenis
        </UButton>
        <UButton icon="i-lucide-plus" size="sm" @click="openCreate()">
          Tambah Kewajiban
        </UButton>
      </div>
    </div>

    <!-- Jenis dibutuhkan form; kegagalannya tidak menyembunyikan daftar. -->
    <UAlert
      v-if="props.isOwner && typesError && typeItems.length === 0"
      color="warning"
      variant="soft"
      title="Jenis kewajiban belum dapat dimuat."
      :description="typesError"
      :actions="[{ label: 'Coba lagi', onClick: retryTypes }]"
    />

    <div
      v-if="!started || (pending && items.length === 0)"
      class="flex flex-col gap-2"
      aria-label="Memuat kewajiban"
    >
      <USkeleton v-for="index in 3" :key="index" class="h-16" />
    </div>

    <UAlert
      v-else-if="error && items.length === 0"
      color="error"
      variant="soft"
      title="Kewajiban belum dapat dimuat."
      :description="error"
      :actions="[{ label: 'Coba lagi', onClick: retry }]"
    />

    <template v-else>
      <div v-if="items.length === 0" class="py-6 text-center">
        <p class="text-sm text-muted">Belum ada kewajiban untuk kendaraan ini.</p>
        <UButton
          v-if="props.isOwner"
          color="neutral"
          variant="outline"
          size="sm"
          class="mt-3"
          @click="openCreate()"
        >
          Tambah Kewajiban
        </UButton>
      </div>

      <template v-else>
        <ul class="flex flex-col divide-y divide-default rounded-xl border border-default px-3">
          <li v-for="item in items" :key="item.id" class="py-3">
            <div class="flex items-start gap-3">
              <span
                class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-elevated"
                aria-hidden="true"
              >
                <UIcon name="i-lucide-file-badge" class="size-4 text-default" />
              </span>

              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                      <span class="truncate">{{ item.obligation_type.name }}</span>
                      <span class="rounded-full bg-elevated px-1.5 py-0.5 text-[10px] font-medium">
                        {{ typeKind(item) }}
                      </span>
                    </p>
                    <p class="truncate text-sm font-medium text-highlighted">{{ item.title }}</p>
                    <p class="mt-0.5 text-xs text-muted">
                      {{ dueDateLine(item) }}
                      <span
                        v-if="isObligationDueDatePast(item)"
                        class="ml-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      >
                        Tanggal sudah lewat
                      </span>
                    </p>
                    <p class="mt-0.5 text-xs text-muted">
                      <template v-if="issuedDateLine(item)">{{ issuedDateLine(item) }}</template>
                      <template v-if="issuedDateLine(item) && formatObligationAmount(item.amount)">
                        ·
                      </template>
                      <template v-if="formatObligationAmount(item.amount)">
                        {{ formatObligationAmount(item.amount) }}
                      </template>
                    </p>
                  </div>
                  <span
                    class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
                    :class="obligationStatusChipClass(item.status)"
                  >
                    {{ obligationStatusLabel(item.status) }}
                  </span>
                </div>

                <div
                  v-if="confirmDeleteId !== item.id"
                  class="mt-2 flex flex-wrap gap-2"
                >
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="outline"
                    :icon="expandedId === item.id ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                    @click="toggleDetail(item)"
                  >
                    {{ expandedId === item.id ? 'Tutup detail' : 'Lihat detail' }}
                  </UButton>
                  <template v-if="props.isOwner">
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="outline"
                      icon="i-lucide-pencil"
                      @click="openEdit(item)"
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
                  </template>
                </div>

                <div
                  v-if="confirmDeleteId === item.id"
                  class="mt-2 flex flex-col gap-2 rounded-lg border border-default p-2"
                >
                  <p class="text-xs text-muted">
                    Hapus kewajiban "{{ item.title }}"? Kendaraan tetap tersimpan; data yang
                    dihapus tidak dapat dikembalikan.
                  </p>
                  <div class="flex gap-2">
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="outline"
                      block
                      :disabled="submitting"
                      @click="cancelDelete()"
                    >
                      Batal
                    </UButton>
                    <UButton
                      size="xs"
                      color="error"
                      block
                      :loading="submitting"
                      :disabled="submitting"
                      @click="requestDelete(item)"
                    >
                      Ya, hapus
                    </UButton>
                  </div>
                </div>

                <!-- Detail penuh berasal dari record list yang sama; tidak ada
                     status tambahan yang dihitung dari tanggal. -->
                <dl
                  v-if="expandedId === item.id"
                  class="mt-2 flex flex-col gap-1.5 rounded-lg border border-default p-2 text-xs"
                >
                  <div class="flex justify-between gap-3">
                    <dt class="text-muted">Jenis</dt>
                    <dd class="text-right font-medium">
                      {{ item.obligation_type.name }} ({{ typeKind(item) }})
                    </dd>
                  </div>
                  <div class="flex justify-between gap-3">
                    <dt class="text-muted">Tanggal terbit</dt>
                    <dd class="text-right font-medium">
                      {{ item.issued_date ? formatYmd(item.issued_date) : 'Tidak dicatat' }}
                    </dd>
                  </div>
                  <div class="flex justify-between gap-3">
                    <dt class="text-muted">Nominal</dt>
                    <dd class="text-right font-medium">
                      {{ formatObligationAmount(item.amount) ?? 'Tidak dicatat' }}
                    </dd>
                  </div>
                  <div v-if="item.description" class="flex flex-col gap-0.5">
                    <dt class="text-muted">Deskripsi</dt>
                    <dd class="font-medium whitespace-pre-line">{{ item.description }}</dd>
                  </div>
                  <div class="flex justify-between gap-3">
                    <dt class="text-muted">Status administratif</dt>
                    <dd class="text-right font-medium">{{ obligationStatusLabel(item.status) }}</dd>
                  </div>
                  <div class="flex justify-between gap-3">
                    <dt class="text-muted">Diperbarui</dt>
                    <dd class="text-right font-medium">{{ formatYmd(item.updated_at.slice(0, 10)) }}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </li>
        </ul>

        <UAlert
          v-if="error"
          color="error"
          variant="soft"
          title="Aksi terakhir gagal."
          :description="error"
        />
      </template>
    </template>

    <p v-if="!props.isOwner" class="text-xs text-muted">
      Anda anggota rumah tangga — kewajiban hanya dapat dilihat. Pengelolaan dilakukan pemilik.
    </p>

    <VehicleObligationFormModal
      :open="formOpen"
      :editing="editing"
      :submitting="submitting"
      :error="error"
      :field-errors="fieldErrors"
      :types="typeItems"
      :types-pending="typesPending"
      :types-error="typesError"
      @update:open="onFormOpenChange"
      @submit="onFormSubmit"
      @retry-types="retryTypes"
    />

    <VehicleObligationTypesModal
      v-model:open="typesOpen"
      @changed="onTypesChanged"
    />
  </section>
</template>
