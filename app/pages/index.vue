<script setup lang="ts">
import Button from '@/components/ui/button/Button.vue'

definePageMeta({ layout: 'auth' })

const auth = useAuth()

onMounted(async () => {
  const status = await auth.bootstrap()

  if (status === 'authenticated') {
    await navigateTo('/dashboard')
  }
})
</script>

<template>
  <div class="flex w-full flex-col items-center justify-center text-center">
      <div class="flex flex-col items-center justify-center gap-4">
        <NuxtImg
          src="/img/homflo-light-vertical.webp"
          alt="Homflo Logo"
          width="100%"
          height="100%"
          class="mx-auto w-full max-w-32 dark:hidden"
        />
        <div class="flex flex-col items-center justify-center gap-1">
          <h1 class="text-2xl font-bold dark:text-stone-300">Mulai lebih tertata</h1>
          <p class="text-sm text-stone-600 dark:text-stone-400">
            Satu tempat untuk keuangan pribadi dan keluarga.
          </p>
        </div>
      </div>

      <div class="mt-6 flex flex-col gap-4 w-full">
        <Button as-child size="lg" class="text-base">
          <NuxtLink to="/login">Masuk</NuxtLink>
        </Button>
        <Button variant="outline" as-child size="lg" class="text-base">
          <NuxtLink to="/register">Daftar</NuxtLink>
        </Button>
      </div>
  </div>
</template>
