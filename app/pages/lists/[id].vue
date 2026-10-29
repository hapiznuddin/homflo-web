<script setup lang="ts">
import type { ListSummary, ListItem } from '~/types/lists'

definePageMeta({ middleware: ['auth', 'onboarding'] })

const toast = useToast()
const { getList, loadListItems } = useLists()

const route = useRoute()
const listId = computed(() => String(route.params.id ?? ''))

const list = ref<ListSummary | null>(null)
const items = ref<ListItem[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// Load data
async function loadData(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const listResult = await getList(listId.value)
    list.value = listResult

    const itemsResult = await loadListItems(listId.value)
    items.value = itemsResult?.data ?? []

    if (!list.value) {
      error.value = 'List tidak ditemukan'
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Gagal memuat detail list'
    toast.add({
      title: 'Error',
      description: error.value ?? undefined,
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

function formatCount(c: number): string {
  return String(c)
}

function listPrice(value: ListSummary): string {
  const totals = value as ListSummary & {
    actual_price?: string | null
    estimated_price?: string | null
  }
  return totals.actual_price ?? totals.estimated_price ?? '0.00'
}

function formatQuantity(q: string | null): string {
  if (q === null) return '—'
  return q === '1' || q === '1.00' ? '1 pcs' : `${q} pcs`
}

function formatPrice(p: string | null): string {
  if (p === null) return '—'
  return `Rp ${Number(p).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

await loadData()
</script>

<template>
  <div class="flex w-full flex-col gap-4 sm:gap-5">
    <!-- Breadcrumb -->
    <NuxtLink
      to="/lists"
      class="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted hover:text-highlighted"
    >
      <UIcon name="i-lucide-arrow-left" class="size-4" aria-hidden="true" />
      Kembali ke daftar list
    </NuxtLink>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col gap-3" aria-label="Memuat detail list">
      <USkeleton class="h-24 w-full rounded-2xl" />
      <USkeleton class="h-40 w-full rounded-2xl" />
    </div>

    <!-- Not-found -->
    <div
      v-else-if="!list"
      class="flex flex-col items-center gap-3 rounded-2xl border border-default bg-background px-4 py-10 text-center"
    >
      <span class="flex size-11 items-center justify-center rounded-xl bg-elevated" aria-hidden="true">
        <UIcon name="i-lucide-search-x" class="size-5 text-muted" aria-hidden="true" />
      </span>
      <p class="text-sm font-medium text-highlighted">List tidak ditemukan.</p>
      <p class="text-sm text-muted">List mungkin sudah dihapus atau bukan milik rumah tangga ini.</p>
      <UButton color="neutral" variant="outline" to="/lists">Kembali ke daftar</UButton>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex flex-col gap-3">
      <UAlert color="error" variant="soft" title="Detail list tidak dapat dimuat." :description="error" />
      <div class="flex gap-2">
        <UButton color="neutral" variant="outline" to="/lists">Kembali ke daftar</UButton>
        <UButton block @click="loadData()">Coba lagi</UButton>
      </div>
    </div>

    <!-- Detail -->
    <template v-else-if="list">
      <section class="flex flex-col gap-3 rounded-2xl border border-default bg-background p-4 sm:p-5">
        <header class="flex items-center gap-3">
          <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-elevated" aria-hidden="true">
            <UIcon
              :name="list.type === 'shopping' ? 'i-lucide-shopping-cart' : 'i-lucide-folder'"
              class="size-5 text-default"
              aria-hidden="true"
            />
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-xl font-bold tracking-tight text-highlighted">
              {{ formatPrice(listPrice(list)) }}
            </p>
            <p class="truncate text-sm text-muted">{{ list.name }}</p>
          </div>
          <span v-if="list.is_default" class="shrink-0 rounded-full bg-elevated px-2 py-0.5 text-[11px] font-medium">Default</span>
        </header>

        <dl class="flex flex-col gap-2 text-sm">
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Jumlah item</dt>
            <dd class="font-medium">{{ formatCount(list.counts.active + list.counts.completed) }} item</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Aktif</dt>
            <dd class="font-medium text-success">{{ formatCount(list.counts.active) }} item</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Completed</dt>
            <dd class="font-medium text-success">{{ formatCount(list.counts.completed) }} item</dd>
          </div>
        </dl>

        <!-- Item list -->
        <template v-if="items.length > 0">
          <h3 class="text-sm font-medium text-muted uppercase mb-2">Item</h3>
          <ul class="flex flex-col divide-y divide-default rounded-2xl border border-default bg-background px-3">
            <li v-for="item in items" :key="item.id" class="flex w-full items-center gap-3 py-2 text-left text-sm">
              <span class="flex size-8 shrink-0 items-center justify-center rounded bg-elevated" aria-hidden="true">
                <UIcon :name="item.completed_at ? 'i-lucide-check-circle' : 'i-lucide-minus'" class="size-3.5 text-default" aria-hidden="true" />
              </span>
              <span class="min-w-0 flex-1 truncate">
                <span class="font-medium truncate">{{ item.title }}</span>
                <span v-if="item.quantity" class="text-[11px] text-muted">· {{ formatQuantity(item.quantity) }}</span>
                <span v-if="item.unit" class="text-[10px] text-muted">({{ item.unit }})</span>
              </span>
              <span class="flex shrink-0 flex-col items-end gap-1">
                <span v-if="item.completed_at" class="text-sm font-semibold text-success">Completed</span>
                <span v-else class="text-sm text-muted">Active</span>
              </span>
            </li>
          </ul>
        </template>
        <template v-else>
          <p class="text-sm text-muted">Belum ada item di list ini.</p>
        </template>
      </section>
    </template>
  </div>
</template>
