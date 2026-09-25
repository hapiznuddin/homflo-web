<template>
  <div>
    <p v-if="status === 'loading' || status === 'idle'">Memproses login…</p>
    <div v-else-if="status === 'authenticated' && user">
      <p>Masuk sebagai {{ user.name }} ({{ user.email }}).</p>
      <UButton class="mt-4 min-h-12 text-base" block @click="goDashboard()">
        Lanjut ke beranda
      </UButton>
      <UButton
        color="neutral"
        variant="outline"
        class="mt-3 min-h-12 text-base"
        block
        @click="onLogout()"
      >
        Logout
      </UButton>
    </div>
    <p v-else>
      {{ error ?? 'Login gagal. Silakan coba lagi.' }}
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { user, status, error, fetchMe, logout } = useAuth()

// Single read-only bootstrap request through the Nuxt server boundary.
// It never contacts Laravel /api/me directly from the browser.
onMounted(() => {
  fetchMe()
})

async function goDashboard(): Promise<void> {
  await navigateTo('/dashboard')
}

async function onLogout(): Promise<void> {
  await logout()
  await navigateTo('/')
}
</script>
