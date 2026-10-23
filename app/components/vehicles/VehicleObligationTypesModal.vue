<script setup lang="ts">
import { splitObligationTypes } from '~/utils/vehicleObligations'

interface Props {
  open: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [open: boolean]
  /** Katalog berubah (create/rename/delete) — listener menyegarkan daftar. */
  'changed': []
}>()

const types = useObligationTypes()
const {
  items,
  pending,
  submitting,
  error,
  fieldErrors
} = types

const modalOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const groups = computed(() => splitObligationTypes(items.value))

const newName = ref('')
const localErrors = ref<Record<string, string>>({})
const renamingId = ref<string | null>(null)
const renameName = ref('')
const confirmDeleteId = ref<string | null>(null)

function resetLocalState(): void {
  newName.value = ''
  localErrors.value = {}
  renamingId.value = null
  renameName.value = ''
  confirmDeleteId.value = null
}

watch(() => props.open, (open) => {
  if (open) {
    resetLocalState()
    types.clearError()
    void types.load(true)
  }
}, { immediate: true })

function close(): void {
  emit('update:open', false)
}

async function onCreate(): Promise<void> {
  types.clearError()
  localErrors.value = {}

  if (newName.value.trim() === '') {
    localErrors.value.name = 'Nama jenis wajib diisi.'

    return
  }

  const created = await types.create(newName.value)

  if (created) {
    newName.value = ''
    emit('changed')
  }
}

function startRename(typeId: string, name: string): void {
  types.clearError()
  localErrors.value = {}
  confirmDeleteId.value = null
  renamingId.value = typeId
  renameName.value = name
}

function cancelRename(): void {
  renamingId.value = null
  renameName.value = ''
  types.clearError()
}

async function submitRename(): Promise<void> {
  if (!renamingId.value) {
    return
  }

  types.clearError()
  localErrors.value = {}

  if (renameName.value.trim() === '') {
    localErrors.value.name = 'Nama jenis wajib diisi.'

    return
  }

  const updated = await types.update(renamingId.value, renameName.value)

  if (updated) {
    renamingId.value = null
    renameName.value = ''
    emit('changed')
  }
}

function askDelete(typeId: string): void {
  types.clearError()
  localErrors.value = {}
  renamingId.value = null
  confirmDeleteId.value = typeId
}

function cancelDelete(): void {
  confirmDeleteId.value = null
}

async function runDelete(typeId: string): Promise<void> {
  const removed = await types.remove(typeId)

  confirmDeleteId.value = null

  if (removed) {
    emit('changed')
  }
}

function retry(): void {
  void types.load(true)
}
</script>

<template>
  <UModal v-model:open="modalOpen" title="Kelola jenis kewajiban">
    <template #body>
      <div class="flex flex-col gap-4">
        <p class="text-sm text-muted">
          Jenis bawaan tersedia untuk semua rumah tangga dan tidak dapat diubah atau dihapus.
          Jenis custom hanya berlaku untuk rumah tangga ini dan tidak dapat dihapus selama masih
          dipakai kewajiban.
        </p>

        <UAlert
          v-if="error"
          color="error"
          variant="soft"
          title="Aksi terakhir gagal."
          :description="error"
          :actions="[{ label: 'Coba lagi', onClick: retry }]"
        />

        <div v-if="pending && items.length === 0" class="flex flex-col gap-2" aria-label="Memuat jenis kewajiban">
          <USkeleton v-for="index in 3" :key="index" class="h-10" />
        </div>

        <template v-else>
          <section class="flex flex-col gap-2" aria-label="Jenis bawaan">
            <h3 class="text-xs font-semibold tracking-wide text-muted uppercase">Jenis bawaan</h3>
            <ul v-if="groups.system.length > 0" class="flex flex-col divide-y divide-default rounded-xl border border-default px-3">
              <li
                v-for="type in groups.system"
                :key="type.id"
                class="flex items-center gap-2 py-2.5"
              >
                <span class="min-w-0 flex-1 truncate text-sm font-medium text-highlighted">
                  {{ type.name }}
                </span>
                <span class="shrink-0 rounded-full bg-elevated px-2 py-0.5 text-[11px] font-medium text-muted">
                  Bawaan
                </span>
              </li>
            </ul>
            <p v-else class="text-sm text-muted">Tidak ada jenis bawaan.</p>
          </section>

          <section class="flex flex-col gap-2" aria-label="Jenis custom">
            <h3 class="text-xs font-semibold tracking-wide text-muted uppercase">Jenis custom</h3>

            <ul
              v-if="groups.custom.length > 0"
              class="flex flex-col divide-y divide-default rounded-xl border border-default px-3"
            >
              <li v-for="type in groups.custom" :key="type.id" class="py-2.5">
                <div v-if="renamingId !== type.id && confirmDeleteId !== type.id" class="flex flex-wrap items-center gap-2">
                  <span class="min-w-0 flex-1 truncate text-sm font-medium text-highlighted">
                    {{ type.name }}
                  </span>
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="outline"
                    icon="i-lucide-pencil"
                    :disabled="submitting"
                    @click="startRename(type.id, type.name)"
                  >
                    Ubah
                  </UButton>
                  <UButton
                    size="xs"
                    color="error"
                    variant="outline"
                    icon="i-lucide-trash-2"
                    :disabled="submitting"
                    @click="askDelete(type.id)"
                  >
                    Hapus
                  </UButton>
                </div>

                <div v-else class="flex flex-col gap-2">
                  <label :for="`obligation-type-rename-${type.id}`" class="text-xs font-medium text-muted">
                    Nama baru
                  </label>
                  <UInput
                    :id="`obligation-type-rename-${type.id}`"
                    v-model="renameName"
                    maxlength="255"
                    autocomplete="off"
                    class="w-full"
                    @keydown.enter.prevent="submitRename()"
                  />
                  <p v-if="localErrors.name ?? fieldErrors.name" class="text-xs text-error">
                    {{ localErrors.name ?? fieldErrors.name }}
                  </p>
                  <div class="flex gap-2">
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="outline"
                      block
                      :disabled="submitting"
                      @click="cancelRename()"
                    >
                      Batal
                    </UButton>
                    <UButton
                      size="xs"
                      block
                      :loading="submitting"
                      :disabled="submitting"
                      @click="submitRename()"
                    >
                      Simpan
                    </UButton>
                  </div>
                </div>

                <div
                  v-if="confirmDeleteId === type.id"
                  class="mt-2 flex flex-col gap-2 rounded-lg border border-default p-2"
                >
                  <p class="text-xs text-muted">
                    Hapus jenis "{{ type.name }}"? Tindakan ini tidak dapat dikembalikan.
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
                      @click="runDelete(type.id)"
                    >
                      Ya, hapus
                    </UButton>
                  </div>
                </div>
              </li>
            </ul>
            <p v-else class="text-sm text-muted">Belum ada jenis custom.</p>

            <div class="mt-1 flex flex-col gap-2 rounded-xl border border-default p-3">
              <label for="obligation-type-name" class="text-xs font-medium text-muted">
                Tambah jenis custom
              </label>
              <div class="flex flex-col gap-2 sm:flex-row">
                <UInput
                  id="obligation-type-name"
                  v-model="newName"
                  placeholder="cth. Asuransi kendaraan"
                  maxlength="255"
                  autocomplete="off"
                  class="w-full"
                  :disabled="submitting"
                  @keydown.enter.prevent="onCreate()"
                />
                <UButton
                  icon="i-lucide-plus"
                  class="shrink-0"
                  :loading="submitting"
                  :disabled="submitting"
                  @click="onCreate()"
                >
                  Tambah
                </UButton>
              </div>
              <p v-if="localErrors.name && !renamingId" class="text-xs text-error">
                {{ localErrors.name }}
              </p>
              <p v-else-if="fieldErrors.name && !renamingId" class="text-xs text-error">
                {{ fieldErrors.name }}
              </p>
            </div>
          </section>
        </template>

        <div class="flex justify-end">
          <UButton color="neutral" variant="outline" @click="close">Tutup</UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
