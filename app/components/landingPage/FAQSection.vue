<script setup lang="ts">
import type { AccordionItem } from '@nuxt/ui'
import { container, heading2, ledeText, section, sectionHead } from '~/components/landingPage/ui'

const faqs = ref<AccordionItem[]>([
  {
    label: 'Apa itu Homflo?',
    content:
      'Homflo adalah aplikasi web untuk mengelola semua urusan rumah tangga di satu tempat — mulai dari transaksi harian, anggaran, tagihan, sampai properti, kendaraan, dan daftar belanja. Tidak perlu berpindah aplikasi untuk setiap kebutuhan.'
  },
  {
    label: 'Apakah harus menghubungkan rekening bank?',
    content:
      'Tidak. Homflo tidak terhubung ke rekening bank dan tidak meminta akses ke data perbankan Anda. Semua catatan keuangan diisi sendiri secara manual — persis seperti buku kas.'
  },
  {
    label: 'Bisa dipakai bersama pasangan atau anggota keluarga?',
    content:
      'Bisa. Undang pasangan atau anggota keluarga lewat email — masing-masing memakai akun sendiri dalam satu rumah tangga yang sama. Pemilik rumah tangga yang mengelola siapa saja yang bergabung. Saat ini belum ada izin akses berbeda per anggota.'
  },
  {
    label: 'Apakah bisa dipakai di ponsel?',
    content:
      'Bisa. Homflo adalah aplikasi web progresif (PWA) yang bisa dibuka langsung dari browser ponsel dan dipasang ke layar utama seperti aplikasi biasa. Homflo belum tersedia di App Store maupun Google Play.'
  },
  {
    label: 'Apakah ada notifikasi atau pengingat otomatis?',
    content:
      'Belum. Tagihan jatuh tempo, jadwal servis, dan kewajiban kendaraan ditampilkan di dalam aplikasi, tapi belum ada pengingat lewat email atau notifikasi push. Fitur ini ada di roadmap kami.'
  },
  {
    label: 'Seberapa aman data saya?',
    content:
      'Login menggunakan sesi server-side (Laravel Sanctum) — token tidak disimpan di browser. Data Anda hanya bisa diakses oleh anggota rumah tangga aktif dan tidak terhubung ke rekening bank. Homflo tidak mengklaim enkripsi end-to-end, tapi kami transparan soal apa yang kami lakukan dan tidak lakukan.'
  }
])
</script>

<template>
  <section id="faq" v-scroll-reveal :class="[section, 'lp-scroll-reveal']">
    <div :class="container">
      <div :class="sectionHead">
        <h2 :class="heading2">Yang sering ditanyakan.</h2>
        <p :class="ledeText">Kami jawab yang paling sering ditanyakan, singkat dan jelas.</p>
      </div>

      <div class="mx-auto mt-9 max-w-4xl">
        <UAccordion :items="faqs" />
      </div>
    </div>
  </section>

  <section v-scroll-reveal class="py-12 lp-scroll-reveal">
    <div :class="container">
      <div
        id="cta-panel"
        class="landing-cta-glow relative overflow-hidden rounded-4xl border border-primary/30 bg-primary px-[clamp(24px,5vw,64px)] py-[clamp(40px,7vw,72px)] text-primary-foreground"
      >
        <div class="max-w-4xl">
          <h2 class="m-0 max-w-[16ch] text-final font-semibold text-balance">
            Coba sekarang, gratis.
          </h2>
          <p class="mt-4 mb-0 max-w-[46ch] text-base leading-[1.6] text-on-primary-muted">
            Buat rumah tangga, undang keluarga, dan mulai mencatat. Tidak perlu menghubungkan
            rekening bank.
          </p>
          <div class="mt-7 flex w-full flex-col gap-2.5 md:flex-row">
            <NuxtLink to="/register">
              <UButton
                size="xl"
                class="bg-stone-200 hover:bg-stone-300 text-base lg:text-lg text-primary px-6 font-medium"
                >Mulai Gratis</UButton
              >
            </NuxtLink>
            <NuxtLink to="/login">
              <UButton
                variant="outline"
                size="xl"
                class="border-2 border-stone-200 hover:bg-stone-200/10 text-base lg:text-lg text-stone-200 dark:text-primary px-6 font-medium"
                >Sudah punya akun</UButton
              >
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
