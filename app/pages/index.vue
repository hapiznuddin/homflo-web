<script setup lang="ts">
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
  <div>
    <h1 class="text-2xl font-bold">Homflo</h1>
    <p class="mt-1 text-sm text-slate-600">Kelola keuangan rumah tangga dan pribadi.</p>

    <div class="mt-6 flex flex-col gap-3">
      <UButton block to="/login" class="bg-homflo-primary text-white rounded-xl min-h-12 text-base">
        Masuk
      </UButton>
      <UButton block color="neutral" variant="outline" to="/register" class="min-h-12 text-base">
        Daftar
      </UButton>
    </div>
  </div>
</template>
