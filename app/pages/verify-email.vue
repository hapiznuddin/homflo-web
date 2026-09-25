<template>
  <div>
    <h1 class="text-2xl font-bold">Verifikasi email</h1>

    <p v-if="isEmailVerified" role="status" class="mt-2 text-sm text-green-700">
      Email Anda sudah terverifikasi.
    </p>
    <template v-else>
      <p class="mt-2 text-sm text-slate-600">
        Verifikasi email untuk mengaktifkan fitur rumah tangga.
      </p>
      <p v-if="sent" role="status" class="mt-2 text-sm text-green-700">
        Tautan verifikasi telah dikirim ke email Anda.
      </p>
      <p v-if="formError" role="alert" aria-live="assertive" class="mt-2 text-sm text-red-600">
        {{ formError }}
      </p>
      <UButton
        block
        :loading="submitting"
        :disabled="submitting"
        class="mt-4 min-h-12 text-base"
        @click="onResend()"
      >
        Kirim tautan verifikasi
      </UButton>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth', middleware: 'auth' })

const auth = useAuth()
const { api } = useLaravel()
const { isEmailVerified } = auth

const submitting = ref(false)
const formError = ref<string | null>(null)
const sent = ref(false)

async function onResend(): Promise<void> {
  submitting.value = true
  formError.value = null
  sent.value = false

  try {
    await api('/email/verification-notification', { method: 'POST' })
    sent.value = true
  } catch (error: unknown) {
    formError.value = readError(error, 'Gagal mengirim tautan. Coba lagi.')
  } finally {
    submitting.value = false
  }
}
</script>
