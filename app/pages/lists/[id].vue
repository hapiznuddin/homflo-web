<script setup lang="ts">
import { ref, computed, type } from 'vue'
import { useToast } from '~/composables/useToast'
import { useAuth } from '~/composables/useAuth'
import { useLists } from '~/composables/useLists'
import type {
  ListSummary,
  ListItem,
  ListItemFormValues,
  ListItemExpense,
  LIST_ERROR_CODES,
} from '~/types/lists'
import { LIST_ERROR_CODES as LIST_CODES } from '~/types/lists'
import UButton from '~/components/ui/UButton.vue'
import USkeleton from '~/components/ui/USkeleton.vue'
import UAlert from '~/components/ui/UAlert.vue'
import BillFormModal from '~/components/lists/BillFormModal.vue'
import BillPaymentModal from '~/components/lists/BillPaymentModal.vue'
import BillRecurrenceModal from '~/components/lists/BillRecurrenceModal.vue'
import { useRouter } from 'nuxt'

definePageMeta({ middleware: ['auth', 'onboarding'] })

const router = useRouter()
const toast = useToast()
const auth = useAuth()
const { getList, loadListItems, createListItem, getListItem, updateListItem, completeListItem, uncompleteListItem, createListItemExpense, isOwner, mapErrorCode } = useLists()

const route = useRoute()
const listId = computed(() => String(route.params.id ?? ''))

const list = ref<ListSummary | null>(null)
const items = ref<ListItem[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const showCreateItem = ref(false)
const showExpense = ref(false)
const actualPrice = ref<string | null>(null)

// Load data
async function loadData(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    // Load list detail
    const listResult = await getList(listId.value)
    list.value = listResult

    // Load items
    const itemsResult = await loadListItems(listId.value)
    items.value = itemsResult.data

    // Handle 404
    if (!list.value) {
      error.value = 'List tidak ditemukan'
    }
  } catch (err: any) {
    error.value = err.message || 'Gagal memuat detail list'
    toast.add({
      title: 'Error',
      description: error.value,
      color: 'error',
    })
  } finally {
    loading.value = false
  }
}

// Confirm uncomplete
async function confirmUncomplete(item: ListItem): Promise<void> {
  const ok = confirm('Batal completion? Item akan kembali ke status active. Aksi ini diizinkan (A-18 disetujui).')
  if (ok) {
    await uncompleteListItem(listId.value, item.id)
    await loadData()
  }
}

// Confirm delete item
async function confirmDeleteItem(item: ListItem): Promise<void> {
  const ok = confirm('Hapus item ini? Item tidak dapat dipulihkan. Jika item sudah memiliki Expense, aksi akan gagal dengan error 409.')
  if (ok) {
    // Note: delete item endpoint not fully implemented in MVP; show info
    toast.add({
      title: 'Info',
      description: 'Fungsi hapus item tidak tersedia di MVP. Item dengan Expense tidak dapat dihapus. Item tanpa Expense bisa dihapus lewat backend.',
      color: 'info',
    })
  }
}

// Format helpers
function formatQuantity(q: string | null): string {
  if (q === null) return '—'
  return q === '1' || q === '1.00' ? '1 pcs' : `${q} pcs`
}

function formatPrice(p: string | null): string {
  if (p === null) return '—'
  return `Rp ${Number(p).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
</script>

<template>
  <div class="flex w-full flex-col gap-4 sm:gap-5">
    <!-- Breadcrumb -->
    <NuxtLink
      to="/lists"
      class="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted hover:text-highlighted"
    >
      <i-lucide name="arrow-left" class="size-4" aria-hidden="true" />
      Kembali ke daftar list
    </NuxtLink>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col gap-3" aria-label="Memuat detail list">
      <USkeleton class="h-24 w-full rounded-2xl" />
      <USkeleton class="h-40 w-full rounded-2xl" />
    </div>

    <!-- Not-found -->
    <div v-else-if="!list" class="flex flex-col items-center gap-3 rounded-2xl border border-default bg-background px-4 py-10 text-center">
      <span class="flex size-11 items-center justify-center rounded-xl bg-elevated" aria-hidden="true">
        <i-lucide name="search-x" class="size-5 text-muted" aria-hidden="true" />
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
            <i-lucide :name="list.type === 'shopping' ? 'shopping-cart' : 'folder'" class="size-5 text-default" aria-hidden="true" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-xl font-bold tracking-tight text-highlighted">{{ formatPrice(list.actual_price ?? list.estimated_price ?? '0.00') }}</p>
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
                <i-lucide :name="item.isCompleted() ? 'check-circle' : 'minus'" class="size-3.5 text-default" aria-hidden="true" />
              </span>
              <span class="min-w-0 flex-1 truncate">
                <span class="font-medium truncate">{{ item.title }}</span>
                <template v-if="item.quantity">
                  <span class="text-[11px] text-muted">· {{ formatQuantity(item.quantity) }}</template>
                </template>
                <template v-if="item.unit">
                  <span class="text-[10px] text-muted">({{ item.unit }})</template>
                </template>
              </span>
              <span class="flex shrink-0 flex-col items-end gap-1">
                <span v-if="item.isCompleted()" class="text-sm font-semibold text-success">Completed</span>
                <span v-else class="text-sm text-muted">Active</span>
              </span>
            </li>
          </ul>
        <template v-else>
          <p class="text-sm text-muted">Belum ada item di list ini.</p>
        </template>
        </template>
        </ul>
        </template>

        <!-- Empty state -->
        <template v-else>
          <p class="text-sm text-muted">Belum ada item di list ini. Klik "Tambah Item" untuk menambah.</p>
        </template>
        </div>

        <!-- Action bars -->
        <div v-if="isOwner" class="flex flex-col gap-2 pt-2">
          <!-- Create item -->
          <div class="flex gap-2">
            <UButton icon="i-lucide-plus" size="sm" @click="showCreateItem = true">
              Tambah Item
            </UButton>
          </div>

          <!-- Expense if all items completed -->
          <template v-if="items.every(i => i.isCompleted())">
            <div class="flex gap-2 pt-1">
              <UButton
                color="primary"
                size="sm"
                @click="showExpense = true"
              >
                Buat Expense
              </UButton>
            </div>
          </template>

          <!-- Item actions per status -->
          <template v-if="!items.every(i => i.isCompleted())">
            <div class="flex gap-2 pt-1">
              <UButton
                size="sm"
                @click="showCreateItem = true"
              >
                Tambah Item
              </UButton>
            </div>
          </template>

          <!-- Uncomplete if item completed -->
          <template v-if="items.some(i => i.isCompleted() && !items.every(i => i.isCompleted()))">
            <div class="flex gap-2 pt-1">
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                @click="confirmUncompleteItem(items.find(i => i.isCompleted()))"
              >
                BatalCompletion
              </UButton>
            </div>
          </template>
        </div>

        <!-- Bill form modal -->
        <BillFormModal
          v-model:open="showCreateItem"
          :editing="null"
          :submitting="bills?.submitting?.value ?? false"
          :error="bills?.error?.value"
          :field-errors="bills?.fieldErrors?.value"
          :categories="[]"
          :categories-pending="false"
          :categories-error="false"
          @submit="onCreateItem"
          @retry-categories="() => {}
        />

        <!-- Bill payment modal -->
        <BillPaymentModal
          :open="showExpense"
          :bill="list"
          :wallets="[]"
          :wallets-pending="false"
          :wallets-error="false"
          :submitting="false"
          :error="{}"
          @update:open="showExpense = false"
          @submit="onCreateExpense"
        />

        <!-- Bill recurrence modal -->
        <BillRecurrenceModal
          :open="false"
          :bill="null"
          :submitting="false"
          :error="{}"
          @update:open="() => {}"
          @submit="() => {}
        />
      </section>
    </template>
  </div>
</template>

<!-- Composables -->
<script lang="ts">
await loadData()
</script>