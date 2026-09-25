<template>
  <div>
    <p v-if="status === 'loading'">
      Memproses login…
    </p>
    <div v-else-if="status === 'authenticated' && user">
      <p>
        Masuk sebagai {{ user.name }} ({{ user.email }}).
      </p>
      <button
        type="button"
        @click="onLogout"
      >
        Logout
      </button>
    </div>
    <p v-else>
      {{ error ?? 'Login gagal. Silakan coba lagi.' }}
    </p>
  </div>
</template>

<script setup lang="ts">
const { user, pending, error, fetchMe, logout } = useAuth()

// Explicit tri-state: loading until GET /api/auth/me settles. The error
// branch renders only after the bootstrap request has finished.
const status = computed(() => {
  if (pending.value) {
    return 'loading'
  }

  return user.value ? 'authenticated' : 'error'
})

// Single read-only bootstrap request through the Nuxt server boundary.
// It never contacts Laravel /api/me directly from the browser.
onMounted(() => {
  fetchMe()
})

async function onLogout(): Promise<void> {
  await logout()
  await navigateTo('/')
}
</script>
