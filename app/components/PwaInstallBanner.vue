<script setup lang="ts">
const { shouldShow, isIos, capture, markInstalled, dismiss, install } = usePwaInstall()

onMounted(() => {
  window.addEventListener('beforeinstallprompt', capture)
  window.addEventListener('appinstalled', markInstalled)
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', capture)
  window.removeEventListener('appinstalled', markInstalled)
})
</script>

<template>
  <div
    v-if="shouldShow"
    role="dialog"
    aria-label="Pasang aplikasi"
    class="fixed inset-x-0 bottom-20 z-20 mx-auto w-full max-w-2xl px-4 md:bottom-6"
  >
    <div
      class="flex flex-col gap-4 rounded-2xl border border-border bg-background p-4 shadow-lg w-full"
    >
      <p class="text-sm font-medium">Pasang Homflo di perangkat Anda</p>
      <p v-if="isIos" class="text-sm text-slate-600">
        Ketuk Bagikan lalu "Add to Home Screen".
      </p>
      <div class="flex gap-2">
        <UButton v-if="isIos" variant="solid" size="lg" @click="install()"> Pasang </UButton>
        <UButton variant="outline" size="lg" @click="dismiss()"> Nanti </UButton>
      </div>
    </div>
  </div>
</template>
