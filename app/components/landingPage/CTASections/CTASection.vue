<script setup lang="ts">
import MobileMockup from './MobileMockup.vue'
import { container } from '~/components/landingPage/ui'
</script>

<template>
  <section v-scroll-reveal class="py-12 lp-scroll-reveal">
    <div :class="container">
      <div
        id="cta-panel"
        class="relative overflow-hidden rounded-3xl border border-rule bg-primary px-[clamp(20px,4vw,56px)] py-[clamp(36px,5vw,64px)]"
      >
        <!-- Desktop: satu ponsel di tiap sisi, terpotong tepi panel -->
        <div class="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden="true">
          <div
            v-scroll-reveal="{ delay: 180 }"
            class="lp-cta-phone-left absolute -bottom-26 left-6 w-[clamp(180px,14vw,230px)]"
          >
            <MobileMockup screen="money" />
          </div>
          <div
            v-scroll-reveal="{ delay: 260 }"
            class="lp-cta-phone-right absolute right-6 -top-26 w-[clamp(180px,14vw,230px)]"
          >
            <MobileMockup screen="lists" />
          </div>
        </div>

        <div class="relative z-10 mx-auto flex max-w-120 flex-col items-center text-center">
          <p v-scroll-reveal class="lp-scroll-reveal-child text-stone-300 m-0 text-sm font-medium">
            Manajemen rumah tangga
          </p>
          <h2
            v-scroll-reveal="{ delay: 80 }"
            class="lp-scroll-reveal-child text-background m-0 mt-3 text-[clamp(1.875rem,3.6vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-balance"
          >
            Rumah teratur, keuangan terkelola.
          </h2>
          <p
            v-scroll-reveal="{ delay: 160 }"
            class="lp-scroll-reveal-child m-0 mt-4 max-w-[44ch] text-lede text-stone-200 text-pretty"
          >
            Kelola keuangan, kebutuhan rumah, dan kendaraan keluarga dalam satu tempat.
          </p>
          <div
            v-scroll-reveal="{ delay: 240 }"
            class="lp-scroll-reveal-child mt-7 flex w-full flex-col items-center justify-center gap-4 md:flex-row"
          >
            <NuxtLink to="/register"
              ><UButton
                size="xl"
                class="bg-stone-200 hover:bg-stone-300 text-base cursor-pointer lg:text-lg text-primary px-6 md:w-54 lg:w-full font-medium"
                >Mulai kelola sekarang</UButton
              ></NuxtLink
            >
            <NuxtLink to="/login"
              ><UButton
                variant="outline"
                size="xl"
                class="border-2 border-stone-200 hover:bg-stone-200/10 cursor-pointer text-base lg:text-lg md:w-54 lg:w-full text-stone-200 dark:text-primary px-6 font-medium"
                >Sudah punya akun</UButton
              ></NuxtLink
            >
          </div>
        </div>

        <!-- Mobile: satu ponsel utama, ponsel kedua terpotong di tepi panel -->
        <div class="relative mt-10 h-56 md:hidden" aria-hidden="true">
          <div
            v-scroll-reveal="{ delay: 160 }"
            class="lp-cta-phone-left absolute -left-10 top-2 w-[min(50%,240px)]"
          >
            <MobileMockup screen="money" />
          </div>
          <div
            v-scroll-reveal="{ delay: 240 }"
            class="lp-cta-phone-right absolute -right-10 top-2 w-[min(50%,200px)]"
          >
            <MobileMockup screen="lists" />
          </div>
        </div>

        <!-- Tablet: dua ponsel sejajar di bawah konten -->
        <div
          class="relative mt-10 h-56 hidden items-start justify-center gap-5 md:flex lg:hidden"
          aria-hidden="true"
        >
          <div
            v-scroll-reveal="{ delay: 160 }"
            class="lp-cta-phone-left absolute left-20 top-2 w-[clamp(170px,36vw,230px)]"
          >
            <MobileMockup screen="money" />
          </div>
          <div
            v-scroll-reveal="{ delay: 240 }"
            class="lp-cta-phone-right absolute right-20 top-2 w-[clamp(170px,36vw,230px)]"
          >
            <MobileMockup screen="lists" />
          </div>
        </div>

        <span class="sr-only">Ilustrasi tampilan aplikasi Homflo dengan data contoh.</span>
      </div>
    </div>
  </section>
</template>
