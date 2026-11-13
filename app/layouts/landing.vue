<script setup lang="ts">
import LandingNav from '~/components/landingPage/Nav.vue'
import LandingFooter from '~/components/landingPage/Footer.vue'

// Progressive enhancement: kelas ini hanya dipasang bila JavaScript berjalan,
// sehingga konten tetap terlihat tanpa JavaScript. `lp-hero` menahan entrance
// hero; skrip body-close melepasnya tepat sebelum frame berikutnya, jadi
// entrance mulai di frame pertama yang terlihat, bukan saat CSS dibaca.
useHead({
  script: [
    {
      innerHTML: `(function(){var d=document.documentElement;d.classList.add('lp-hero','lp-reveal');setTimeout(function(){d.classList.remove('lp-hero')},1500);setTimeout(function(){if(!window.__lpRevealReady)d.classList.remove('lp-reveal')},10000)})()`
    },
    {
      innerHTML: `(function(){var d=document.documentElement;function s(){d.classList.remove('lp-hero')}requestAnimationFrame(function(){requestAnimationFrame(s)})})()`,
      tagPosition: 'bodyClose'
    }
  ],
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
