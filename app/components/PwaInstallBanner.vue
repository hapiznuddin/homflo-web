<template>
  <div
    v-if="shouldShow"
    role="dialog"
    aria-label="Pasang aplikasi"
    class="fixed inset-x-0 bottom-20 z-20 mx-auto w-full max-w-2xl px-4 md:bottom-6"
  >
    <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
      <p class="text-sm font-medium">Pasang Homflo di perangkat Anda</p>
      <p v-if="isIos" class="mt-1 text-sm text-slate-600">
        Ketuk Bagikan lalu "Add to Home Screen".
      </p>
      <div class="mt-3 flex gap-2">
        <UButton v-if="!isIos" class="min-h-11 flex-1 text-sm" @click="install()"> Pasang </UButton>
        <UButton
          color="neutral"
          variant="outline"
          class="min-h-11 flex-1 text-sm"
          @click="dismiss()"
        >
          Nanti
        </UButton>
      </div>
    </div>
  </div>
</template>

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
