<script setup lang="ts">
import { container, heading2, ledeText, section, sectionHead } from '~/components/landingPage/ui'

const faqs = [
  {
    q: 'Apa itu Homflo?',
    a: 'Homflo adalah aplikasi web untuk mengelola uang dan kebutuhan rumah tangga di satu tempat. Isinya mencakup transaksi, anggaran, tagihan, properti, aset, kendaraan, dan daftar belanja.'
  },
  {
    q: 'Apakah perlu menghubungkan rekening bank?',
    a: 'Tidak. Homflo tidak terhubung ke rekening bank. Semua catatan keuangan dimasukkan secara manual.'
  },
  {
    q: 'Bisa dipakai bersama anggota keluarga?',
    a: 'Bisa. Anda dapat mengundang anggota lewat email. Pemilik rumah tangga mengelola anggota dan undangan; setiap anggota memakai akun sendiri. Belum ada kolaborasi real-time atau izin per anggota.'
  },
  {
    q: 'Apakah tersedia di ponsel?',
    a: 'Homflo adalah aplikasi web progresif (PWA). Bisa dibuka lewat browser ponsel dan dipasang ke layar utama. Homflo belum tersedia di toko aplikasi.'
  },
  {
    q: 'Apakah ada pengingat otomatis?',
    a: 'Belum. Tagihan, jadwal servis, dan kewajiban ditampilkan di dalam aplikasi, tetapi belum ada pengingat otomatis lewat email atau notifikasi.'
  },
  {
    q: 'Bagaimana data saya ditangani?',
    a: 'Akses memakai sesi login. Data dibatasi ke rumah tangga aktif dan tidak terhubung ke rekening bank. Homflo tidak mengklaim enkripsi end-to-end.'
  }
]
</script>

<template>
  <section id="faq" v-scroll-reveal :class="[section, 'lp-scroll-reveal']">
    <div :class="container">
      <div :class="sectionHead">
        <h2 :class="heading2">Pertanyaan yang sering muncul.</h2>
        <p :class="ledeText">Jawaban singkat tentang produk, data, dan cara mulai.</p>
      </div>

      <div class="mx-auto mt-9 max-w-[820px] border-t border-border">
        <details v-for="faq in faqs" :key="faq.q" class="group border-b border-rule">
          <summary
            class="flex cursor-pointer list-none items-center justify-between gap-5 py-[18px] text-base font-medium leading-[1.4] text-foreground [&::-webkit-details-marker]:hidden"
          >
            <span>{{ faq.q }}</span>
            <UIcon
              name="i-lucide-plus"
              class="size-4 shrink-0 text-muted-foreground transition-[transform,color] duration-[180ms] group-open:rotate-45 group-open:text-primary"
              aria-hidden="true"
            />
          </summary>
          <p
            class="m-0 max-w-[62ch] pt-0 pb-5 text-[0.9375rem] leading-[1.65] text-muted-foreground text-pretty"
          >
            {{ faq.a }}
          </p>
        </details>
      </div>
    </div>
  </section>

  <section v-scroll-reveal class="py-[clamp(48px,7vw,96px)] lp-scroll-reveal">
    <div :class="container">
      <div
        id="cta-panel"
        class="landing-cta-glow relative overflow-hidden rounded-[32px] border border-primary/30 bg-primary px-[clamp(24px,5vw,64px)] py-[clamp(40px,7vw,72px)] text-primary-foreground"
      >
        <div class="max-w-[640px]">
          <h2 class="m-0 max-w-[16ch] text-final font-semibold text-balance">
            Mulai dari rumah tangga Anda.
          </h2>
          <p class="mt-4 mb-0 max-w-[46ch] text-base leading-[1.6] text-on-primary-muted">
            Satu tempat untuk uang dan urusan rumah. Tanpa menghubungkan rekening bank.
          </p>
          <div class="mt-7 flex w-full max-w-[420px] flex-col gap-2.5 min-[480px]:flex-row">
            <NuxtLink to="/register" :class="[btnOnPrimary, actionButton]"
              >Buat rumah tangga</NuxtLink
            >
            <NuxtLink to="/login" :class="[btnGhostOnPrimary, actionButton]">Masuk</NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
