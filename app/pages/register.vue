<template>
  <div>
    <h1 class="text-2xl font-bold">Daftar</h1>
    <p class="mt-1 text-sm text-slate-600">Buat akun Homflo baru.</p>

    <form class="mt-6 flex flex-col gap-4" novalidate @submit.prevent="onSubmit">
      <div>
        <label for="register-username" class="mb-1 block text-sm font-medium">Nama pengguna</label>
        <UInput
          id="register-username"
          v-model="form.username"
          type="text"
          autocomplete="username"
          required
          class="w-full"
          :ui="{ base: 'min-h-12 text-base' }"
        />
      </div>

      <div>
        <label for="register-name" class="mb-1 block text-sm font-medium">Nama lengkap</label>
        <UInput
          id="register-name"
          v-model="form.name"
          type="text"
          autocomplete="name"
          required
          class="w-full"
          :ui="{ base: 'min-h-12 text-base' }"
        />
      </div>

      <div>
        <label for="register-email" class="mb-1 block text-sm font-medium">Email</label>
        <UInput
          id="register-email"
          v-model="form.email"
          type="email"
          autocomplete="email"
          required
          class="w-full"
          :ui="{ base: 'min-h-12 text-base' }"
        />
      </div>

      <div>
        <label for="register-password" class="mb-1 block text-sm font-medium">Kata sandi</label>
        <VInput
          id="register-password"
          v-model="form.password"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="new-password"
          required
          class="w-full"
          :ui="{ base: 'min-h-12 text-base', trailing: 'pe-1' }"
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

      <div>
        <label for="register-password-confirmation" class="mb-1 block text-sm font-medium"
          >Konfirmasi kata sandi</label
        >
        <VInput
          id="register-password-confirmation"
          v-model="form.password_confirmation"
          :type="showPasswordConfirmation ? 'text' : 'password'"
          autocomplete="new-password"
          required
          class="w-full"
          :ui="{ base: 'min-h-12 text-base', trailing: 'pe-1' }"
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

      <UButton
        type="submit"
        block
        :loading="submitting"
        :disabled="submitting"
        class="min-h-12 text-base"
      >
        Daftar
      </UButton>
    </form>

    <p class="mt-4 text-center text-sm">
      Sudah punya akun?
      <NuxtLink to="/login" class="underline"> Masuk </NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import VInput from '@/components/ui/VInput.vue'

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
