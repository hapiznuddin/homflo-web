<template>
  <div>
    <h1 class="text-2xl font-bold">Masuk</h1>
    <p class="mt-1 text-sm text-slate-600">Kelola keuangan rumah tangga Anda.</p>

    <form class="mt-6 flex flex-col gap-4" novalidate @submit.prevent="onSubmit">
      <div>
        <label for="login-email" class="mb-1 block text-sm font-medium">Email</label>
        <UInput
          id="login-email"
          v-model="form.email"
          type="email"
          autocomplete="email"
          required
          class="w-full"
          :ui="{ base: 'min-h-12 text-base' }"
        />
      </div>

      <div>
        <label for="login-password" class="mb-1 block text-sm font-medium">Kata sandi</label>
        <UInput
          id="login-password"
          v-model="form.password"
          type="password"
          autocomplete="current-password"
          required
          class="w-full"
          :ui="{ base: 'min-h-12 text-base' }"
        />
      </div>

      <p v-if="formError" role="alert" aria-live="assertive" class="text-sm text-red-600">
        {{ formError }}
      </p>

      <UButton
        type="submit"
        block
        :loading="submitting"
        :disabled="submitting"
        class="min-h-12 text-base"
      >
        Masuk
      </UButton>
    </form>

    <UButton
      block
      color="neutral"
      variant="outline"
      class="mt-3 min-h-12 text-base"
      :disabled="submitting"
      @click="loginWithGoogle()"
    >
      Masuk dengan Google
    </UButton>

    <div class="mt-4 flex items-center justify-between text-sm">
      <NuxtLink to="/forgot-password" class="underline"> Lupa kata sandi? </NuxtLink>
      <NuxtLink to="/register" class="underline"> Daftar </NuxtLink>
    </div>

    <p v-if="route.query.offline" role="status" class="mt-4 text-sm text-amber-700">
      Tidak dapat terhubung ke server. Anda sedang offline.
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth', middleware: 'guest' })

const route = useRoute()
const auth = useAuth()
const { csrf, origin } = useLaravel()
const { loginWithGoogle } = auth

const form = reactive({ email: '', password: '' })
const submitting = ref(false)
const formError = ref<string | null>(null)

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
