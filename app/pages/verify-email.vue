<script setup lang="ts">
definePageMeta({ layout: 'auth', middleware: 'auth' })

const auth = useAuth()
const route = useRoute()
const { nuxtApi } = useLaravel()
const { isEmailVerified } = auth
const toast = useToast()
import { extractRedirectQuery, safeRedirectPath } from '~/utils/redirect'

const submitted = ref(false)
const formError = ref<string | null>(null)
const submitting = ref(false)
const sent = ref(false)
const redirect = computed<string | null>(() => safeRedirectPath(route.query.redirect as string | null))

async function onResend(): Promise<void> {
  submitting.value = true
  formError.value = null
  sent.value = false

  try {
    await nuxtApi('/email/verification-notification', { method: 'POST' })
    sent.value = true
    toast.add({
      title: 'Tautan terkirim',
      description: 'Tautan verifikasi telah dikirim ke email Anda.',
      color: 'success'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Gagal mengirim tautan',
      description: readError(error, 'Gagal mengirim tautan. Coba lagi.'),
      color: 'error'
    })
  } finally {
    submitting.value = false
  }

  // After resend, apply redirect if present (for authenticated users)
  if (redirect.value !== null && auth.isEmailVerified.value) {
    const destination = redirect.value
    await navigateTo(destination)
  }
}
</script>

<template>
  <div class="flex w-full flex-col items-center justify-center text-center">
    <h1 class="text-2xl font-bold">Verifikasi email</h1>

    <p v-if="isEmailVerified" role="status" class="text-sm font-semibold text-green-800">
      Email Anda sudah terverifikasi.
    </p>
    <template v-else>
      <div class="flex w-full flex-col items-center justify-center text-center gap-2">
        <p class="text-sm text-stone-600 dark:dark:text-stone-400">
          Verifikasi email untuk mengaktifkan fitur rumah tangga.
        </p>
        <p v-if="sent" role="status" class="text-sm font-semibold text-green-800">
          Tautan verifikasi telah dikirim ke email Anda.
        </p>
        <p
          v-if="formError"
          role="alert"
          aria-live="assertive"
          class="text-sm font-semibold text-red-800"
        >
          {{ formError }}
        </p>
        <UButton
          block
          size="xl"
          :loading="submitting"
          :disabled="submitting"
          class="mt-4"
          loading-auto
          @click="onResend()"
        >
          Kirim tautan verifikasi
        </UButton>
        <template v-if="redirect.value !== null && isEmailVerified">
          <UButton
            block
            size="xl"
            class="mt-2"
            loading-auto
            @click="navigateTo(redirect.value!)"
          >
            Lanjutkan
          </UButton>
        </template>
      </div>
    </template>
  </div>
</template>