<template>
  <div>
    <h1 class="text-2xl font-bold">Atur ulang kata sandi</h1>
    <p class="mt-1 text-sm text-slate-600">Masukkan kata sandi baru Anda.</p>

    <form class="mt-6 flex flex-col gap-4" novalidate @submit.prevent="onSubmit">
      <div>
        <label for="reset-email" class="mb-1 block text-sm font-medium">Email</label>
        <UInput
          id="reset-email"
          v-model="form.email"
          type="email"
          autocomplete="email"
          required
          class="w-full"
          :ui="{ base: 'min-h-12 text-base' }"
        />
      </div>

      <div>
        <label for="reset-password" class="mb-1 block text-sm font-medium">Kata sandi baru</label>
        <UInput
          id="reset-password"
          v-model="form.password"
          type="password"
          autocomplete="new-password"
          required
          class="w-full"
          :ui="{ base: 'min-h-12 text-base' }"
        />
      </div>

      <div>
        <label for="reset-password-confirmation" class="mb-1 block text-sm font-medium"
          >Konfirmasi kata sandi baru</label
        >
        <UInput
          id="reset-password-confirmation"
          v-model="form.password_confirmation"
          type="password"
          autocomplete="new-password"
          required
          class="w-full"
          :ui="{ base: 'min-h-12 text-base' }"
        />
      </div>

      <p v-if="formError" role="alert" aria-live="assertive" class="text-sm text-red-600">
        {{ formError }}
      </p>
      <p v-if="done" role="status" class="text-sm text-green-700">
        Kata sandi berhasil diubah. Silakan masuk.
      </p>

      <UButton
        type="submit"
        block
        :loading="submitting"
        :disabled="submitting"
        class="min-h-12 text-base"
      >
        Ubah kata sandi
      </UButton>
    </form>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth', middleware: 'guest' })

const route = useRoute()
const { api } = useLaravel()

const form = reactive({
  email: typeof route.query.email === 'string' ? route.query.email : '',
  token: typeof route.query.token === 'string' ? route.query.token : '',
  password: '',
  password_confirmation: ''
})
const submitting = ref(false)
const formError = ref<string | null>(null)
const done = ref(false)

async function onSubmit(): Promise<void> {
  submitting.value = true
  formError.value = null
  done.value = false

  try {
    await api('/password/reset', { method: 'POST', body: { ...form } })
    done.value = true
  } catch (error: unknown) {
    formError.value = readError(error, 'Tautan tidak valid atau kedaluwarsa.')
  } finally {
    submitting.value = false
  }
}
</script>
