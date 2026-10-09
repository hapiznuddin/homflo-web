<script setup lang="ts">
const { $pwa } = useNuxtApp()

const needRefresh = computed(() => $pwa?.needRefresh ?? false)

async function update(): Promise<void> {
  await $pwa?.updateServiceWorker()
}
</script>

<template>
  <div
    v-if="needRefresh"
    role="status"
    aria-live="polite"
    class="fixed inset-x-0 top-20 z-20 mx-auto w-full max-w-2xl px-4 md:top-6"
  >
    <div
      class="flex flex-col gap-4 rounded-2xl border border-border bg-background p-4 shadow-lg w-full"
    >
      <p class="text-sm font-semibold">Versi baru tersedia</p>
      <div class="flex justify-center items-center gap-4 w-full">
        <UButton variant="solid" size="lg" @click="update()"> Perbarui </UButton>
        <UButton variant="outline" size="lg" @click="needRefresh = false"> Nanti </UButton>
      </div>
    </div>
  </div>
</template>
