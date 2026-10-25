<script setup lang="ts">
import PropertyFormModal from '~/components/properties/PropertyFormModal.vue'
import type { PropertyFormValues } from '~/types/properties'
import { propertyOwnershipLabel, propertyTypeLabel } from '~/utils/properties'

// Daftar properti: semua anggota boleh membaca; create hanya owner (role
// dari /api/auth/me). Baris membuka /properties/{id}; edit/archive/restore
// hidup di halaman detail. Filter arsip mengikuti kontrak backend:
// include_archived=true → aktif + arsip, tanpa parameter → hanya aktif.
definePageMeta({ middleware: ['auth', 'verified'] })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const auth = useAuth()
const properties = useProperties()
const { items, pending, submitting, error, fieldErrors } = properties

const includeArchived = ref(route.query.include_archived === 'true')
const formOpen = ref(false)
const isOwner = computed(() => auth.isHouseholdOwner.value)

// Perubahan query dari tombol atau navigasi browser memuat ulang set data
// yang sesuai. Filter tombol mengubah URL agar state dapat dibagikan.
watch(() => route.query.include_archived, (value) => {
  const next = value === 'true'

  if (next === includeArchived.value) {
    return
  }

  includeArchived.value = next
  void properties.load({ include_archived: next }, true)
})

async function toggleArchived(): Promise<void> {
  const next = !includeArchived.value

  includeArchived.value = next
  await router.replace({
    query: {
      ...route.query,
      include_archived: next ? 'true' : undefined
    }
  })
  await properties.load({ include_archived: next }, true)
}

function openCreate(): void {
  properties.clearError()
  formOpen.value = true
}

async function onFormSubmit(values: PropertyFormValues): Promise<void> {
  const saved = await properties.create(values)

  if (saved) {
    formOpen.value = false
    toast.add({
      title: 'Properti ditambah',
      description: 'Data tersimpan.',
      color: 'success'
    })
  }
}

function retry(): void {
  void properties.refresh()
}

await properties.load({ include_archived: includeArchived.value })
</script>

<template>
  <div class="flex w-full flex-col gap-4 sm:gap-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h1 class="truncate text-xl font-bold tracking-tight text-highlighted sm:text-2xl">Properti</h1>
        <p class="mt-0.5 text-sm text-muted">Kelola properti rumah tangga Anda.</p>
      </div>

      <div v-if="isOwner" class="flex shrink-0 gap-2">
        <UButton icon="i-lucide-plus" @click="openCreate()">
          Tambah Properti
        </UButton>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <UButton
        :icon="includeArchived ? 'i-lucide-eye-off' : 'i-lucide-archive'"
        size="xs"
        color="neutral"
        variant="outline"
        @click="toggleArchived()"
      >
        {{ includeArchived ? 'Tampilkan aktif saja' : 'Tampilkan arsip' }}
      </UButton>
      <span v-if="includeArchived" class="text-xs text-muted">Termasuk properti yang diarsipkan.</span>
    </div>

    <div v-if="pending && items.length === 0" class="flex flex-col gap-3" aria-label="Memuat properti">
      <USkeleton v-for="index in 3" :key="index" class="h-16" />
    </div>

    <UAlert
      v-else-if="error && items.length === 0"
      color="error"
      variant="soft"
      title="Data properti belum dapat dimuat."
      :description="error"
      :actions="[{ label: 'Coba lagi', onClick: retry }]"
    />

    <template v-else>
      <div v-if="items.length === 0" class="py-10 text-center">
        <p class="text-sm text-muted">
          {{ includeArchived ? 'Belum ada properti aktif atau arsip.' : 'Belum ada properti tercatat.' }}
        </p>
        <UButton
          v-if="isOwner"
          color="neutral"
          variant="outline"
          size="sm"
          class="mt-3"
          @click="openCreate()"
        >
          Tambah Properti
        </UButton>
      </div>

      <ul v-else class="flex flex-col divide-y divide-default rounded-2xl border border-default bg-background px-4">
        <li v-for="item in items" :key="item.id">
          <NuxtLink
            :to="`/properties/${item.id}`"
            class="flex w-full items-center gap-3 py-3 text-left"
          >
            <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-elevated" aria-hidden="true">
              <UIcon
                :name="item.archived_at ? 'i-lucide-archive' : 'i-lucide-folder'"
                class="size-4.5 text-default"
              />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-medium text-highlighted">{{ item.name }}</span>
              <span class="block truncate text-xs text-muted">
                {{ propertyTypeLabel(item.type) }} · {{ propertyOwnershipLabel(item.ownership_status) }}
              </span>
              <span class="block truncate text-xs text-muted">Alamat: {{ item.address }}</span>
            </span>
            <span v-if="item.archived_at" class="shrink-0 text-xs font-medium text-warning">Arsip</span>
            <UIcon name="i-lucide-chevron-right" class="size-4 shrink-0 text-muted" aria-hidden="true" />
          </NuxtLink>
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

    <PropertyFormModal
      v-model:open="formOpen"
      :editing="null"
      :submitting="submitting"
      :error="error"
      :field-errors="fieldErrors"
      @submit="onFormSubmit"
    />
  </div>
</template>
