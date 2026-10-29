<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'onboarding'] })

const auth = useAuth()

const sections = computed(() => [
  {
    title: 'Rumah Tangga',
    description: auth.household.value?.name ?? 'Informasi rumah tangga aktif.',
    icon: 'i-lucide-house',
    to: '/settings/household'
  },
  {
    title: 'Anggota',
    description: 'Kelola anggota, peran, dan undangan rumah tangga.',
    icon: 'i-lucide-users',
    to: '/settings/members'
  },
  {
    title: 'Kategori',
    description: 'Kelompok pemasukan dan pengeluaran.',
    icon: 'i-lucide-tags',
    to: '/categories'
  },
  {
    title: 'Akun',
    description: 'Profil, verifikasi email, dan kata sandi.',
    icon: 'i-lucide-user',
    to: '/account'
  },
  {
    title: 'Preferensi Aplikasi',
    description: 'Belum tersedia pada kontrak saat ini.',
    icon: 'i-lucide-sliders-horizontal',
    to: '/settings/preferences'
  }
])
</script>

<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-5">
    <div>
      <h1 class="text-xl font-bold tracking-tight text-highlighted sm:text-2xl">Pengaturan</h1>
      <p class="mt-1 text-sm text-muted">Kelola rumah tangga, akun, dan konfigurasi aplikasi.</p>
    </div>

    <nav aria-label="Bagian pengaturan" class="divide-y divide-default overflow-hidden rounded-2xl border border-default bg-background">
      <NuxtLink
        v-for="section in sections"
        :key="section.to"
        :to="section.to"
        class="flex items-center gap-3 px-4 py-4 transition-colors hover:bg-elevated"
      >
        <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-elevated">
          <UIcon :name="section.icon" class="size-5" aria-hidden="true" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-medium text-highlighted">{{ section.title }}</span>
          <span class="mt-0.5 block truncate text-xs text-muted">{{ section.description }}</span>
        </span>
        <UIcon name="i-lucide-chevron-right" class="size-4 shrink-0 text-muted" aria-hidden="true" />
      </NuxtLink>
    </nav>
  </div>
</template>
