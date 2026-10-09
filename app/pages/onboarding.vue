<script setup lang="ts">
definePageMeta({ layout: 'auth', middleware: 'auth' })

const auth = useAuth()
const { nuxtApi } = useLaravel()
const toast = useToast()

const form = reactive({ name: '' })
const submitting = ref(false)
const formError = ref<string | null>(null)

onMounted(async () => {
  const status = await auth.bootstrap()

  if (status === 'authenticated' && !auth.onboarding.value.required) {
    await navigateTo('/dashboard')
  }
})

async function onSubmit(): Promise<void> {
  submitting.value = true
  formError.value = null

  try {
    await nuxtApi('/households', { method: 'POST', body: { name: form.name } })
    await auth.refresh()
    toast.add({
      title: 'Rumah tangga dibuat',
      description: 'Selamat! Rumah tangga Anda siap digunakan.',
      color: 'success'
    })
    await navigateTo(auth.postAuthDestination())
  } catch (error: unknown) {
    toast.add({
      title: 'Rumah tangga gagal dibuat',
      description: readError(error, 'Gagal membuat rumah tangga.'),
      color: 'error'
    })
    // formError.value = readError(error, 'Gagal membuat rumah tangga.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex w-full flex-col items-center justify-center text-center">
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
        <h1 class="text-2xl font-bold dark:text-white">Buat rumah tangga</h1>
        <p class="mt-1 text-sm text-slate-600 dark:text-stone-400">
          Anda akan menjadi pemilik rumah tangga ini.
        </p>
      </div>
    </div>

    <form class="mt-6 flex flex-col gap-4 w-full" novalidate @submit.prevent="onSubmit">
      <div class="flex flex-col w-full justify-start items-start gap-1">
        <label for="onboarding-name" class="block text-sm md:text-base font-medium dark:text-white"
          >Nama rumah tangga</label
        >
        <UInput
          id="onboarding-name"
          v-model="form.name"
          type="text"
          autocomplete="off"
          placeholder="Contoh: Rumah Tangga Budi"
          required
        />
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
      >
        Buat
      </UButton>
    </form>
  </div>
</template>
