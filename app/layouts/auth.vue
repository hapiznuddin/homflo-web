<script setup lang="ts">
import LandingBackgroundRipple from '~/components/landingPage/HeroSections/BackgroundRipple.vue'
</script>

<template>
  <div class="relative isolate min-h-dvh w-full landing-auth-bg text-foreground">
    <!-- Auth shell: flat background + static Hero ripple grid. `interactive`
    is off so no click anywhere spawns ripple cells behind the form. -->
    <LandingBackgroundRipple :interactive="true" mask-class="auth-ripple-mask" />
    <main
      class="mx-auto flex min-h-dvh w-full flex-col justify-center px-4 md:max-w-2xl"
    >
      <slot />
    </main>
  </div>
</template>
