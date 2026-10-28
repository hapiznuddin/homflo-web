<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'onboarding'] })
</script>

<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-5">
    <div>
      <UButton to="/settings" color="neutral" variant="link" icon="i-lucide-arrow-left" class="-ml-2">Pengaturan</UButton>
      <h1 class="mt-2 text-xl font-bold tracking-tight text-highlighted sm:text-2xl">Preferensi Aplikasi</h1>
    </div>

    <UAlert
      color="neutral"
      variant="soft"
      title="Belum ada preferensi yang disimpan"
      description="Tidak ada model, endpoint, atau kontrak preferensi aplikasi pada implementasi saat ini. Pengaturan baru memerlukan keputusan produk dan kontrak tersendiri."
    />
  </div>
</template>
