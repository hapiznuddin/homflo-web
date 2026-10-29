<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'onboarding'] })

const toast = useToast()
const auth = useAuth()
const listsApi = useLists()
const { lists, pending, submitting, error } = listsApi

const load = listsApi.load ?? listsApi.loadLists
const refresh = listsApi.refresh ?? listsApi.refreshLists
const create = listsApi.create ?? listsApi.createList

const isOwner = computed(() => auth.isHouseholdOwner?.value ?? false)

const tab = ref<'active' | 'archived'>('active')
const formOpen = ref(false)
const formName = ref('')
const formType = ref<'shopping' | 'custom'>('shopping')
const typeDropdownOpen = ref(false)

const EMPTY_COPY: Record<'active' | 'archived', string> = {
  active: 'Belum ada list yang akan datang.',
  archived: 'Belum ada list yang diarsipkan.'
}

const visibleLists = computed(() => {
  if (tab.value === 'archived') {
    return lists.value.filter((l) => Boolean(l.archived_at))
  }
  return lists.value.filter((l) => !l.archived_at)
})

async function switchTab(next: 'active' | 'archived'): Promise<void> {
  if (tab.value === next) return
  tab.value = next
  if (next === 'archived') {
    await load({ include_archived: true }, true)
  } else {
    await load({ include_archived: false }, true)
  }
}

function openCreate(): void {
  formName.value = ''
  formType.value = 'shopping'
  typeDropdownOpen.value = false
  formOpen.value = true
}

function closeCreate(): void {
  formOpen.value = false
}

async function onFormSubmit(): Promise<void> {
  if (!formName.value.trim()) return

  const saved = await create({
    name: formName.value.trim(),
    type: formType.value
  })

  if (saved) {
    formOpen.value = false
    toast.add({
      title: 'List ditambah',
      description: 'Data tersimpan.',
      color: 'success'
    })
  }
}

function retry(): void {
  void refresh()
}

await load()
</script>

<template>
  <div class="flex flex-col gap-4 sm:gap-5 w-full">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h1 class="truncate text-xl font-bold tracking-tight text-highlighted sm:text-2xl">
          Daftar Belanja
        </h1>
        <p class="mt-0.5 text-sm text-muted">Beberapa list belanja untuk rumah tangga Anda.</p>
      </div>

      <UButton v-if="isOwner" icon="i-lucide-plus" @click="openCreate()">
        Tambah List
      </UButton>
    </div>

    <!-- Status tabs -->
    <div
      v-if="isOwner"
      class="flex flex-wrap items-center gap-2"
      role="tablist"
      aria-label="Filter list"
    >
      <UButton
        v-for="item in (['active', 'archived'] as const)"
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
      <p class="text-sm text-muted">
        Anda anggota rumah tangga — pengelolaan list dilakukan pemilik.
      </p>
    </div>

    <!-- Loading skeleton -->
    <div v-if="pending && visibleLists.length === 0" class="flex flex-col gap-3" aria-label="Memuat daftar list">
      <USkeleton v-for="index in 3" :key="index" class="h-16" />
    </div>

    <!-- Error on empty list -->
    <UAlert
      v-else-if="error && visibleLists.length === 0"
      color="error"
      variant="soft"
      title="Data daftar list belum dapat dimuat."
      :description="error"
      :actions="[{ label: 'Coba lagi', onClick: retry }]"
    />

    <!-- Empty or List items -->
    <template v-else>
      <div v-if="visibleLists.length === 0" class="py-10 text-center">
        <p class="text-sm text-muted">
          {{ EMPTY_COPY[tab] }}
        </p>

        <UButton
          v-if="isOwner"
          color="neutral"
          variant="outline"
          size="sm"
          class="mt-3"
          @click="openCreate()"
        >
          Tambah List
        </UButton>
      </div>

      <ul
        v-else
        class="flex flex-col divide-y divide-default rounded-2xl border border-default bg-background px-4"
      >
        <li
          v-for="list in visibleLists"
          :key="list.id"
          class="flex w-full items-center gap-3 py-3 text-left first:pt-3 last:pb-3"
        >
          <NuxtLink :to="`/lists/${list.id}`" class="flex w-full items-center gap-3">
            <span
              class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-elevated"
              aria-hidden="true"
            >
              <UIcon
                :name="list.type === 'shopping' ? 'i-lucide-shopping-cart' : 'i-lucide-folder'"
                class="size-4.5 text-default"
              />
            </span>
            <span class="min-w-0 flex-1 truncate">
              <span class="font-medium text-highlighted">{{ list.name }}</span>
              <span v-if="list.type === 'custom'" class="ml-1 text-xs text-muted">(custom)</span>
              <span
                v-if="list.is_default"
                class="ml-1 rounded-full bg-elevated px-2 py-0.5 text-[11px] font-medium"
              >Default</span>
            </span>
            <span class="flex shrink-0 flex-col items-end gap-1 text-xs text-muted">
              <span>{{ list.counts.active }} aktif</span>
              <span>{{ list.counts.completed }} completed</span>
            </span>
          </NuxtLink>
        </li>
      </ul>

      <UAlert
        v-if="error && visibleLists.length > 0"
        color="error"
        variant="soft"
        title="Aksi terakhir gagal."
        :description="error"
      />
    </template>

    <!-- Modal Form Create List -->
    <UModal v-model:open="formOpen" title="Tambah List">
      <template #body>
        <form class="flex flex-col gap-4" @submit.prevent="onFormSubmit">
          <div>
            <label for="list-name" class="mb-1 block text-sm font-medium">Nama</label>
            <input
              id="list-name"
              v-model="formName"
              type="text"
              placeholder="cth. Belanja Mingguan"
              maxlength="255"
              autocomplete="off"
              class="w-full rounded-md border border-default bg-background p-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
          </div>

          <div>
            <label for="list-type" class="mb-1 block text-sm font-medium">Tipe</label>
            <div class="relative">
              <button
                id="list-type"
                type="button"
                class="flex w-full items-center justify-between rounded-md border border-default bg-background p-2 text-left text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                @click="typeDropdownOpen = !typeDropdownOpen"
              >
                <span>{{ formType === 'shopping' ? 'Shopping' : 'Tanpa tipe' }}</span>
                <UIcon name="i-lucide-chevron-down" class="size-4 text-muted" />
              </button>

              <div
                v-if="typeDropdownOpen"
                class="absolute z-50 mt-1 flex w-full flex-col rounded-md border border-default bg-elevated p-1 shadow-lg"
              >
                <button
                  type="button"
                  data-test="option"
                  class="rounded px-2 py-1.5 text-left text-sm hover:bg-muted/10"
                  @click="formType = 'shopping'; typeDropdownOpen = false"
                >
                  Shopping
                </button>
                <button
                  type="button"
                  data-test="option"
                  class="rounded px-2 py-1.5 text-left text-sm hover:bg-muted/10"
                  @click="formType = 'custom'; typeDropdownOpen = false"
                >
                  Tanpa tipe
                </button>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <UButton type="button" color="neutral" variant="outline" @click="closeCreate()">
              Batal
            </UButton>
            <button
              type="submit"
              class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary"
              :disabled="submitting"
            >
              Simpan
            </button>
          </div>
        </form>
      </template>
    </UModal>
  </div>
</template>
