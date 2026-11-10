<script setup lang="ts">
// Tanpa JavaScript, animasi scroll tidak bisa berjalan. Paksa konten
// reveal tetap terlihat agar tidak ada section yang tersembunyi.
useHead({
  noscript: [
    {
      innerHTML:
        '<style>.lp-scroll-reveal,.lp-scroll-reveal-child{opacity:1!important;transform:none!important}</style>'
    }
  ]
})
</script>

<template>
  <div>
    <slot />
  </div>
</template>
