<script setup lang="ts">
import CategoryFormModal from '~/components/categories/CategoryFormModal.vue'
import type { CategoryFormValues, CategoryItem } from '~/types/categories'

definePageMeta({ middleware: ['auth', 'onboarding'] })

const toast = useToast()
const cat = useCategories()
const { items, pending, submitting, error, fieldErrors } = cat

const formOpen = ref(false)
const editing = ref<CategoryItem | null>(null)
const confirmDeleteId = ref<string | null>(null)

function openCreate(): void {
  editing.value = null
  formOpen.value = true
}

function openEdit(item: CategoryItem): void {
  editing.value = item
  formOpen.value = true
}

async function onFormSubmit(values: CategoryFormValues): Promise<void> {
  const saved = editing.value
    ? await cat.update(editing.value.id, values)
    : await cat.create(values)

  if (saved) {
    const wasEditing = editing.value !== null

    formOpen.value = false
    editing.value = null
    toast.add({
      title: wasEditing ? 'Kategori diubah' : 'Kategori ditambah',
      description: 'Data tersimpan.',
      color: 'success'
    })
  }
}

async function onDeleteRequest(item: CategoryItem): Promise<void> {
  if (confirmDeleteId.value !== item.id) {
    confirmDeleteId.value = item.id

    return
  }

  const ok = await cat.remove(item.id)

  confirmDeleteId.value = null

  if (ok) {
    toast.add({
      title: 'Kategori dihapus',
      description: 'Data terhapus.',
      color: 'success'
    })
  }
}

function cancelDelete(): void {
  confirmDeleteId.value = null
}

function retry(): void {
  void cat.refresh()
}

await cat.load()
</script>

<template>
  <div class="flex flex-col gap-4 sm:gap-5 w-full">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h1 class="truncate text-xl font-bold tracking-tight text-highlighted sm:text-2xl">Kategori</h1>
        <p class="mt-0.5 text-sm text-muted">Kelompok pengeluaran dan pemasukan rumah tangga.</p>
      </div>
      <UButton icon="i-lucide-plus" class="shrink-0" @click="openCreate()">Tambah</UButton>
    </div>

    <div v-if="pending && items.length === 0" class="flex flex-col gap-3" aria-label="Memuat kategori">
      <USkeleton v-for="index in 5" :key="index" class="h-16" />
    </div>

    <UAlert
      v-else-if="error && items.length === 0"
      color="error"
      variant="soft"
      title="Data kategori belum dapat dimuat."
      :description="error"
      :actions="[{ label: 'Coba lagi', onClick: retry }]"
    />

    <template v-else>
      <div v-if="items.length === 0" class="py-10 text-center">
        <p class="text-sm text-muted">Belum ada kategori tercatat.</p>
        <UButton color="neutral" variant="outline" size="sm" class="mt-3" @click="openCreate()">
          Tambah Kategori
        </UButton>
      </div>

      <ul v-else class="flex flex-col divide-y divide-default rounded-2xl border border-default bg-background px-4">
        <li v-for="item in items" :key="item.id" class="flex items-center gap-3 py-3">
          <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-elevated" aria-hidden="true">
            <UIcon :name="item.icon ?? 'i-lucide-tag'" class="size-4.5 text-default" />
          </span>
          <span class="min-w-0 flex-1 truncate text-sm font-medium text-highlighted">{{ item.name }}</span>
          <template v-if="confirmDeleteId !== item.id">
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              square
              icon="i-lucide-pencil"
              aria-label="Ubah kategori"
              @click="openEdit(item)"
            />
            <UButton
              color="error"
              variant="ghost"
              size="sm"
              square
              icon="i-lucide-trash-2"
              aria-label="Hapus kategori"
              @click="onDeleteRequest(item)"
            />
          </template>
          <template v-else>
            <span class="min-w-0 flex-1 truncate text-xs text-muted">Hapus kategori ini?</span>
            <UButton color="neutral" variant="outline" size="sm" @click="cancelDelete()">Batal</UButton>
            <UButton color="error" size="sm" :loading="submitting" :disabled="submitting" @click="onDeleteRequest(item)">
              Ya, hapus
            </UButton>
          </template>
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

    <CategoryFormModal
      v-model:open="formOpen"
      :editing="editing"
      :submitting="submitting"
      :field-errors="fieldErrors"
      @submit="onFormSubmit"
    />
  </div>
</template>
