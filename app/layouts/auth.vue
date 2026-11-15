<script setup lang="ts">
import LandingBackgroundRipple from '~/components/landingPage/HeroSections/BackgroundRipple.vue'
</script>

<template>
  <div class="landing-hero-bg relative isolate min-h-dvh w-full text-foreground">
    <!-- Auth shell: brand wash + Hero ripple behind a centred column.
        The ripple is pointer-events-none at -z-10 inside this isolated
        stacking context, so it never blocks the form. -->
    <LandingBackgroundRipple />
    <main
      class="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 sm:px-6 md:max-w-2xl"
    >
      <slot />
    </main>
  </div>
</template>
