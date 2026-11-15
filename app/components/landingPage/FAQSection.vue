<script setup lang="ts">
import type { AccordionItem } from '@nuxt/ui'

import {
  container,
  heading2,
  ledeText,
  section,
  sectionHead
} from '~/components/landingPage/ui'

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
</template>
