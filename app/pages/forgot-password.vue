<script setup lang="ts">
import VInput from '@/components/ui/v-input/VInput.vue'
import Button from '@/components/ui/button/Button.vue'

definePageMeta({ layout: 'auth', middleware: 'guest' })

const { api } = useLaravel()

const form = reactive({ email: '' })
const submitting = ref(false)
const formError = ref<string | null>(null)
const sent = ref(false)

async function onSubmit(): Promise<void> {
  submitting.value = true
  formError.value = null
  sent.value = false

  try {
    await api('/password/forgot', { method: 'POST', body: { email: form.email } })
    sent.value = true
  } catch (error: unknown) {
    formError.value = readError(error, 'Permintaan gagal. Coba lagi.')
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
        <h1 class="text-2xl font-bold dark:text-white">Lupa kata sandi</h1>
        <p class="text-sm text-stone-500 dark:text-stone-400">
          Masukkan email Anda. Jika terdaftar, tautan pemulihan akan dikirim.
        </p>
      </div>
    </div>

    <form class="mt-6 flex flex-col gap-6 w-full" novalidate @submit.prevent="onSubmit">
      <div class="flex flex-col w-full justify-start items-start gap-1">
        <label for="forgot-email" class="block text-sm md:text-base font-medium dark:text-white">Email</label>
        <VInput
          id="forgot-email"
          v-model="form.email"
          trailing-icon="i-lucide-at-sign"
          type="email"
          size="lg"
          placeholder="Enter your email"
          autocomplete="email"
          required
          class="w-full"
          :ui="{ base: 'min-h-10 text-base rounded-lg' }"
        />
      </div>

      <p v-if="formError" role="alert" aria-live="assertive" class="text-sm text-red-600">
        {{ formError }}
      </p>
      <p v-if="sent" role="status" class="text-sm text-green-700">
        Jika email terdaftar, tautan pemulihan telah dikirim.
      </p>

      <Button
        type="submit"
        block
        size="lg"
        :loading="submitting"
        :disabled="submitting"
        class="text-base"
      >
        Kirim Email
      </Button>
    </form>

    <div class="mt-6 flex items-center justify-center gap-1">
      <NuxtLink
        to="/login"
        class="underline text-end font-medium text-primary/90 hover:text-primary/60 dark:text-primary dark:hover:text-primary/60"
      >
        Kembali ke halaman login
      </NuxtLink>
    </div>
  </div>
</template>
