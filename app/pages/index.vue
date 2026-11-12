<script setup lang="ts">
import FeatureSection from '~/components/landingPage/FeatureSections/FeatureSection.vue'
import HeroSection from '~/components/landingPage/HeroSections/HeroSection.vue'
import LedgerSection from '~/components/landingPage/LedgerSections/LedgerSection.vue'
import StepSection from '~/components/landingPage/StepSection.vue'
import PrivacySection from '~/components/landingPage/PrivacySection.vue'
import FAQSection from '~/components/landingPage/FAQSection.vue'

definePageMeta({ layout: 'landing' })

const auth = useAuth()

onMounted(async () => {
  const status = await auth.bootstrap()

  if (status === 'authenticated') {
    await navigateTo('/dashboard')
  }
})

useSeoMeta({
  title: 'Homflo — Rumah dan uang, satu catatan',
  description:
    'Catat pemasukan dan pengeluaran, anggaran, tagihan, properti, aset, kendaraan, dan daftar belanja rumah tangga. Tanpa menghubungkan rekening bank.',
  ogTitle: 'Homflo — Rumah dan uang, satu catatan',
  ogDescription:
    'Satu rumah tangga untuk uang, tagihan, rumah, kendaraan, dan daftar belanja. Tanpa menghubungkan rekening bank.',
  ogType: 'website',
  ogImage: '/img/homflo-light-horizontal.webp',
  twitterCard: 'summary_large_image'
})

const { public: runtime } = useRuntimeConfig()
const siteUrl =
  (runtime.siteUrl as string | undefined)?.replace(/\/+$/, '') ?? 'http://localhost:3000'

useHead({
  htmlAttrs: { lang: 'id' },
  meta: [{ name: 'robots', content: 'index, follow' }],
  link: [
    { rel: 'canonical', href: siteUrl + '/' },
    { rel: 'alternate', href: siteUrl + '/', hreflang: 'id' }
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        ['@context']: 'https://schema.org',
        ['@type']: 'Organization',
        name: 'Homflo',
        url: siteUrl,
        description:
          'Aplikasi web untuk mengelola uang dan kebutuhan rumah tangga di satu tempat: transaksi, anggaran, tagihan, properti, aset, kendaraan, dan daftar belanja. Tidak terhubung ke rekening bank.',
        logo: '/img/homflo-light-horizontal.webp'
      })
    }
  ]
})
</script>

<template>
  <div
    class="overflow-x-clip bg-background font-sans text-foreground [&_*::selection]:bg-primary/22 [&_*::selection]:text-foreground [&_*:focus-visible]:outline-2 [&_*:focus-visible]:outline-offset-[3px] [&_*:focus-visible]:outline-ring motion-reduce:**:animate-none motion-reduce:**:transition-none"
  >
    <a
      href="#main"
      class="absolute -top-25 inset-s-4 z-100 rounded-lg bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground focus:top-3"
      >Lewati ke konten</a
    >

    <main id="main">
      <HeroSection />
      <LedgerSection />
      <FeatureSection />
      <StepSection />
      <PrivacySection />
      <FAQSection />
    </main>
  </div>
</template>
