<script setup lang="ts">
const colorMode = useColorMode()
const preferences = usePreferences()
const toast = useToast()

const isDark = computed(() => colorMode.value === 'dark')

async function setDark(value: boolean): Promise<void> {
  if (preferences.submitting.value) {
    return
  }

  const saved = await preferences.update(value ? 'dark' : 'light')

  if (!saved) {
    toast.add({
      title: 'Tema belum dapat diubah',
      description: preferences.error.value ?? 'Periksa koneksi lalu coba lagi.',
      color: 'error'
    })
  }
}
</script>

<template>
  <USwitch
    :model-value="isDark"
    checked-icon="i-lucide-moon"
    unchecked-icon="i-lucide-sun"
    aria-label="Ubah tema terang atau gelap"
    size="xl"
    :disabled="preferences.submitting.value"
    :loading="preferences.submitting.value"
    @update:model-value="setDark"
  />
</template>
