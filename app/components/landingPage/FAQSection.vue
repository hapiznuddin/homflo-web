<script setup lang="ts">
import {
  actionButton,
  btnGhostOnPrimary,
  btnOnPrimary,
  container,
  heading2,
  ledeText,
  section,
  sectionHead
} from '~/components/landingPage/ui'

const faqs = [
  {
    q: 'Apa itu Homflo?',
    a: 'Homflo adalah aplikasi web untuk mengelola semua urusan rumah tangga di satu tempat — mulai dari transaksi harian, anggaran, tagihan, sampai properti, kendaraan, dan daftar belanja. Tidak perlu berpindah aplikasi untuk setiap kebutuhan.'
  },
  {
    q: 'Apakah harus menghubungkan rekening bank?',
    a: 'Tidak. Homflo tidak terhubung ke rekening bank dan tidak meminta akses ke data perbankan Anda. Semua catatan keuangan diisi sendiri secara manual — persis seperti buku kas.'
  },
  {
    q: 'Bisa dipakai bersama pasangan atau anggota keluarga?',
    a: 'Bisa. Undang pasangan atau anggota keluarga lewat email — masing-masing memakai akun sendiri dalam satu rumah tangga yang sama. Pemilik rumah tangga yang mengelola siapa saja yang bergabung. Saat ini belum ada izin akses berbeda per anggota.'
  },
  {
    q: 'Apakah bisa dipakai di ponsel?',
    a: 'Bisa. Homflo adalah aplikasi web progresif (PWA) yang bisa dibuka langsung dari browser ponsel dan dipasang ke layar utama seperti aplikasi biasa. Homflo belum tersedia di App Store maupun Google Play.'
  },
  {
    q: 'Apakah ada notifikasi atau pengingat otomatis?',
    a: 'Belum. Tagihan jatuh tempo, jadwal servis, dan kewajiban kendaraan ditampilkan di dalam aplikasi, tapi belum ada pengingat lewat email atau notifikasi push. Fitur ini ada di roadmap kami.'
  },
  {
    q: 'Seberapa aman data saya?',
    a: 'Login menggunakan sesi server-side (Laravel Sanctum) — token tidak disimpan di browser. Data Anda hanya bisa diakses oleh anggota rumah tangga aktif dan tidak terhubung ke rekening bank. Homflo tidak mengklaim enkripsi end-to-end, tapi kami transparan soal apa yang kami lakukan dan tidak lakukan.'
  }
]
</script>

<template>
  <section id="faq" v-scroll-reveal :class="[section, 'lp-scroll-reveal']">
    <div :class="container">
      <div :class="sectionHead">
        <h2 :class="heading2">Yang sering ditanyakan.</h2>
        <p :class="ledeText">Kami jawab yang paling sering ditanyakan, singkat dan jelas.</p>
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
            Coba sekarang, gratis.
          </h2>
          <p class="mt-4 mb-0 max-w-[46ch] text-base leading-[1.6] text-on-primary-muted">
            Buat rumah tangga, undang keluarga, dan mulai mencatat. Tidak perlu menghubungkan rekening bank.
          </p>
          <div class="mt-7 flex w-full max-w-[420px] flex-col gap-2.5 min-[480px]:flex-row">
            <NuxtLink to="/register" :class="[btnOnPrimary, actionButton]"
              >Mulai gratis</NuxtLink
            >
            <NuxtLink to="/login" :class="[btnGhostOnPrimary, actionButton]">Sudah punya akun</NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
