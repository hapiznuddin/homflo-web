<script setup lang="ts">
const colorMode = useColorMode()

const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (value: boolean) => {
    colorMode.preference = value ? 'dark' : 'light'
  }
})
</script>

<template>
  <USwitch
    v-model="isDark"
    checked-icon="i-lucide-moon"
    unchecked-icon="i-lucide-sun"
    aria-label="Ubah tema terang atau gelap"
    size="xl"
  />
</template>
