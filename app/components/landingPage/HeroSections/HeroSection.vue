<script setup lang="ts">
import LandingBackgroundRipple from './BackgroundRipple.vue'
import LandingHeroDashboard from './HeroDashboard.vue'
import { container } from '~/components/landingPage/ui'
</script>

<template>
  <section
    id="ringkasan"
    class="landing-hero-bg relative isolate -mt-20 scroll-mt-24 pb-[clamp(32px,5vw,56px)] pt-[clamp(56px,8vw,104px)] md:-mt-23"
  >
    <LandingBackgroundRipple />
    <div class="h-20 md:h-23" aria-hidden="true" />
    <div :class="[container, 'flex flex-col items-center text-center mb-8']">
      <h1
        class="lp-hero-item m-0 min-w-0 max-w-[16ch] animate-in text-display font-semibold wrap-break-word text-balance fill-mode-both slide-in-from-bottom-5 duration-600 ease-out-expo lg:max-w-[18ch]"
      >
        Satu tempat untuk semua urusan rumah tangga Anda.
      </h1>
      <p
        class="lp-hero-item mt-5 mb-0 max-w-[54ch] animate-in text-hero-sub text-muted-foreground text-pretty fill-mode-both slide-in-from-bottom-5 delay-75 duration-600 ease-out-expo"
      >
        Uang, tagihan, rumah, kendaraan, daftar belanja — semuanya tercatat di satu tempat bersama
        keluarga. Tanpa menghubungkan rekening bank.
      </p>
      <div
        class="lp-hero-item mt-8 flex w-full max-w-xl justify-center items-center animate-in flex-col gap-2.5 fill-mode-both slide-in-from-bottom-5 delay-150 duration-600 ease-out-expo min-[480px]:flex-row min-[480px]:justify-center"
      >
        <NuxtLink to="/register">
          <UButton size="xl" class="min-h-12 px-6 font-semibold"
            >Mulai Gratis
            <UIcon name="i-lucide-arrow-right" class="size-4" aria-hidden="true" />
          </UButton>
        </NuxtLink>
        <a href="#fitur">
          <UButton variant="outline" size="xl" class="min-h-12 px-6 font-semibold"
            >Lihat cara kerja
            <UIcon name="i-lucide-arrow-down" class="size-4" aria-hidden="true" />
          </UButton>
        </a>
      </div>
    </div>

    <div
      class="lp-hero-item mx-auto mt-6 w-[calc(100%-40px)] max-w-6xl animate-in delay-250 duration-800 ease-out-expo fill-mode-both slide-in-from-bottom-10 zoom-in-95 perspective-[1400px] lg:mt-0"
    >
      <LandingHeroDashboard />
    </div>
  </section>
</template>
