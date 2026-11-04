<script setup lang="ts">
import type {
  ListItem,
  ListItemExpenseInput,
  ListItemsResponse,
  ListSummary
} from '~/types/lists'

// Detail list deep-linkable. Semua mutasi item melewati useLists -> proxy Nuxt
// -> Laravel; backend tetap otoritas untuk lifecycle, harga, dan Expense.
// Aturan UI yang dijaga:
// - List arsip bersifat read-only (backend 409 LIST_ARCHIVED).
// - Item completed hanya boleh mengubah actual_price, dan harga terkunci
//   setelah Expense ada (LIST_ITEM_PRICE_LOCKED).
// - Expense maksimal satu per item dan immutable (tanpa aksi edit/hapus).
// - Hanya owner household yang boleh membuat Expense (403 FORBIDDEN).
definePageMeta({ middleware: ['auth', 'onboarding'] })

const route = useRoute()
const toast = useToast()
const auth = useAuth()
const listsApi = useLists()
const wallets = useWallets()
const categories = useCategories()

const { submitting, error: mutationError, fieldErrors } = listsApi
const { items: walletItems, pending: walletsPending, error: walletsError } = wallets
const { items: categoryItems, pending: categoriesPending, error: categoriesError } = categories

const listId = computed(() => String(route.params.id ?? ''))
const isOwner = computed(() => auth.isHouseholdOwner.value)

const list = ref<ListSummary | null>(null)
const items = ref<ListItemsResponse | null>(null)
const loading = ref(true)
const loadError = ref<string | null>(null)
const notFound = ref(false)

const isArchived = computed(() => list.value?.archived_at !== null && list.value?.archived_at !== undefined)

// --- item create/edit -----------------------------------------------------
const itemFormOpen = ref(false)
const editingItem = ref<ListItem | null>(null)
const itemForm = reactive({
  title: '',
  quantity: '',
  unit: '',
  estimated_price: '',
  actual_price: ''
})

const isEditingCompleted = computed(() => editingItem.value?.status === 'completed')

// --- complete -------------------------------------------------------------
const completeOpen = ref(false)
const completingItem = ref<ListItem | null>(null)
const completePrice = ref('')

// --- delete ---------------------------------------------------------------
const deleteOpen = ref(false)
const deletingItem = ref<ListItem | null>(null)

// --- expense --------------------------------------------------------------
const expenseOpen = ref(false)
const expensingItem = ref<ListItem | null>(null)
const expenseForm = reactive({
  wallet_id: 'none',
  category_id: 'none',
  occurred_on: '',
  actual_price: ''
})

const activeWallets = computed(() => walletItems.value.filter(wallet => wallet.is_active))
const walletOptions = computed(() =>
  activeWallets.value.map(wallet => ({ label: wallet.name, value: wallet.id }))
)
// Kategori legacy tanpa tipe ditolak backend (CATEGORY_TYPE_MISMATCH); hanya
// kategori expense yang ditawarkan. Kategori tetap opsional.
const expenseCategories = computed(() => categoryItems.value.filter(category => category.type === 'expense'))
const categoryOptions = computed(() =>
  expenseCategories.value.map(category => ({ label: category.name, value: category.id }))
)

function formatQuantity(item: ListItem): string {
  const parts: string[] = []
  if (item.quantity !== null) {
    parts.push(item.quantity === '1' || item.quantity === '1.00' ? '1 pcs' : `${item.quantity} pcs`)
  }
  if (item.unit) {
    parts.push(item.unit)
  }
  return parts.join(' · ')
}

function formatPrice(value: string | null): string {
  if (value === null || value === '') {
    return '—'
  }
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return value
  }
  return `Rp ${numeric.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

async function loadData(): Promise<void> {
  loading.value = true
  loadError.value = null
  notFound.value = false

  try {
    const listResult = await listsApi.getList(listId.value)

    if (!listResult) {
      list.value = null
      items.value = null
      notFound.value = listsApi.errorCode.value === listsApi.LIST_ERROR_CODES.NOT_FOUND
      loadError.value = listsApi.error.value ?? 'Detail list tidak dapat dimuat.'
      return
    }

    list.value = listResult
    items.value = await listsApi.loadListItems(listId.value)

    if (listsApi.error.value) {
      loadError.value = listsApi.error.value
    }
  } finally {
    loading.value = false
  }
}

function resetItemForm(): void {
  itemForm.title = ''
  itemForm.quantity = ''
  itemForm.unit = ''
  itemForm.estimated_price = ''
  itemForm.actual_price = ''
}

function openCreate(): void {
  listsApi.clearError()
  editingItem.value = null
  resetItemForm()
  itemFormOpen.value = true
}

function openEdit(item: ListItem): void {
  listsApi.clearError()
  editingItem.value = item
  itemForm.title = item.title
  itemForm.quantity = item.quantity ?? ''
  itemForm.unit = item.unit ?? ''
  itemForm.estimated_price = item.estimated_price ?? ''
  itemForm.actual_price = item.actual_price ?? ''
  itemFormOpen.value = true
}

async function onItemSubmit(): Promise<void> {
  const editing = editingItem.value

  if (editing?.status === 'completed') {
    const saved = await listsApi.updateListItem(listId.value, editing.id, {
      actual_price: itemForm.actual_price === '' ? null : itemForm.actual_price
    })

    if (saved) {
      itemFormOpen.value = false
      toast.add({ title: 'Harga aktual disimpan', color: 'success' })
      await loadData()
    }
    return
  }

  if (!itemForm.title.trim()) {
    return
  }

  const values = {
    title: itemForm.title.trim(),
    quantity: itemForm.quantity === '' ? null : itemForm.quantity,
    unit: itemForm.unit === '' ? null : itemForm.unit,
    estimated_price: itemForm.estimated_price === '' ? null : itemForm.estimated_price
  }

  const saved = editing
    ? await listsApi.updateListItem(listId.value, editing.id, values)
    : await listsApi.createListItem(listId.value, values)

  if (saved) {
    itemFormOpen.value = false
    toast.add({
      title: editing ? 'Item diperbarui' : 'Item ditambahkan',
      color: 'success'
    })
    await loadData()
  }
}

function openComplete(item: ListItem): void {
  listsApi.clearError()
  completingItem.value = item
  completePrice.value = item.actual_price ?? ''
  completeOpen.value = true
}

async function onCompleteSubmit(): Promise<void> {
  const item = completingItem.value
  if (!item) {
    return
  }

  const saved = await listsApi.completeListItem(listId.value, item.id, {
    actual_price: completePrice.value === '' ? undefined : completePrice.value
  })

  if (saved) {
    completeOpen.value = false
    toast.add({ title: 'Item diselesaikan', color: 'success' })
    await loadData()
  }
}

async function onUncomplete(item: ListItem): Promise<void> {
  const saved = await listsApi.uncompleteListItem(listId.value, item.id)

  if (saved) {
    toast.add({ title: 'Completion dibatalkan', color: 'success' })
    await loadData()
  }
}

function openDelete(item: ListItem): void {
  listsApi.clearError()
  deletingItem.value = item
  deleteOpen.value = true
}

async function onDeleteSubmit(): Promise<void> {
  const item = deletingItem.value
  if (!item) {
    return
  }

  const deleted = await listsApi.deleteListItem(listId.value, item.id)

  if (deleted) {
    deleteOpen.value = false
    toast.add({ title: 'Item dihapus', color: 'success' })
    await loadData()
  }
}

function openExpense(item: ListItem): void {
  listsApi.clearError()
  expensingItem.value = item
  expenseForm.wallet_id = 'none'
  expenseForm.category_id = 'none'
  expenseForm.occurred_on = ''
  expenseForm.actual_price = item.actual_price ?? ''
  expenseOpen.value = true

  // Read-only GET; kegagalan ditampilkan di form, bukan diganti mock.
  void wallets.load()
  void categories.load()
}

async function onExpenseSubmit(): Promise<void> {
  const item = expensingItem.value
  if (!item || expenseForm.wallet_id === 'none') {
    return
  }

  const input: ListItemExpenseInput = {
    wallet_id: expenseForm.wallet_id
  }

  if (expenseForm.category_id !== 'none') {
    input.category_id = expenseForm.category_id
  }
  if (expenseForm.occurred_on !== '') {
    input.occurred_on = expenseForm.occurred_on
  }
  if (expenseForm.actual_price !== '') {
    input.actual_price = expenseForm.actual_price
  }

  const result = await listsApi.createListItemExpense(listId.value, item.id, input)

  if (result) {
    expenseOpen.value = false
    toast.add({
      title: result.created ? 'Expense dicatat' : 'Expense sudah ada',
      description: result.created ? undefined : 'Item ini sudah memiliki Expense; data lama dipertahankan.',
      color: 'success'
    })
    await loadData()
  }
}

await loadData()
</script>

<template>
  <div class="flex w-full flex-col gap-4 sm:gap-5">
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
      <p class="text-sm font-medium text-highlighted">
        {{ notFound ? 'List tidak ditemukan.' : 'Detail list tidak dapat dimuat.' }}
      </p>
      <p class="text-sm text-muted">
        {{ notFound
          ? 'List mungkin sudah dihapus atau bukan milik rumah tangga ini.'
          : loadError }}
      </p>
      <div class="flex gap-2">
        <UButton color="neutral" variant="outline" to="/lists">Kembali ke daftar</UButton>
        <UButton v-if="!notFound" @click="loadData()">Coba lagi</UButton>
      </div>
    </div>

    <template v-else>
      <!-- Header -->
      <section class="flex flex-col gap-3 rounded-2xl border border-default bg-background p-4 sm:p-5">
        <header class="flex items-start gap-3">
          <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-elevated" aria-hidden="true">
            <UIcon
              :name="list.type === 'shopping' ? 'i-lucide-shopping-cart' : 'i-lucide-folder'"
              class="size-5 text-default"
              aria-hidden="true"
            />
          </span>
          <div class="min-w-0 flex-1">
            <h1 class="truncate text-xl font-bold tracking-tight text-highlighted sm:text-2xl">
              {{ list.name }}
            </h1>
            <p class="text-sm text-muted">
              {{ list.counts.active }} aktif · {{ list.counts.completed }} completed
            </p>
          </div>
          <span v-if="list.is_default" class="shrink-0 rounded-full bg-elevated px-2 py-0.5 text-[11px] font-medium">
            Default
          </span>
        </header>

        <UAlert
          v-if="isArchived"
          color="neutral"
          variant="soft"
          icon="i-lucide-archive"
          title="List diarsipkan"
          description="List ini hanya dapat dibaca. Pulihkan list terlebih dahulu untuk mengubah item."
        />

        <UButton
          v-if="!isArchived"
          icon="i-lucide-plus"
          class="self-start"
          @click="openCreate()"
        >
          Tambah Item
        </UButton>
      </section>

      <UAlert
        v-if="loadError"
        color="error"
        variant="soft"
        title="Data item belum lengkap."
        :description="loadError"
        :actions="[{ label: 'Coba lagi', onClick: loadData }]"
      />

      <!-- Empty -->
      <div
        v-if="!items || (items.active.length === 0 && items.completed.length === 0)"
        class="rounded-2xl border border-default bg-background px-4 py-10 text-center"
      >
        <p class="text-sm text-muted">Belum ada item di list ini.</p>
        <UButton
          v-if="!isArchived"
          color="neutral"
          variant="outline"
          size="sm"
          class="mt-3"
          @click="openCreate()"
        >
          Tambah Item
        </UButton>
      </div>

      <template v-else>
        <!-- Active items -->
        <section v-if="items.active.length > 0" class="flex flex-col gap-2">
          <h2 class="text-sm font-medium text-muted uppercase">
            Aktif ({{ items.counts.active }})
          </h2>
          <ul class="flex flex-col divide-y divide-default rounded-2xl border border-default bg-background px-3">
            <li
              v-for="item in items.active"
              :key="item.id"
              class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-3"
            >
              <div class="min-w-0 flex-1">
                <p class="truncate font-medium text-highlighted">{{ item.title }}</p>
                <p class="text-xs text-muted">
                  <span v-if="formatQuantity(item)">{{ formatQuantity(item) }}</span>
                  <span v-if="item.estimated_price !== null">
                    <span v-if="formatQuantity(item)"> · </span>
                    Estimasi {{ formatPrice(item.estimated_price) }}
                  </span>
                </p>
              </div>
              <div v-if="!isArchived" class="flex flex-wrap gap-1.5">
                <UButton size="xs" color="neutral" variant="outline" icon="i-lucide-pencil" @click="openEdit(item)">
                  Edit
                </UButton>
                <UButton size="xs" color="neutral" variant="outline" icon="i-lucide-check" @click="openComplete(item)">
                  Selesai
                </UButton>
                <UButton size="xs" color="error" variant="outline" icon="i-lucide-trash-2" @click="openDelete(item)">
                  Hapus
                </UButton>
              </div>
            </li>
          </ul>
        </section>

        <!-- Completed items -->
        <section v-if="items.completed.length > 0" class="flex flex-col gap-2">
          <h2 class="text-sm font-medium text-muted uppercase">
            Completed ({{ items.counts.completed }})
          </h2>
          <ul class="flex flex-col divide-y divide-default rounded-2xl border border-default bg-background px-3">
            <li
              v-for="item in items.completed"
              :key="item.id"
              class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-3"
            >
              <div class="min-w-0 flex-1">
                <p class="truncate font-medium text-highlighted">
                  <UIcon name="i-lucide-check-circle" class="mr-1 inline size-4 text-success" aria-hidden="true" />
                  {{ item.title }}
                </p>
                <p class="text-xs text-muted">
                  <span v-if="formatQuantity(item)">{{ formatQuantity(item) }}</span>
                  <span v-if="item.actual_price !== null">
                    <span v-if="formatQuantity(item)"> · </span>
                    Aktual {{ formatPrice(item.actual_price) }}
                  </span>
                </p>
                <p v-if="item.expense" class="mt-1 text-xs text-muted">
                  Expense {{ formatPrice(item.expense.amount) }}
                  <span v-if="item.expense.wallet"> · {{ item.expense.wallet.name }}</span>
                  <span v-if="item.expense.category"> · {{ item.expense.category.name }}</span>
                  <span class="ml-1 inline-flex items-center gap-1 text-[11px]">
                    <UIcon name="i-lucide-lock" class="size-3" aria-hidden="true" />
                    terkunci
                  </span>
                </p>
              </div>
              <div v-if="!isArchived" class="flex flex-wrap gap-1.5">
                <UButton size="xs" color="neutral" variant="outline" icon="i-lucide-undo-2" @click="onUncomplete(item)">
                  Batalkan selesai
                </UButton>
                <UButton
                  v-if="!item.expense"
                  size="xs"
                  color="neutral"
                  variant="outline"
                  icon="i-lucide-pencil"
                  @click="openEdit(item)"
                >
                  Harga aktual
                </UButton>
                <UButton
                  v-if="!item.expense && isOwner"
                  size="xs"
                  variant="outline"
                  icon="i-lucide-receipt"
                  @click="openExpense(item)"
                >
                  Catat Expense
                </UButton>
                <UButton
                  v-if="!item.expense"
                  size="xs"
                  color="error"
                  variant="outline"
                  icon="i-lucide-trash-2"
                  @click="openDelete(item)"
                >
                  Hapus
                </UButton>
              </div>
            </li>
          </ul>
        </section>
      </template>
    </template>

    <!-- Item form (create active item / edit active / edit completed price) -->
    <UModal v-model:open="itemFormOpen" :title="editingItem ? 'Ubah Item' : 'Tambah Item'">
      <template #body>
        <form class="flex flex-col gap-4" @submit.prevent="onItemSubmit">
          <UAlert
            v-if="mutationError"
            color="error"
            variant="soft"
            title="Item belum tersimpan."
            :description="mutationError"
          />

          <template v-if="isEditingCompleted">
            <p class="text-sm text-muted">
              Item sudah completed. Hanya harga aktual yang dapat diubah, dan terkunci bila Expense sudah dibuat.
            </p>
            <div>
              <label for="item-actual-price" class="mb-1 block text-sm font-medium">Harga aktual</label>
              <UInput
                id="item-actual-price"
                v-model="itemForm.actual_price"
                type="number"
                step="0.01"
                min="0"
                class="w-full"
                placeholder="0.00"
              />
              <p v-if="fieldErrors.actual_price" class="mt-1 text-xs text-error">
                {{ fieldErrors.actual_price }}
              </p>
            </div>
          </template>

          <template v-else>
            <div>
              <label for="item-title" class="mb-1 block text-sm font-medium">Nama item</label>
              <UInput
                id="item-title"
                v-model="itemForm.title"
                maxlength="255"
                autocomplete="off"
                class="w-full"
                placeholder="cth. Sabun cuci"
              />
              <p v-if="fieldErrors.title" class="mt-1 text-xs text-error">{{ fieldErrors.title }}</p>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="item-quantity" class="mb-1 block text-sm font-medium">Jumlah</label>
                <UInput
                  id="item-quantity"
                  v-model="itemForm.quantity"
                  type="number"
                  step="0.01"
                  min="0"
                  class="w-full"
                  placeholder="1"
                />
                <p v-if="fieldErrors.quantity" class="mt-1 text-xs text-error">{{ fieldErrors.quantity }}</p>
              </div>
              <div>
                <label for="item-unit" class="mb-1 block text-sm font-medium">Satuan</label>
                <UInput
                  id="item-unit"
                  v-model="itemForm.unit"
                  maxlength="20"
                  class="w-full"
                  placeholder="pcs"
                />
                <p v-if="fieldErrors.unit" class="mt-1 text-xs text-error">{{ fieldErrors.unit }}</p>
              </div>
            </div>

            <div>
              <label for="item-estimated-price" class="mb-1 block text-sm font-medium">Harga perkiraan</label>
              <UInput
                id="item-estimated-price"
                v-model="itemForm.estimated_price"
                type="number"
                step="0.01"
                min="0"
                class="w-full"
                placeholder="0.00"
              />
              <p v-if="fieldErrors.estimated_price" class="mt-1 text-xs text-error">
                {{ fieldErrors.estimated_price }}
              </p>
            </div>
          </template>

          <div class="flex gap-2">
            <UButton type="button" color="neutral" variant="outline" block @click="itemFormOpen = false">
              Batal
            </UButton>
            <UButton type="submit" block :loading="submitting" :disabled="submitting">
              Simpan
            </UButton>
          </div>
        </form>
      </template>
    </UModal>

    <!-- Complete -->
    <UModal v-model:open="completeOpen" title="Selesaikan Item">
      <template #body>
        <form class="flex flex-col gap-4" @submit.prevent="onCompleteSubmit">
          <UAlert
            v-if="mutationError"
            color="error"
            variant="soft"
            title="Item belum dapat diselesaikan."
            :description="mutationError"
          />

          <p class="text-sm text-muted">
            {{ completingItem?.title }}
          </p>

          <div>
            <label for="complete-price" class="mb-1 block text-sm font-medium">
              Harga aktual <span class="font-normal text-muted">(opsional)</span>
            </label>
            <UInput
              id="complete-price"
              v-model="completePrice"
              type="number"
              step="0.01"
              min="0"
              class="w-full"
              placeholder="0.00"
            />
            <p v-if="fieldErrors.actual_price" class="mt-1 text-xs text-error">
              {{ fieldErrors.actual_price }}
            </p>
            <p class="mt-1 text-[11px] text-muted">
              Kosongkan untuk mempertahankan harga aktual yang sudah ada. Expense membutuhkan harga aktual &gt; 0.
            </p>
          </div>

          <div class="flex gap-2">
            <UButton type="button" color="neutral" variant="outline" block @click="completeOpen = false">
              Batal
            </UButton>
            <UButton type="submit" block :loading="submitting" :disabled="submitting">
              Selesaikan
            </UButton>
          </div>
        </form>
      </template>
    </UModal>

    <!-- Delete -->
    <UModal v-model:open="deleteOpen" title="Hapus Item">
      <template #body>
        <div class="flex flex-col gap-4">
          <UAlert
            v-if="mutationError"
            color="error"
            variant="soft"
            title="Item belum dapat dihapus."
            :description="mutationError"
          />

          <p class="text-sm">
            Hapus <span class="font-medium">{{ deletingItem?.title }}</span>? Tindakan ini tidak dapat dibatalkan.
          </p>
          <p class="text-xs text-muted">
            Item yang sudah memiliki Expense tidak dapat dihapus.
          </p>

          <div class="flex gap-2">
            <UButton color="neutral" variant="outline" block @click="deleteOpen = false">
              Batal
            </UButton>
            <UButton color="error" block :loading="submitting" :disabled="submitting" @click="onDeleteSubmit()">
              Hapus
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Expense -->
    <UModal v-model:open="expenseOpen" title="Catat Expense">
      <template #body>
        <form class="flex flex-col gap-4" @submit.prevent="onExpenseSubmit">
          <UAlert
            v-if="mutationError"
            color="error"
            variant="soft"
            title="Expense belum tercatat."
            :description="mutationError"
          />

          <div class="rounded-2xl border border-default bg-elevated/50 p-3">
            <p class="truncate text-sm font-medium text-highlighted">{{ expensingItem?.title }}</p>
            <p class="text-xs text-muted">
              Nominal diturunkan backend dari harga aktual. Expense bersifat final: tidak dapat diubah atau dihapus dari sini.
            </p>
          </div>

          <div>
            <label for="expense-wallet" class="mb-1 block text-sm font-medium">Dompet sumber</label>
            <USelect
              id="expense-wallet"
              v-model="expenseForm.wallet_id"
              :items="[{ label: 'Pilih dompet', value: 'none' }, ...walletOptions]"
              value-key="value"
              class="w-full"
              :loading="walletsPending"
              :disabled="walletsPending || walletsError !== null || activeWallets.length === 0"
              placeholder="Pilih dompet"
            />
            <p v-if="walletsError" class="mt-1 text-xs text-error">
              {{ walletsError }}
              <UButton variant="link" size="xs" class="px-1" @click="wallets.refresh()">Coba lagi</UButton>
            </p>
            <p v-else-if="!walletsPending && activeWallets.length === 0" class="mt-1 text-xs text-error">
              Belum ada dompet aktif. Expense tidak dapat dibuat.
            </p>
            <p v-if="fieldErrors.wallet_id" class="mt-1 text-xs text-error">{{ fieldErrors.wallet_id }}</p>
          </div>

          <div>
            <label for="expense-category" class="mb-1 block text-sm font-medium">
              Kategori <span class="font-normal text-muted">(opsional)</span>
            </label>
            <USelect
              id="expense-category"
              v-model="expenseForm.category_id"
              :items="[{ label: 'Tanpa kategori', value: 'none' }, ...categoryOptions]"
              value-key="value"
              class="w-full"
              :loading="categoriesPending"
              :disabled="categoriesPending || categoriesError !== null"
              placeholder="Pilih kategori"
            />
            <p v-if="categoriesError" class="mt-1 text-xs text-error">{{ categoriesError }}</p>
            <p v-if="fieldErrors.category_id" class="mt-1 text-xs text-error">{{ fieldErrors.category_id }}</p>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="expense-date" class="mb-1 block text-sm font-medium">
                Tanggal <span class="font-normal text-muted">(opsional)</span>
              </label>
              <UInput id="expense-date" v-model="expenseForm.occurred_on" type="date" class="w-full" />
              <p v-if="fieldErrors.occurred_on" class="mt-1 text-xs text-error">{{ fieldErrors.occurred_on }}</p>
            </div>
            <div>
              <label for="expense-actual-price" class="mb-1 block text-sm font-medium">Harga aktual</label>
              <UInput
                id="expense-actual-price"
                v-model="expenseForm.actual_price"
                type="number"
                step="0.01"
                min="0"
                class="w-full"
                placeholder="0.00"
              />
              <p v-if="fieldErrors.actual_price" class="mt-1 text-xs text-error">
                {{ fieldErrors.actual_price }}
              </p>
            </div>
          </div>

          <p class="text-[11px] text-muted">
            Kosongkan tanggal untuk memakai hari bisnis server (WIB). Saldo dan kecukupan dana divalidasi backend.
          </p>

          <div class="flex gap-2">
            <UButton type="button" color="neutral" variant="outline" block @click="expenseOpen = false">
              Batal
            </UButton>
            <UButton
              type="submit"
              block
              :loading="submitting"
              :disabled="submitting || expenseForm.wallet_id === 'none'"
            >
              Catat Expense
            </UButton>
          </div>
        </form>
      </template>
    </UModal>
  </div>
</template>
