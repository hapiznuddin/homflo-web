<template>
  <div class="flex flex-col gap-6">
    <section aria-label="Profil">
      <h1 class="text-xl font-bold">Akun</h1>
      <dl class="mt-3 rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <div class="flex justify-between gap-2 py-1">
          <dt class="text-slate-600">Nama</dt>
          <dd class="font-medium">
            {{ user?.name }}
          </dd>
        </div>
        <div class="flex justify-between gap-2 py-1">
          <dt class="text-slate-600">Email</dt>
          <dd class="font-medium">
            {{ user?.email }}
          </dd>
        </div>
        <div class="flex justify-between gap-2 py-1">
          <dt class="text-slate-600">Email terverifikasi</dt>
          <dd class="font-medium">
            {{ isEmailVerified ? 'Ya' : 'Belum' }}
          </dd>
        </div>
      </dl>
      <NuxtLink
        v-if="!isEmailVerified"
        to="/verify-email"
        class="mt-2 inline-block text-sm underline"
      >
        Verifikasi email
      </NuxtLink>
    </section>

    <section aria-label="Ubah kata sandi">
      <h2 class="text-lg font-bold">Ubah kata sandi</h2>
      <form class="mt-3 flex flex-col gap-4" novalidate @submit.prevent="onSubmit">
        <div>
          <label for="account-current-password" class="mb-1 block text-sm font-medium"
            >Kata sandi saat ini</label
          >
          <UInput
            id="account-current-password"
            v-model="form.current_password"
            type="password"
            autocomplete="current-password"
            required
            class="w-full"
            :ui="{ base: 'min-h-12 text-base' }"
          />
        </div>
        <div>
          <label for="account-password" class="mb-1 block text-sm font-medium"
            >Kata sandi baru</label
          >
          <UInput
            id="account-password"
            v-model="form.password"
            type="password"
            autocomplete="new-password"
            required
            class="w-full"
            :ui="{ base: 'min-h-12 text-base' }"
          />
        </div>
        <div>
          <label for="account-password-confirmation" class="mb-1 block text-sm font-medium"
            >Konfirmasi kata sandi baru</label
          >
          <UInput
            id="account-password-confirmation"
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
        <p v-if="done" role="status" class="text-sm text-green-700">Kata sandi berhasil diubah.</p>

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
    </section>

    <UButton block color="neutral" variant="outline" class="min-h-12 text-base" @click="onLogout()">
      Keluar
    </UButton>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const auth = useAuth()
const { api } = useLaravel()
const { user, isEmailVerified, logout } = auth

const form = reactive({ current_password: '', password: '', password_confirmation: '' })
const submitting = ref(false)
const formError = ref<string | null>(null)
const done = ref(false)

async function onSubmit(): Promise<void> {
  submitting.value = true
  formError.value = null
  done.value = false

  try {
    await api('/password/change', { method: 'POST', body: { ...form } })
    done.value = true
    form.current_password = ''
    form.password = ''
    form.password_confirmation = ''
  } catch (error: unknown) {
    formError.value = readError(error, 'Gagal mengubah kata sandi.')
  } finally {
    submitting.value = false
  }
}

async function onLogout(): Promise<void> {
  await logout()
  await navigateTo('/login')
}
</script>
