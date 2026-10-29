<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'onboarding'] })

const auth = useAuth()
const household = auth.household
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

      <UButton to="/settings/members" color="neutral" variant="outline" icon="i-lucide-users">
        Kelola anggota
      </UButton>

      <UAlert
        color="neutral"
        variant="soft"
        title="Perubahan rumah tangga belum tersedia"
        description="Kontrak backend saat ini hanya menyediakan pembuatan rumah tangga dan tidak menyediakan pembaruan nama rumah tangga."
      />
    </template>
  </div>
</template>
