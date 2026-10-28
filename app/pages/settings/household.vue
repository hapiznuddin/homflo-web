<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'onboarding'] })

const auth = useAuth()
</script>

<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-5">
    <div>
      <UButton to="/settings" color="neutral" variant="link" icon="i-lucide-arrow-left" class="-ml-2">Pengaturan</UButton>
      <h1 class="mt-2 text-xl font-bold tracking-tight text-highlighted sm:text-2xl">Rumah Tangga</h1>
    </div>

    <dl class="divide-y divide-default overflow-hidden rounded-2xl border border-default bg-background text-sm">
      <div class="flex justify-between gap-4 px-4 py-3">
        <dt class="text-muted">Nama</dt>
        <dd class="text-right font-medium text-highlighted">{{ auth.household.value?.name ?? '-' }}</dd>
      </div>
      <div class="flex justify-between gap-4 px-4 py-3">
        <dt class="text-muted">Peran Anda</dt>
        <dd class="text-right font-medium capitalize text-highlighted">{{ auth.household.value?.role ?? '-' }}</dd>
      </div>
    </dl>

    <UAlert
      color="neutral"
      variant="soft"
      title="Perubahan rumah tangga belum tersedia"
      description="Kontrak backend saat ini hanya menyediakan pembuatan rumah tangga dan tidak menyediakan pembaruan nama rumah tangga."
    />
  </div>
</template>
