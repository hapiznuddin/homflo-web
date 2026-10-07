<script setup lang="ts">
// This route exists only because Laravel needs a fixed frontend target
// after OAuth. The `oauth-callback` middleware redirects away before
// anything below renders, so this page has no user-facing UI.
definePageMeta({ layout: 'auth', middleware: 'oauth-callback' })
</script>

<template>
  <div />
</template>
