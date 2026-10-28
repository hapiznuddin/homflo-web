<script setup lang="ts">
import { ref, computed, type Ref } from 'vue'
import { useToast } from '~/composables/useToast'
import { useAuth } from '~/composables/useAuth'
import { useLists } from '~/composables/useLists'
import type { ListSummary, ListErrorCode } from '~/types/lists'
import { LIST_ERROR_CODES } from '~/types/lists'
import UButton from '~/components/ui/UButton.vue'
import USkeleton from '~/components/ui/USkeleton.vue'
import UAlert from '~/components/ui/UAlert.vue'
import { useRouter } from 'nuxt'

definePageMeta({ middleware: ['auth', 'onboarding'] })

const router = useRouter()
const toast = useToast()
const auth = useAuth()
const { loadLists, loadDefaultList, isOwner, mapErrorCode, LIST_ERROR_CODES } = useLists()

// State
const lists = ref<ListSummary[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const tab = ref<'active' | 'archived'>('active')
const defaultList = ref<ListSummary | null>(null)

// Load data
async function loadData(archived = false): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const result = await loadLists(archived)
    lists.value = result.data
    // Set default list if available
    const def = await loadDefaultList()
    defaultList.value = def
  } catch (err: any) {
    error.value = err.message || 'Gagal memuat daftar list'
    toast.add({
      title: 'Error',
      description: error.value,
      color: 'error',
    })
  } finally {
    loading.value = false
  }
}

// Initial load
await loadData()

// Tab switch
function switchTab(key: 'active' | 'archived'): void {
  tab.value = key
  loadData(key === 'archived')
}

// Confirm archive
async function confirmArchiveList(listId: string): Promise<void> {
  const ok = confirm('Anda yakin ingin mengarsip list ini? Aksi ini permanen dan tidak dapat dibatalkan melalui UI.')
  if (ok) {
    await archiveList(listId)
    loadData(tab.value === 'archived')
  }
}

// Format helper
function formatCount(n: number): string {
  return n === 0 ? '0 item' : n === 1 ? '1 item' : `${n} item`
}
</script>

<template>
  <div class="flex flex-col gap-4 sm:gap-5 w-full">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="truncate text-xl font-bold tracking-tight text-highlighted sm:text-2xl">Daftar Belanja</h1>
        <p class="mt-0.5 text-sm text-muted">Beberapa list belanja untuk rumah tangga Anda.</p>
      </div>

      <template v-if="isOwner">
        <UButton icon="i-lucide-plus" @click="openCreate()">
          <span>Tambah List</span>
        </UButton>
      </template>
    </div>

    <!-- Status tabs -->
    <div v-if="isOwner" class="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter list">
      <UButton
        v-for="item in ['active', 'archived']"
        :key="item"
        size="sm"
        :color="tab === item ? 'primary' : 'neutral'"
        :variant="tab === item ? 'soft' : 'outline'"
        :aria-pressed="tab === item"
        @click="switchTab(item)"
      >
        {{ item === 'active' ? 'Aktif' : 'Arsip' }}
      </UButton>
      <span class="text-xs text-muted">Tab Arsip menampilkan list yang sudah diarsipkan.</span>
    </div>

    <div v-else class="flex flex-col gap-2">
      <p class="text-sm text-muted">Anda anggota rumah tangga — pengelolaan list dilakukan pemilik.</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col gap-3" aria-label="Memuat daftar list">
      <USkeleton v-for="index in 3" :key="index" class="h-16" />
    </div>

    <!-- Error -->
    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      title="Daftar list tidak dapat dimuat."
      :description="error"
      :actions="[{ label: 'Coba lagi', onClick: () => loadData(tab.value === 'archived') }]"
    />

    <!-- Empty & list items -->
    <template v-else>
      <div v-if="lists.length === 0" class="py-10 text-center">
        <p class="text-sm text-muted">
          {{ tab === 'active'
            ? 'Belum ada list belanja. Klik "Tambah List" untuk membuat yang pertama.'
            : 'Belum ada list yang diarsipkan.' }}
        </p>

        <UButton
          v-if="tab === 'active' && isOwner"
          color="neutral"
          variant="outline"
          size="sm"
          class="mt-3"
          @click="openCreate()"
        >
          Tambah List
        </UButton>
      </div>

      <ul v-else class="flex flex-col divide-y divide-default rounded-2xl border border-default bg-background px-4">
        <li v-for="list in lists" :key="list.id" class="flex w-full items-center gap-3 py-3 text-left first:pt-3 last:pb-3">
          <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-elevated" aria-hidden="true">
            <i-lucide class="size-4.5 text-default" :name="list.type === 'shopping' ? 'shopping-cart' : 'folder'"></i-lucide>
          </span>
          <span class="min-w-0 flex-1 truncate">
            <span class="font-medium text-highlighted">{{ list.name }}</span>
            <template v-if="list.type === 'custom'">
              <span class="text-xs text-muted">(custom)</template>
            </span>
            <span v-if="list.is_default" class="text-[11px] rounded-full bg-elevated px-2 py-0.5 text-[11px] font-medium">Default</span>
          </span>
          <span class="flex shrink-0 flex-col items-end gap-1">
            <span class="text-sm font-semibold text-highlighted">{{ formatCount(list.counts.active) }} aktif</span>
            <span class="text-xs text-muted">{{ formatCount(list.counts.completed) }} completed</span>
          </span>
        </span>

        <NuxtLink
          :to="`/lists/${list.id}`"
          class="flex w-full items-center gap-3 py-3"
        >
          <span class="text-sm text-muted truncate" style="max-width: 200px;">View</span>
        </NuxtLink>
      </ul>
    </template>
  </div>
</template>

<!-- Composables -->
<script lang="ts">
await loadData()
</script>