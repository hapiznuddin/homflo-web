<template>
  <div>
    <h1 class="text-2xl font-bold">Buat rumah tangga</h1>
    <p class="mt-1 text-sm text-slate-600">Anda akan menjadi pemilik rumah tangga ini.</p>

    <form class="mt-6 flex flex-col gap-4" novalidate @submit.prevent="onSubmit">
      <div>
        <label for="onboarding-name" class="mb-1 block text-sm font-medium"
          >Nama rumah tangga</label
        >
        <UInput
          id="onboarding-name"
          v-model="form.name"
          type="text"
          autocomplete="off"
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
        Buat
      </UButton>
    </form>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth', middleware: 'auth' })

const auth = useAuth()
const { api } = useLaravel()

const form = reactive({ name: '' })
const submitting = ref(false)
const formError = ref<string | null>(null)

async function onSubmit(): Promise<void> {
  submitting.value = true
  formError.value = null

  try {
    await api('/households', { method: 'POST', body: { name: form.name } })
    await auth.refresh()
    await navigateTo('/dashboard')
  } catch (error: unknown) {
    formError.value = readError(error, 'Gagal membuat rumah tangga.')
  } finally {
    submitting.value = false
  }
}
</script>
