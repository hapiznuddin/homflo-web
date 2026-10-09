<script setup lang="ts">
definePageMeta({ layout: 'auth', middleware: 'guest' })

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const { startGoogleOAuth, oauthRedirecting, oauthProcessing } = auth
const { csrf, origin } = useLaravel()
const toast = useToast()

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
    toast.add({
      title: 'Pendaftaran berhasil',
      description: 'Selamat datang di Homflo!',
      color: 'success'
    })
    await navigateTo(auth.postAuthDestination())
  } catch (error: unknown) {
    toast.add({
      title: 'Pendaftaran gagal',
      description: readError(error, 'Pendaftaran gagal. Periksa kembali isian Anda.'),
      color: 'error'
    })
    // formError.value = readError(error, 'Pendaftaran gagal. Periksa kembali isian Anda.')
  } finally {
    submitting.value = false
  }
}

// The query flag renders the processing modal synchronously on first
// paint (including SSR), so feedback is instant instead of waiting for
// the mounted bootstrap below.
const isOAuthReturn = computed(() => route.query.oauth === 'processing')

// OAuth return path: the callback route hands off here with
// ?oauth=processing. Resolve the shared bootstrap, then show an explicit
// success/failure result inside the modal before leaving the page.
const oauthResult = ref<{ ok: boolean; message: string } | null>(null)

function oauthModalVisible(): boolean {
  return oauthProcessing.value || oauthResult.value !== null || isOAuthReturn.value
}

onMounted(async () => {
  if (route.query.oauth !== 'processing') {
    return
  }

  oauthProcessing.value = true
  oauthResult.value = null

  try {
    await router.replace({ query: {} })

    const result = await auth.bootstrap()

    if (result === 'authenticated') {
      oauthResult.value = { ok: true, message: 'Pendaftaran berhasil! Mengalihkan…' }
      await new Promise((resolve) => setTimeout(resolve, 900))
      await navigateTo(auth.postAuthDestination())
    } else if (result === 'error') {
      oauthResult.value = {
        ok: false,
        message: 'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.'
      }
    } else {
      oauthResult.value = { ok: false, message: 'Pendaftaran gagal. Silakan coba lagi.' }
    }
  } finally {
    oauthProcessing.value = false
  }
})

function dismissOAuthResult(): void {
  oauthResult.value = null
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
        <UInput
          id="register-username"
          v-model="form.username"
          type="text"
          autocomplete="username"
          placeholder="Masukkan username Anda"
          required
        />
      </div>

      <div class="flex flex-col w-full justify-start items-start gap-1">
        <label for="register-name" class="block text-sm md:text-base font-medium dark:text-white"
          >Nama lengkap</label
        >
        <UInput
          id="register-name"
          v-model="form.name"
          type="text"
          autocomplete="name"
          placeholder="Masukkan nama lengkap Anda"
          required
        />
      </div>

      <div class="flex flex-col w-full justify-start items-start gap-1">
        <label for="register-email" class="block text-sm md:text-base font-medium dark:text-white"
          >Email</label
        >
        <UInput
          id="register-email"
          v-model="form.email"
          trailing-icon="i-lucide-at-sign"
          type="email"
          autocomplete="email"
          placeholder="Masukkan email Anda"
          required
        />
      </div>

      <div class="flex flex-col w-full justify-start items-start gap-1">
        <label
          for="register-password"
          class="block text-sm md:text-base font-medium dark:text-white"
          >Kata sandi</label
        >
        <UInput
          id="register-password"
          v-model="form.password"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="new-password"
          required
          placeholder="Masukkan password Anda"
          :ui="{ trailing: 'pe-1' }"
        >
          <template #trailing>
            <UButton
              variant="link"
              size="sm"
              :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
              :aria-pressed="showPassword"
              aria-controls="register-password"
              @click="showPassword = !showPassword"
            />
          </template>
        </UInput>
      </div>

      <div class="flex flex-col w-full justify-start items-start gap-1">
        <label
          for="register-password-confirmation"
          class="block text-sm md:text-base font-medium dark:text-white"
          >Konfirmasi kata sandi</label
        >
        <UInput
          id="register-password-confirmation"
          v-model="form.password_confirmation"
          :type="showPasswordConfirmation ? 'text' : 'password'"
          autocomplete="new-password"
          required
          placeholder="Konfirmasi password Anda"
          :ui="{ trailing: 'pe-1' }"
        >
          <template #trailing>
            <UButton
              variant="link"
              size="sm"
              :icon="showPasswordConfirmation ? 'i-lucide-eye-off' : 'i-lucide-eye'"
              :aria-label="showPasswordConfirmation ? 'Hide password' : 'Show password'"
              :aria-pressed="showPasswordConfirmation"
              aria-controls="register-password-confirmation"
              @click="showPasswordConfirmation = !showPasswordConfirmation"
            />
          </template>
        </UInput>
      </div>

      <p v-if="formError" role="alert" aria-live="assertive" class="text-sm text-red-600">
        {{ formError }}
      </p>

      <UButton
        type="submit"
        block
        loading-auto
        size="xl"
        :loading="submitting"
        :disabled="submitting"
        class="mt-4"
      >
        Daftar
      </UButton>
    </form>

    <USeparator label="Atau" class="my-4 text-stone-400" />

    <UButton
      block
      variant="outline"
      size="xl"
      :loading="oauthRedirecting"
      :disabled="submitting || oauthRedirecting"
      @click="startGoogleOAuth('register')"
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
    </UButton>

    <div class="mt-6 flex items-center justify-center gap-1">
      <p class="text-stone-600 dark:text-stone-400">Belum punya akun?</p>
      <UButton variant="link" size="xl" as-child>
        <NuxtLink to="/login"> Masuk </NuxtLink>
      </UButton>
    </div>

    <div
      v-if="oauthModalVisible()"
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      aria-label="Status pendaftaran"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
    >
      <div
        class="flex w-full max-w-xs flex-col items-center gap-3 rounded-2xl bg-white px-6 py-8 text-center shadow-xl dark:bg-stone-900"
      >
        <template v-if="oauthResult">
          <span
            v-if="oauthResult.ok"
            class="flex size-8 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
            aria-hidden="true"
            >✓</span
          >
          <span
            v-else
            class="flex size-8 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
            aria-hidden="true"
            >!</span
          >
          <p class="text-base font-medium dark:text-white">{{ oauthResult.message }}</p>
          <button
            v-if="!oauthResult.ok"
            type="button"
            class="mt-1 min-h-11 rounded-lg px-4 text-sm font-medium underline"
            @click="dismissOAuthResult()"
          >
            Tutup
          </button>
        </template>
        <template v-else>
          <span
            class="size-8 shrink-0 animate-spin rounded-full border-[3px] border-primary/30 border-t-primary"
            aria-hidden="true"
          />
          <p class="text-base font-medium dark:text-white">Memproses pendaftaran…</p>
        </template>
      </div>
    </div>
  </div>
</template>
