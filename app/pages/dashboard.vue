<template>
  <div>
    <h1 class="text-xl font-bold">Beranda</h1>

    <section aria-label="Rumah tangga" class="mt-4 rounded-xl border border-slate-200 bg-white p-4">
      <h2 class="text-sm font-medium text-slate-600">Rumah tangga</h2>
      <p class="mt-1 text-lg font-semibold">
        {{ household?.name ?? '-' }}
      </p>
      <p class="text-sm text-slate-600">Peran: {{ household?.role ?? '-' }}</p>
    </section>

    <p
      v-if="!isEmailVerified"
      class="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm"
    >
      Email belum terverifikasi.
      <NuxtLink to="/verify-email" class="underline"> Verifikasi sekarang </NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'onboarding'] })

const auth = useAuth()
const { household, isEmailVerified } = auth
</script>
