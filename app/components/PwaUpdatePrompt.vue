<template>
  <div
    v-if="needRefresh"
    role="status"
    aria-live="polite"
    class="fixed inset-x-0 bottom-20 z-20 mx-auto w-full max-w-2xl px-4 md:bottom-6"
  >
    <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
      <p class="text-sm font-medium">Versi baru tersedia</p>
      <div class="mt-3 flex gap-2">
        <UButton class="min-h-11 flex-1 text-sm" @click="update()"> Perbarui </UButton>
        <UButton
          color="neutral"
          variant="outline"
          class="min-h-11 flex-1 text-sm"
          @click="needRefresh = false"
        >
          Nanti
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { $pwa } = useNuxtApp()

const needRefresh = computed(() => $pwa?.needRefresh ?? false)

async function update(): Promise<void> {
  await $pwa?.updateServiceWorker()
}
</script>
