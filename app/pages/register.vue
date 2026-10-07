<script setup lang="ts">
import VInput from '@/components/ui/v-input/VInput.vue'
import Button from '@/components/ui/button/Button.vue'

definePageMeta({ layout: 'auth', middleware: 'guest' })

const auth = useAuth()
const { csrf, origin } = useLaravel()

const form = reactive({
  username: '',
  name: '',
  email: '',
  password: '',
  password_confirmation: ''
})
const submitting = ref(false)
const formError = ref<string | null>(null)
const showPassword = ref(false)
const showPasswordConfirmation = ref(false)

async function onSubmit(): Promise<void> {
  submitting.value = true
  formError.value = null

  try {
    const headers = await csrf()
    await $fetch(`${origin}/register`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json', ...headers },
      body: { ...form }
    })
    await auth.refresh()
    await navigateTo('/dashboard')
  } catch (error: unknown) {
    formError.value = readError(error, 'Pendaftaran gagal. Periksa kembali isian Anda.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex flex-col items-center justify-center text-center w-full">
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
        <h1 class="text-2xl font-bold dark:text-white">Kelola uang lebih mudah</h1>
        <p class="mt-1 text-sm text-stone-600 dark:text-stone-400">
          Buat akun Homflo baru, untuk mengelola keuangan rumah tangga anda.
        </p>
      </div>
    </div>

    <form class="mt-6 flex flex-col gap-4 w-full" novalidate @submit.prevent="onSubmit">
      <div class="flex flex-col w-full justify-start items-start gap-1">
        <label
          for="register-username"
          class="block text-sm md:text-base font-medium dark:text-white"
          >Username</label
        >
        <VInput
          id="register-username"
          v-model="form.username"
          type="text"
          autocomplete="username"
          placeholder="Enter your username"
          required
          class="w-full"
          :ui="{ base: 'min-h-10 text-base rounded-lg' }"
        />
      </div>

      <div class="flex flex-col w-full justify-start items-start gap-1">
        <label for="register-name" class="block text-sm md:text-base font-medium dark:text-white"
          >Nama lengkap</label
        >
        <VInput
          id="register-name"
          v-model="form.name"
          type="text"
          autocomplete="name"
          placeholder="Enter your full name"
          required
          class="w-full"
          :ui="{ base: 'min-h-10 text-base rounded-lg' }"
        />
      </div>

      <div class="flex flex-col w-full justify-start items-start gap-1">
        <label for="register-email" class="block text-sm md:text-base font-medium dark:text-white"
          >Email</label
        >
        <VInput
          id="register-email"
          v-model="form.email"
          type="email"
          autocomplete="email"
          placeholder="Enter your email"
          required
          class="w-full"
          :ui="{ base: 'min-h-10 text-base rounded-lg' }"
        />
      </div>

      <div class="flex flex-col w-full justify-start items-start gap-1">
        <label
          for="register-password"
          class="block text-sm md:text-base font-medium dark:text-white"
          >Kata sandi</label
        >
        <VInput
          id="register-password"
          v-model="form.password"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="new-password"
          required
          placeholder="Enter your password"
          class="w-full"
          :ui="{ base: 'min-h-10 text-base rounded-lg', trailing: 'pe-1' }"
        >
          <template #trailing>
            <UButton
              color="neutral"
              variant="link"
              size="sm"
              :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
              :aria-pressed="showPassword"
              aria-controls="register-password"
              @click="showPassword = !showPassword"
            />
          </template>
        </VInput>
      </div>

      <div class="flex flex-col w-full justify-start items-start gap-1">
        <label
          for="register-password-confirmation"
          class="block text-sm md:text-base font-medium dark:text-white"
          >Konfirmasi kata sandi</label
        >
        <VInput
          id="register-password-confirmation"
          v-model="form.password_confirmation"
          :type="showPasswordConfirmation ? 'text' : 'password'"
          autocomplete="new-password"
          required
          placeholder="Confirm your password"
          class="w-full"
          :ui="{ base: 'min-h-10 text-base rounded-lg', trailing: 'pe-1' }"
        >
          <template #trailing>
            <UButton
              color="neutral"
              variant="link"
              size="sm"
              :icon="showPasswordConfirmation ? 'i-lucide-eye-off' : 'i-lucide-eye'"
              :aria-label="showPasswordConfirmation ? 'Hide password' : 'Show password'"
              :aria-pressed="showPasswordConfirmation"
              aria-controls="register-password-confirmation"
              @click="showPasswordConfirmation = !showPasswordConfirmation"
            />
          </template>
        </VInput>
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
        class="text-base mt-4"
      >
        Daftar
      </Button>
    </form>

    <USeparator label="Atau" class="my-4 text-stone-400" />

    <Button
      block
      color="neutral"
      variant="outline"
      size="lg"
      class="text-base w-full dark:text-stone-300"
      :disabled="submitting"
      @click="loginWithGoogle()"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.8em" viewBox="0 0 16 16">
        <!-- Icon from Material Icon Theme by Material Extensions - https://github.com/material-extensions/vscode-material-icon-theme/blob/main/LICENSE -->
        <g fill="none" fillRule="evenodd" clipRule="evenodd">
          <path
            fill="#f44336"
            d="M7.209 1.061c.725-.081 1.154-.081 1.933 0a6.57 6.57 0 0 1 3.65 1.82a100 100 0 0 0-1.986 1.93q-1.876-1.59-4.188-.734q-1.696.78-2.362 2.528a78 78 0 0 1-2.148-1.658a.26.26 0 0 0-.16-.027q1.683-3.245 5.26-3.86"
            opacity=".987"
          />
          <path
            fill="#ffc107"
            d="M1.946 4.92q.085-.013.161.027a78 78 0 0 0 2.148 1.658A7.6 7.6 0 0 0 4.04 7.99q.037.678.215 1.331L2 11.116Q.527 8.038 1.946 4.92"
            opacity=".997"
          />
          <path
            fill="#448aff"
            d="M12.685 13.29a26 26 0 0 0-2.202-1.74q1.15-.812 1.396-2.228H8.122V6.713q3.25-.027 6.497.055q.616 3.345-1.423 6.032a7 7 0 0 1-.51.49"
            opacity=".999"
          />
          <path
            fill="#43a047"
            d="M4.255 9.322q1.23 3.057 4.51 2.854a3.94 3.94 0 0 0 1.718-.626q1.148.812 2.202 1.74a6.62 6.62 0 0 1-4.027 1.684a6.4 6.4 0 0 1-1.02 0Q3.82 14.524 2 11.116z"
            opacity=".993"
          />
        </g>
      </svg>
      Daftar dengan Google
    </Button>

    <div class="mt-6 flex items-center justify-center gap-1">
      <p class="text-stone-600 dark:text-stone-400">Belum punya akun?</p>
      <NuxtLink
        to="/login"
        class="underline text-end font-medium text-primary/90 hover:text-primary/60 dark:hover:text-primary/60 dark:text-primary"
      >
        Masuk
      </NuxtLink>
    </div>
  </div>
</template>
