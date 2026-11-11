<script setup lang="ts">
import { container } from '~/components/landing/ui'
</script>

<template>
  <footer v-scroll-reveal class="overflow-hidden border-t border-rule lp-scroll-reveal">
    <div :class="container">
      <div
        class="grid grid-cols-1 gap-9 pt-[clamp(40px,5vw,64px)] pb-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.55fr)_repeat(3,minmax(0,1fr))] lg:gap-0"
      >
        <div class="min-w-0 sm:col-span-2 lg:col-span-1 lg:pe-10">
          <NuxtLink to="/" class="inline-flex shrink-0 items-center" aria-label="Homflo, beranda">
            <NuxtImg
              src="/img/homflo-light-horizontal.webp"
              alt="Homflo"
              width="100%"
              height="100%"
              class="h-auto w-[116px] dark:hidden min-[900px]:w-[132px]"
            />
            <NuxtImg
              src="/img/homflo-dark-horizontal.webp"
              alt=""
              width="100%"
              height="100%"
              class="hidden h-auto w-[116px] dark:block min-[900px]:w-[132px]"
              aria-hidden="true"
            />
          </NuxtLink>
          <p class="mt-3.5 mb-0 max-w-[34ch] text-sm leading-[1.55] text-muted-foreground text-pretty">
            Aplikasi rumah tangga untuk mencatat uang, tagihan, aset, kendaraan, dan belanja.
          </p>
        </div>

        <div class="min-w-0 lg:border-s lg:border-rule lg:px-8">
          <p class="m-0 mb-3 text-sm font-medium leading-[1.4] text-foreground">Produk</p>
          <ul class="m-0 flex list-none flex-col gap-2.5 p-0">
            <li>
              <a
                href="#fitur"
                class="text-sm text-muted-foreground no-underline transition-colors duration-160 hover:text-primary focus-ring"
                >Fitur</a
              >
            </li>
            <li>
              <a
                href="#cara-kerja"
                class="text-sm text-muted-foreground no-underline transition-colors duration-160 hover:text-primary focus-ring"
                >Cara kerja</a
              >
            </li>
            <li>
              <a
                href="#faq"
                class="text-sm text-muted-foreground no-underline transition-colors duration-160 hover:text-primary focus-ring"
                >FAQ</a
              >
            </li>
          </ul>
        </div>

        <div class="min-w-0 lg:border-s lg:border-rule lg:px-8">
          <p class="m-0 mb-3 text-sm font-medium leading-[1.4] text-foreground">Area</p>
          <ul class="m-0 flex list-none flex-col gap-2.5 p-0">
            <li>
              <a
                href="#uang"
                class="text-sm text-muted-foreground no-underline transition-colors duration-160 hover:text-primary focus-ring"
                >Uang</a
              >
            </li>
            <li>
              <a
                href="#rumah"
                class="text-sm text-muted-foreground no-underline transition-colors duration-160 hover:text-primary focus-ring"
                >Rumah</a
              >
            </li>
            <li>
              <a
                href="#kendaraan"
                class="text-sm text-muted-foreground no-underline transition-colors duration-160 hover:text-primary focus-ring"
                >Kendaraan</a
              >
            </li>
            <li>
              <a
                href="#daftar"
                class="text-sm text-muted-foreground no-underline transition-colors duration-160 hover:text-primary focus-ring"
                >Daftar</a
              >
            </li>
          </ul>
        </div>

        <div class="min-w-0 lg:border-s lg:border-rule lg:px-8">
          <p class="m-0 mb-3 text-sm font-medium leading-[1.4] text-foreground">Akun</p>
          <ul class="m-0 flex list-none flex-col gap-2.5 p-0">
            <li>
              <NuxtLink
                to="/login"
                class="text-sm text-muted-foreground no-underline transition-colors duration-160 hover:text-primary focus-ring"
                >Masuk</NuxtLink
              >
            </li>
            <li>
              <NuxtLink
                to="/register"
                class="text-sm text-muted-foreground no-underline transition-colors duration-160 hover:text-primary focus-ring"
                >Daftar</NuxtLink
              >
            </li>
          </ul>
        </div>
      </div>

      <p
        aria-hidden="true"
        class="-mb-px select-none text-[clamp(4.5rem,18vw,15rem)] font-semibold leading-[0.78] tracking-[-0.055em] text-foreground/[0.07]"
      >
        homflo
      </p>

      <div
        class="flex flex-wrap items-center justify-between gap-3 border-t border-rule py-5 text-xs text-muted-foreground"
      >
        <span>© 2026 Homflo</span>
        <span>Dibuat untuk rumah tangga.</span>
      </div>
    </div>
  </footer>
</template>
