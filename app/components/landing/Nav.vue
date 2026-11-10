<script setup lang="ts">
import {
  btnOutline,
  btnPrimary,
  btnPrimarySmall,
  container,
  linkAction
} from '~/components/landing/ui'

const open = ref(false)

const links = [
  { label: 'Fitur', href: '#fitur' },
  { label: 'Cara kerja', href: '#cara-kerja' },
  { label: 'FAQ', href: '#faq' }
]

function close(): void {
  open.value = false
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    close()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-rule bg-background">
    <div
      :class="[
        container,
        'grid min-h-[62px] grid-cols-[1fr_auto] items-center gap-6 min-[900px]:min-h-[68px] min-[900px]:grid-cols-[1fr_auto_1fr]'
      ]"
    >
      <NuxtLink
        to="/"
        class="inline-flex shrink-0 items-center justify-self-start"
        aria-label="Homflo, beranda"
        @click="close"
      >
        <NuxtImg
          src="/img/homflo-light-horizontal.webp"
          alt="Homflo"
          width="100%"
          height="100%"
          class="h-auto w-32 dark:hidden min-[900px]:w-33"
        />
        <NuxtImg
          src="/img/homflo-dark-horizontal.webp"
          alt=""
          width="100%"
          height="100%"
          class="hidden h-auto w-32 dark:hidden min-[900px]:w-33"
          aria-hidden="true"
        />
      </NuxtLink>

      <nav
        class="hidden items-center gap-[clamp(16px,2.4vw,30px)] justify-self-center min-[900px]:flex"
        aria-label="Navigasi utama"
      >
        <a
          v-for="link in links"
          :key="link.href"
          :href="link.href"
          class="text-[0.9375rem] font-medium text-muted-foreground no-underline transition-colors duration-[160ms] hover:text-foreground focus-ring"
          >{{ link.label }}</a
        >
      </nav>

      <div class="hidden items-center gap-2.5 justify-self-end min-[900px]:flex">
        <LandingThemeToggle />
        <NuxtLink to="/login" :class="linkAction">Masuk</NuxtLink>
        <NuxtLink to="/register" :class="btnPrimarySmall">Daftar</NuxtLink>
      </div>

      <div class="flex items-center gap-2 justify-self-end min-[900px]:hidden">
        <LandingThemeToggle />
        <button
          type="button"
          class="inline-flex size-11 cursor-pointer items-center justify-center rounded-lg border border-border bg-transparent text-foreground focus-ring"
          :aria-expanded="open"
          aria-controls="landing-mobile-menu"
          :aria-label="open ? 'Tutup menu' : 'Buka menu'"
          @click="open = !open"
        >
          <UIcon :name="open ? 'i-lucide-x' : 'i-lucide-menu'" class="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>

    <Transition name="landing-menu">
      <div v-show="open" id="landing-mobile-menu" class="border-t border-rule bg-background">
        <nav :class="[container, 'flex flex-col gap-0.5 py-4 pb-6']" aria-label="Navigasi seluler">
          <a
            v-for="link in links"
            :key="link.href"
            :href="link.href"
            class="border-b border-rule py-3 text-base font-medium text-foreground no-underline"
            @click="close"
          >
            {{ link.label }}
          </a>
          <div class="mt-4 grid grid-cols-2 gap-2.5">
            <NuxtLink to="/login" :class="btnOutline" @click="close">Masuk</NuxtLink>
            <NuxtLink to="/register" :class="btnPrimary" @click="close">Daftar</NuxtLink>
          </div>
        </nav>
      </div>
    </Transition>
  </header>
</template>
