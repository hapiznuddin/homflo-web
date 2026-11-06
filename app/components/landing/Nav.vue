<script setup lang="ts">
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
  <header class="lp-nav">
    <div class="lp-container lp-nav-inner">
      <NuxtLink to="/" class="lp-wordmark" aria-label="Homflo, beranda" @click="close">
        <NuxtImg
          src="/img/homflo-light-horizontal.webp"
          alt="Homflo"
          width="132"
          height="28"
          class="lp-logo lp-logo-light"
        />
        <NuxtImg
          src="/img/homflo-dark-horizontal.webp"
          alt=""
          width="132"
          height="28"
          class="lp-logo lp-logo-dark"
          aria-hidden="true"
        />
      </NuxtLink>

      <nav class="lp-nav-links" aria-label="Navigasi utama">
        <a v-for="link in links" :key="link.href" :href="link.href">{{ link.label }}</a>
      </nav>

      <div class="lp-nav-actions">
        <NuxtLink to="/login" class="lp-link-action">Masuk</NuxtLink>
        <NuxtLink to="/register" class="lp-btn lp-btn-primary lp-btn-sm">Daftar</NuxtLink>
      </div>

      <button
        type="button"
        class="lp-menu-toggle"
        :aria-expanded="open"
        aria-controls="landing-mobile-menu"
        :aria-label="open ? 'Tutup menu' : 'Buka menu'"
        @click="open = !open"
      >
        <UIcon :name="open ? 'i-lucide-x' : 'i-lucide-menu'" class="size-5" aria-hidden="true" />
      </button>
    </div>

    <div v-show="open" id="landing-mobile-menu" class="lp-mobile-menu">
      <nav class="lp-container lp-mobile-links" aria-label="Navigasi seluler">
        <a v-for="link in links" :key="link.href" :href="link.href" @click="close">
          {{ link.label }}
        </a>
        <div class="lp-mobile-actions">
          <NuxtLink to="/login" class="lp-btn lp-btn-outline" @click="close">Masuk</NuxtLink>
          <NuxtLink to="/register" class="lp-btn lp-btn-primary" @click="close">Daftar</NuxtLink>
        </div>
      </nav>
    </div>
  </header>
</template>
