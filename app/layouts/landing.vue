<script setup lang="ts">
import LandingNav from '~/components/landingPage/Nav.vue'
import LandingFooter from '~/components/landingPage/Footer.vue'
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
  <LandingNav />
    <slot />
  <LandingFooter />
  </div>
</template>
