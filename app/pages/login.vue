<script setup lang="ts">
import VInput from '@/components/ui/VInput.vue'
import Button from '@/components/ui/VButton.vue'

definePageMeta({ layout: 'auth', middleware: 'guest' })

const route = useRoute()
const auth = useAuth()
const { csrf, origin } = useLaravel()
const { loginWithGoogle } = auth

const form = reactive({ email: '', password: '' })
const submitting = ref(false)
const formError = ref<string | null>(null)

const show = ref(false)

async function onSubmit(): Promise<void> {
  submitting.value = true
  formError.value = null

  try {
    const headers = await csrf()
    await $fetch(`${origin}/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json', ...headers },
      body: { email: form.email, password: form.password }
    })
    await auth.refresh()
    await navigateTo('/dashboard')
  } catch (error: unknown) {
    formError.value = readError(error, 'Email atau kata sandi salah.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center text-center">
    <div
      class="w-full max-w-sm md:max-w-xl lg:max-w-4xl rounded-2xl border border-slate-200 bg-white/30 backdrop-blur-sm p-6 shadow-md"
    >
      <h1 class="text-2xl font-bold">Masuk</h1>
      <p class="mt-1 text-sm text-slate-600">Kelola keuangan rumah tangga Anda.</p>

      <form class="mt-6 flex flex-col gap-4" novalidate @submit.prevent="onSubmit">
        <div class="flex flex-col w-full justify-start items-start gap-1">
          <label for="login-email" class="block text-sm font-medium">Email</label>
          <VInput
            id="login-email"
            v-model="form.email"
            trailing-icon="i-lucide-at-sign"
            placeholder="Enter your email"
            size="md"
            type="email"
            autocomplete="email"
            required
            class="w-full"
          />
        </div>

        <div class="flex flex-col w-full justify-start items-start gap-1">
          <label for="login-password" class="block text-sm font-medium">Password</label>
          <VInput
            id="login-password"
            v-model="form.password"
            :type="show ? 'text' : 'password'"
            autocomplete="current-password"
            required
            class="w-full"
            placeholder="Password"
            :ui="{ trailing: 'pe-1' }"
          >
            <template #trailing>
              <UButton
                color="neutral"
                variant="link"
                size="sm"
                :icon="show ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                :aria-label="show ? 'Hide password' : 'Show password'"
                :aria-pressed="show"
                aria-controls="login-password"
                @click="show = !show"
              />
            </template>
          </VInput>
        </div>

        <p v-if="formError" role="alert" aria-live="assertive" class="text-sm text-red-600">
          {{ formError }}
        </p>

        <NuxtLink
          to="/forgot-password"
          class="underline text-end text-sm font-medium hover:text-primary/80"
        >
          Lupa Password?
        </NuxtLink>
        <Button type="submit" block :loading="submitting" :disabled="submitting" class="text-base">
          Masuk
        </Button>
      </form>

      <Button
        block
        color="neutral"
        variant="outline"
        class="mt-3 text-base"
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
        Masuk dengan Google
      </Button>

      <div class="mt-4 flex items-center justify-center gap-1">
        <p>Belum punya akun?</p>
        <NuxtLink to="/register" class="underline text-end font-medium hover:text-primary/80">
          Daftar
        </NuxtLink>
      </div>

      <p v-if="route.query.offline" role="status" class="mt-4 text-sm text-amber-700">
        Tidak dapat terhubung ke server. Anda sedang offline.
      </p>
    </div>
  </div>
</template>

<style>
/* Hide the password reveal button in Edge */
::-ms-reveal {
  display: none;
}
</style>
