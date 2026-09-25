<template>
  <div>
    <h1 class="text-2xl font-bold">Lupa kata sandi</h1>
    <p class="mt-1 text-sm text-slate-600">
      Masukkan email Anda. Jika terdaftar, tautan pemulihan akan dikirim.
    </p>

    <form class="mt-6 flex flex-col gap-4" novalidate @submit.prevent="onSubmit">
      <div>
        <label for="forgot-email" class="mb-1 block text-sm font-medium">Email</label>
        <UInput
          id="forgot-email"
          v-model="form.email"
          type="email"
          autocomplete="email"
          required
          class="w-full"
          :ui="{ base: 'min-h-12 text-base' }"
        />
      </div>

      <p v-if="formError" role="alert" aria-live="assertive" class="text-sm text-red-600">
        {{ formError }}
      </p>
      <p v-if="sent" role="status" class="text-sm text-green-700">
        Jika email terdaftar, tautan pemulihan telah dikirim.
      </p>

      <UButton
        type="submit"
        block
        :loading="submitting"
        :disabled="submitting"
        class="min-h-12 text-base"
      >
        Kirim tautan pemulihan
      </UButton>
    </form>

    <p class="mt-4 text-center text-sm">
      <NuxtLink to="/login" class="underline"> Kembali masuk </NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
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
