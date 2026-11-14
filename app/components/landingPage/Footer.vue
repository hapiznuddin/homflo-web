<script setup lang="ts">
import { container } from '~/components/landingPage/ui'
</script>

<template>
  <footer v-scroll-reveal class="overflow-hidden border-t border-rule lp-scroll-reveal">
    <div :class="container">
      <div
        class="grid grid-cols-2 gap-9 pt-[clamp(40px,5vw,64px)] pb-6 sm:grid-cols-3 lg:grid-cols-5 lg:gap-0"
      >
        <div class="min-w-0 col-span-2 md:col-span-3 lg:col-span-2 lg:pe-10">
          <NuxtLink to="/" class="inline-flex shrink-0 items-center" aria-label="Homflo, beranda">
            <NuxtImg
              src="/img/homflo-light-horizontal.webp"
              alt="Homflo"
              width="100%"
              height="100%"
              class="h-auto w-32 dark:hidden md:w-48"
            />
            <NuxtImg
              src="/img/homflo-dark-horizontal.webp"
              alt=""
              width="100%"
              height="100%"
              class="hidden h-auto w-32 dark:block md:w-48"
              aria-hidden="true"
            />
          </NuxtLink>
          <p
            class="mt-3.5 mb-0 max-w-[34ch] text-sm lg:text-base leading-[1.55] text-muted-foreground text-pretty"
          >
            Aplikasi rumah tangga untuk mencatat uang, tagihan, aset, kendaraan, dan belanja.
          </p>
        </div>

        <div class="min-w-0 lg:border-s lg:border-rule lg:px-8">
          <p class="m-0 mb-3 text-base font-medium leading-[1.4] text-foreground">Produk</p>
          <ul class="m-0 flex list-none flex-col gap-2.5 p-0">
            <li>
              <a
                href="#fitur"
                class="text-base text-muted-foreground no-underline transition-colors duration-160 hover:text-primary focus-ring"
                >Fitur</a
              >
            </li>
            <li>
              <a
                href="#cara-kerja"
                class="text-base text-muted-foreground no-underline transition-colors duration-160 hover:text-primary focus-ring"
                >Cara kerja</a
              >
            </li>
            <li>
              <a
                href="#faq"
                class="text-base text-muted-foreground no-underline transition-colors duration-160 hover:text-primary focus-ring"
                >FAQ</a
              >
            </li>
          </ul>
        </div>

        <div class="min-w-0 lg:border-s lg:border-rule lg:px-8">
          <p class="m-0 mb-3 text-base font-medium leading-[1.4] text-foreground">Area</p>
          <ul class="m-0 flex list-none flex-col gap-2.5 p-0">
            <li>
              <a
                href="#uang"
                class="text-base text-muted-foreground no-underline transition-colors duration-160 hover:text-primary focus-ring"
                >Uang</a
              >
            </li>
            <li>
              <a
                href="#rumah"
                class="text-base text-muted-foreground no-underline transition-colors duration-160 hover:text-primary focus-ring"
                >Rumah</a
              >
            </li>
            <li>
              <a
                href="#kendaraan"
                class="text-base text-muted-foreground no-underline transition-colors duration-160 hover:text-primary focus-ring"
                >Kendaraan</a
              >
            </li>
            <li>
              <a
                href="#daftar"
                class="text-base text-muted-foreground no-underline transition-colors duration-160 hover:text-primary focus-ring"
                >Daftar</a
              >
            </li>
          </ul>
        </div>

        <div class="min-w-0 lg:border-s lg:border-rule lg:px-8">
          <p class="m-0 mb-3 text-base font-medium leading-[1.4] text-foreground">Akun</p>
          <ul class="m-0 flex list-none flex-col gap-2.5 p-0">
            <li>
              <NuxtLink
                to="/login"
                class="text-base text-muted-foreground no-underline transition-colors duration-160 hover:text-primary focus-ring"
                >Masuk</NuxtLink
              >
            </li>
            <li>
              <NuxtLink
                to="/register"
                class="text-base text-muted-foreground no-underline transition-colors duration-160 hover:text-primary focus-ring"
                >Daftar</NuxtLink
              >
            </li>
          </ul>
        </div>
      </div>

      <div class="relative">
        <NuxtImg
          src="/img/homflo-light-horizontal.webp"
          alt="Homflo"
          width="100%"
          height="100%"
          class="h-auto w-full grayscale opacity-10 dark:opacity-30"
        />
        <div
          aria-hidden="true"
          class="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-1/4 bg-linear-to-t from-background via-background/90 to-transparent"
        />
      </div>

      <div
        class="flex flex-wrap items-center justify-between gap-3 border-t border-rule py-5 text-xs text-muted-foreground"
      >
        <span>© 2026 Homflo</span>
        <span>Dibuat untuk rumah tangga tercinta ❤️.</span>
      </div>
    </div>
  </footer>
</template>
