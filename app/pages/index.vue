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
  <div class="flex min-h-screen flex-col items-center justify-center text-center">
    <div
      class="w-full max-w-sm md:max-w-xl lg:max-w-4xl rounded-2xl border border-slate-200 bg-white/30 backdrop-blur-sm p-6 shadow-md"
    >
      <h1 class="text-2xl font-bold">Homflo</h1>
      <p class="mt-1 text-sm text-slate-600">Kelola keuangan rumah tangga dan pribadi.</p>

      <div class="mt-6 flex flex-col gap-3">
        <Button>Masuk</Button>
        <Button variant="outline">Daftar</Button>
      </div>
    </div>
  </div>
</template>
