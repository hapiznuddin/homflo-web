<script setup lang="ts">
import VInput from '@/components/ui/v-input/VInput.vue'
import Button from '@/components/ui/button/Button.vue'

definePageMeta({ layout: 'auth', middleware: 'auth' })

const auth = useAuth()
const { api } = useLaravel()

const form = reactive({ name: '' })
const submitting = ref(false)
const formError = ref<string | null>(null)

async function onSubmit(): Promise<void> {
  submitting.value = true
  formError.value = null

  try {
    await api('/households', { method: 'POST', body: { name: form.name } })
    await auth.refresh()
    await navigateTo('/dashboard')
  } catch (error: unknown) {
    formError.value = readError(error, 'Gagal membuat rumah tangga.')
  } finally {
    submitting.value = false
  }
}
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
      <NuxtImg
        src="/img/homflo-dark-vertical.webp"
        alt="Homflo Logo"
        width="100%"
        height="100%"
        class="mx-auto w-full max-w-32 hidden dark:block"
      />
      <div class="flex flex-col items-center justify-center gap-1">
        <h1 class="text-2xl font-bold dark:text-white">Buat rumah tangga</h1>
        <p class="mt-1 text-sm text-slate-600 dark:text-stone-400">
          Anda akan menjadi pemilik rumah tangga ini.
        </p>
      </div>
    </div>

    <form class="mt-6 flex flex-col gap-4 w-full" novalidate @submit.prevent="onSubmit">
      <div class="flex flex-col w-full justify-start items-start gap-1">
        <label for="onboarding-name" class="block text-sm md:text-base font-medium dark:text-white"
          >Nama rumah tangga</label
        >
        <VInput
          id="onboarding-name"
          v-model="form.name"
          type="text"
          autocomplete="off"
          placeholder="Contoh: Rumah Tangga Budi"
          required
          class="w-full"
          :ui="{ base: 'min-h-10 text-base rounded-lg' }"
        />
      </div>

      <p v-if="formError" role="alert" aria-live="assertive" class="text-sm text-red-600">
        {{ formError }}
      </p>

      <Button
        type="submit"
        block
        size="lg"
        :loading="submitting"
        :disabled="submitting"
        class="text-base"
      >
        Buat
      </Button>
    </form>
  </div>
</template>
