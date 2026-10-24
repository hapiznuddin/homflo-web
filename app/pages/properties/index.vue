<script setup lang="ts">
import { computed, watch } from 'vue'
import { useToast } from '~/composables/useToast'
import { useAuth } from '~/composables/useAuth'
import { useProperties } from '~/composables/useProperties'
import { formatYmd } from '~/utils/format'
import UButton from '~/components/ui/button/index.vue'
import UIcon from '~/components/ui/icon/index.vue'
import USkeleton from '~/components/ui/skeleton/index.vue'
import UAlert from '~/components/ui/alert/index.vue'
import NuxtLink from 'nuxt/jsx'
import PropertyFormModal from '~/components/properties/PropertyFormModal.vue'

definePageMeta({ middleware: ['auth', 'verified'] })

const route = useRoute()
const toast = useToast()
const auth = useAuth()
const properties = useProperties()
const { items, pending, submitting, error, fieldErrors } = properties
const includeArchived = computed(() => route.query.include_archived === 'true')

// Watch for route query changes to reload properties
watch(
  () => route.query.include_archived,
  async (newValue) => {
    await properties.load()
  },
  { deep: true }
)

async function onFormSubmit(values: any): Promise<void> {
  const saved = await properties.create(values)

  if (saved) {
    formOpen.value = false
    toast.add({
      title: 'Property ditambah',
      description: 'Data tersimpan.',
      color: 'success'
    })
    await properties.refresh()
  }
}

function openCreate(): void {
  properties.clearError()
  formOpen.value = true
}

// Format status kepemilikan
function ownershipStatusLabel(status: string | null): string {
  if (!status) return '—'
  return status === 'owned' ? 'Milik sendiri' : 'Disewa'
}

// Format tipe property
function typeLabel(type: string | null): string {
  if (!type) return '—'
  const labels: Record<string, string> = {
    house: 'Rumah',
    apartment: 'Apartemen',
    land: 'Tanah',
    shophouse: 'Ruko',
    other: 'Lainnya'
  }
  return labels[type] || type
}
</script>

<template>
  <div class="flex w-full flex-col gap-4 sm:gap-5">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start justify-between gap-4">
      <div>
        <h1 class="truncate text-xl font-bold tracking-tight text-highlighted sm:text-2xl">Properti</h1>
        <p class="mt-0.5 text-sm text-muted">Kelola properti rumah tangga Anda</p>
      </div>

      <div v-if="auth.isHouseholdOwner.value" class="flex shrink-0 gap-2">
        <UButton
          icon="i-lucide-plus"
          color="primary"
          @click="openCreate"
        >
          Tambah Property
        </UButton>
      </div>
    </div>

    <!-- Filter toggle -->
    <div v-if="auth.isHouseholdOwner.value" class="mt-3 flex items-center gap-2">
      <UButton
        v-if="!includeArchived"
        size="xs"
        color="neutral"
        variant="outline"
        @click="route.query.include_archived = 'true'"
      >
        Tampilkan arsip
      </UButton>
      <UButton
        v-else
        size="xs"
        color="neutral"
        variant="outline"
        @click="route.query.include_archived = undefined"
      >
        Tampilkan aktif saja
      </UButton>
    </div>

    <!-- Loading & Empty & Error -->
    <div v-if="pending && items.value.length === 0" class="flex flex-col gap-3" aria-label="Memuat properti">
      <USkeleton v-for="index in 3" :key="index" class="h-16" />
    </div>

    <UAlert
      v-else-if="error && items.value.length === 0"
      color="error"
      variant="soft"
      title="Data properti belum dapat dimuat."
      :description="error"
      :actions="[{ label: 'Coba lagi', onClick: () => void properties.refresh() }]"
    />

    <template v-else>
      <template v-if="items.value.length === 0">
        <p class="text-sm text-muted center">Belum ada properti tercatat.</p>
        <UButton
          v-if="auth.isHouseholdOwner.value"
          color="neutral"
          variant="outline"
          size="sm"
          class="mt-3 w-full"
          @click="openCreate"
        >
          Tambah Property
        </UButton>
      </template>

      <template v-else>
        <ul class="flex flex-col divide-y divide-default rounded-2xl border border-default bg-background px-4">
          <li v-for="item in items" :key="item.id" class="flex w-full items-center gap-3 py-3 first:pt-3 last:pb-3">
            <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-elevated" aria-hidden="true">
              <UIcon :name="item.archived_at ? 'i-lucide-archive' : 'i-lucide-folder'" class="size-4.5 text-default" />
            </span>
            <span class="min-w-0 flex-1 truncate">
              <span class="block truncate text-sm font-medium text-highlighted">{{ item.name }}</span>
              <span class="block text-xs text-muted">
                Tipe: {{ typeLabel(item.type) }} · Kepemilikan: {{ ownershipStatusLabel(item.ownership_status) }}
              </span>
            </span>
            <span v-if="item.archived_at" class="shrink-0 text-sm font-medium text-highlighted">Arsip</span>
            <UIcon name="i-lucide-chevron-right" class="size-4 shrink-0 text-muted" aria-hidden="true" />

            <NuxtLink
              :to="`/properties/${item.id}`"
              class="flex w-full items-center gap-3 py-3 text-left"
            >
              <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-elevated" aria-hidden="true">
                <UIcon name="i-lucide-folder" class="size-4.5 text-default" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-medium text-highlighted">{{ item.name }}</span>
                <span class="block text-xs text-muted">
                  Alamat: {{ item.address }}
                </span>
              </span>
              <UIcon name="i-lucide-chevron-right" class="size-4 shrink-0 text-muted" aria-hidden="true" />
            </NuxtLink>
          </li>
        </ul>

        <UAlert
          v-if="error && items.value.length > 0"
          color="error"
          variant="soft"
          title="Aksi terakhir gagal."
          :description="error"
        />
      </template>
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