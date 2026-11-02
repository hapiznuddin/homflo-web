<script setup lang="ts">
import type { AuthHousehold } from '~/composables/useAuth'

definePageMeta({ middleware: ['auth', 'onboarding'] })

const auth = useAuth()
const settings = useHouseholdSettings()
const toast = useToast()
const household = auth.household
const households = computed<AuthHousehold[]>(() => {
  if (auth.households.value.length > 0) {
    return auth.households.value
  }

  return household.value ? [household.value] : []
})
const canManage = computed(() => auth.isHouseholdOwner.value)
const pending = computed(() => auth.pending.value && household.value === null)
const loadError = computed(() =>
  auth.status.value === 'error'
    ? auth.error.value ?? 'Data rumah tangga belum dapat dimuat.'
    : null
)
const unavailable = computed(
  () => !pending.value && loadError.value === null && household.value === null
)
const retrying = ref(false)
const name = ref(household.value?.name ?? '')
const nameError = computed(() => settings.renameFieldErrors.value.name ?? null)

watch(household, (next) => {
  name.value = next?.name ?? ''
  settings.clearRenameErrors()
}, { immediate: true })

function onNameInput(): void {
  settings.clearRenameErrors()
}

async function submitRename(): Promise<void> {
  if (await settings.rename(name.value)) {
    name.value = household.value?.name ?? name.value
    toast.add({ title: 'Nama rumah tangga diperbarui', color: 'success' })
  }
}

async function switchTo(target: AuthHousehold): Promise<void> {
  if (target.id === household.value?.id) {
    return
  }

  if (await settings.activate(target.id)) {
    toast.add({
      title: 'Rumah tangga aktif diganti',
      description: `Sekarang menampilkan data ${target.name}.`,
      color: 'success'
    })
  }
}

// Household aktif berasal dari /api/auth/me yang sudah di-bootstrap
// middleware. Muat ulang lewat boundary Nuxt yang sama, bukan langsung ke
// Laravel, dan tanpa mengubah status sesi saat request gagal.
async function retry(): Promise<void> {
  if (retrying.value) {
    return
  }

  retrying.value = true

  try {
    await auth.refresh()
  } finally {
    retrying.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-5">
    <div>
      <UButton to="/settings" color="neutral" variant="link" icon="i-lucide-arrow-left" class="-ml-2">Pengaturan</UButton>
      <h1 class="mt-2 text-xl font-bold tracking-tight text-highlighted sm:text-2xl">Rumah Tangga</h1>
    </div>

    <div v-if="pending" class="flex flex-col gap-3" aria-label="Memuat rumah tangga">
      <USkeleton class="h-24" />
    </div>

    <UAlert
      v-else-if="loadError"
      color="error"
      variant="soft"
      title="Data rumah tangga belum dapat dimuat."
      :description="loadError"
      :actions="[{ label: 'Coba lagi', onClick: retry }]"
    />

    <UAlert
      v-else-if="unavailable"
      color="warning"
      variant="soft"
      title="Rumah tangga belum tersedia"
      description="Akun ini belum tergabung dalam rumah tangga aktif. Selesaikan onboarding terlebih dahulu."
      :actions="[{ label: 'Coba lagi', onClick: retry }]"
    />

    <template v-else-if="household">
      <dl class="divide-y divide-default overflow-hidden rounded-2xl border border-default bg-background text-sm">
        <div class="flex justify-between gap-4 px-4 py-3">
          <dt class="text-muted">Nama</dt>
          <dd class="text-right font-medium text-highlighted">{{ household.name }}</dd>
        </div>
        <div class="flex justify-between gap-4 px-4 py-3">
          <dt class="text-muted">Peran Anda</dt>
          <dd class="text-right font-medium capitalize text-highlighted">{{ household.role }}</dd>
        </div>
      </dl>

      <form
        v-if="canManage"
        class="flex flex-col gap-3 rounded-2xl border border-default bg-background p-4"
        novalidate
        @submit.prevent="submitRename"
      >
        <div>
          <h2 class="text-sm font-semibold text-highlighted">Ubah nama rumah tangga</h2>
          <p class="mt-1 text-xs text-muted">Hanya owner yang dapat mengubah nama.</p>
        </div>
        <div>
          <UInput
            v-model="name"
            type="text"
            autocomplete="organization"
            aria-label="Nama rumah tangga"
            :disabled="settings.renaming.value"
            :aria-invalid="nameError ? 'true' : undefined"
            :aria-describedby="nameError ? 'household-name-error' : undefined"
            class="w-full"
            required
            @update:model-value="onNameInput"
          />
          <p v-if="nameError" id="household-name-error" role="alert" class="mt-1 text-xs text-error">
            {{ nameError }}
          </p>
          <p v-else-if="settings.renameError.value" role="alert" class="mt-1 text-xs text-error">
            {{ settings.renameError.value }}
          </p>
        </div>
        <UButton
          type="submit"
          :loading="settings.renaming.value"
          :disabled="settings.renaming.value"
          class="self-start"
        >
          Simpan nama
        </UButton>
      </form>

      <UAlert
        v-else
        color="neutral"
        variant="soft"
        title="Hanya owner yang dapat mengubah nama"
        description="Nama rumah tangga dikelola oleh owner."
      />

      <section class="flex flex-col gap-3" aria-labelledby="household-switcher-heading">
        <div>
          <h2 id="household-switcher-heading" class="text-sm font-semibold text-highlighted">
            Rumah tangga aktif
          </h2>
          <p class="mt-1 text-xs text-muted">
            Pilih rumah tangga yang ingin ditampilkan. Data seluruh domain akan mengikuti pilihan ini.
          </p>
        </div>

        <UAlert
          v-if="settings.switchError.value"
          color="error"
          variant="soft"
          title="Rumah tangga belum dapat diganti."
          :description="settings.switchError.value"
        />

        <ul class="divide-y divide-default overflow-hidden rounded-2xl border border-default bg-background">
          <li
            v-for="item in households"
            :key="item.id"
            class="flex flex-wrap items-center gap-3 px-4 py-3"
          >
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-highlighted">{{ item.name }}</p>
              <p class="text-xs capitalize text-muted">{{ item.role }}</p>
            </div>
            <UBadge v-if="item.id === household.id" color="success" variant="subtle">
              Aktif
            </UBadge>
            <UButton
              v-else
              color="neutral"
              variant="outline"
              size="sm"
              :loading="settings.switchingId.value === item.id"
              :disabled="settings.switchingId.value !== null"
              :aria-label="`Ganti ke ${item.name}`"
              @click="switchTo(item)"
            >
              Ganti
            </UButton>
          </li>
        </ul>
      </section>

      <UButton to="/settings/members" color="neutral" variant="outline" icon="i-lucide-users">
        Kelola anggota
      </UButton>
    </template>
  </div>
</template>
