<script setup lang="ts">
import { container } from '~/components/landing/ui'

const open = ref(false)
const scrolled = ref(false)

const links = [
  { label: 'Fitur', href: '#fitur' },
  { label: 'Cara kerja', href: '#cara-kerja' },
  { label: 'FAQ', href: '#faq' }
]

let frame = 0

// Verrity-style nav state: transparent at the top, hairline pill after scroll.
// Passive listener + rAF coalescing, and the ref only changes at the threshold.
function update(): void {
  scrolled.value = window.scrollY > 24
}

function onScroll(): void {
  if (frame) return
  frame = requestAnimationFrame(() => {
    frame = 0
    update()
  })
}

function close(): void {
  open.value = false
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    close()
  }
}

onMounted(() => {
  update()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('keydown', onKeydown)
  if (frame) cancelAnimationFrame(frame)
})
</script>

<template>
  <header class="sticky top-0 z-40 py-2 sm:py-3">
    <div :class="container">
      <div
        :class="[
          'relative z-50 grid min-h-16 grid-cols-[1fr_auto] items-center gap-6 rounded-full border px-2 transition-[background-color,border-color,box-shadow] duration-300 ease-out-expo sm:px-3 md:min-h-17 md:grid-cols-[1fr_auto_1fr]',
          scrolled
            ? 'border-rule bg-background/85 shadow-[0_12px_32px_-20px_rgba(0,0,0,0.45)] backdrop-blur-md'
            : 'border-transparent bg-transparent'
        ]"
      >
        <NuxtLink
          to="/"
          class="inline-flex shrink-0 items-center justify-self-start pl-2"
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
            class="relative text-[0.9375rem] font-medium text-muted-foreground no-underline transition-colors duration-160 after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-200 after:ease-out-expo hover:text-foreground hover:after:scale-x-100 focus-ring"
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
        <div v-show="open" id="landing-mobile-menu" class="absolute inset-x-0 top-full z-40">
          <div :class="container">
            <nav
              class="mt-2 flex flex-col gap-0.5 rounded-2xl border border-rule bg-background p-3 shadow-lg"
              aria-label="Navigasi seluler"
            >
              <a
                v-for="link in links"
                :key="link.href"
                :href="link.href"
                class="border-b border-rule px-3 py-3 text-base font-medium text-foreground no-underline hover:bg-stone-200/30 dark:hover:bg-stone-700/30 focus-ring"
                @click="close"
              >
                {{ link.label }}
              </a>
              <div class="mt-3 grid grid-cols-2 gap-2.5">
                <UButton to="/login" variant="soft" @click="close">Masuk</UButton>
                <UButton to="/register" @click="close">Daftar</UButton>
              </div>
            </nav>
          </div>
        </div>
      </Transition>
    </div>
  </header>
  <button
    v-if="open"
    type="button"
    class="fixed inset-0 z-10 cursor-default bg-black/20 dark:bg-background/80"
    aria-label="Tutup menu"
    @click="close"
  />
</template>
