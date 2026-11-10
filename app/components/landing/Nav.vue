<script setup lang="ts">
import { container } from '~/components/landing/ui'

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
        'relative z-50 grid min-h-16 grid-cols-[1fr_auto] items-center gap-6 md:min-h-17 md:grid-cols-[1fr_auto_1fr]'
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
          class="h-auto w-32 md:w-33 dark:hidden"
        />
        <NuxtImg
          src="/img/homflo-dark-horizontal.webp"
          alt=""
          width="100%"
          height="100%"
          class="hidden h-auto w-32 md:w-33 dark:block"
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
          class="text-[0.9375rem] font-medium text-muted-foreground no-underline transition-colors duration-160 hover:text-foreground focus-ring"
          >{{ link.label }}</a
        >
      </nav>

      <div class="hidden items-center gap-2.5 justify-self-end md:flex">
        <LandingThemeToggle />
        <UButton to="/login" variant="soft">Masuk</UButton>
        <UButton to="/register">Daftar</UButton>
      </div>

      <div class="flex items-center gap-2 justify-self-end md:hidden">
        <LandingThemeToggle />
        <UButton
          variant="ghost"
          size="sm"
          class="rounded-lg p-2 border border-border"
          :aria-expanded="open"
          aria-controls="landing-mobile-menu"
          :aria-label="open ? 'Tutup menu' : 'Buka menu'"
          @click="open = !open"
        >
          <UIcon :name="open ? 'i-lucide-x' : 'i-lucide-menu'" class="size-5" aria-hidden="true" />
        </UButton>
      </div>
    </div>

    <Transition name="landing-menu">
      <div
        v-show="open"
        id="landing-mobile-menu"
        class="absolute inset-x-0 z-40 border-t border-rule bg-background shadow-md"
      >
        <nav :class="[container, 'flex flex-col gap-0.5 py-4 pb-6']" aria-label="Navigasi seluler">
          <a
            v-for="link in links"
            :key="link.href"
            :href="link.href"
            class="border-b border-rule py-3 text-base font-medium text-foreground no-underline hover:bg-stone-200/30 dark:hover:bg-stone-700/30 focus-ring px-3"
            @click="close"
          >
            {{ link.label }}
          </a>
          <div class="mt-4 grid grid-cols-2 gap-2.5">
            <UButton to="/login" variant="soft" @click="close">Masuk</UButton>
            <UButton to="/register" @click="close">Daftar</UButton>
          </div>
        </nav>
      </div>
    </Transition>
  </header>
  <button
    v-if="open"
    type="button"
    class="fixed inset-0 z-10 cursor-default bg-black/20 dark:bg-background/80"
    aria-label="Tutup menu"
    @click="close"
  />
</template>
