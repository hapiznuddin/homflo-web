<script setup lang="ts">
import { container, heading2, iconTile, ledeText, section } from '~/components/landingPage/ui'

const privacy = [
  {
    title: 'Tidak terhubung ke rekening bank',
    text: 'Semua catatan keuangan diisi sendiri secara manual. Homflo tidak pernah meminta akses ke rekening atau data perbankan Anda.'
  },
  {
    title: 'Sesi aman di sisi server',
    text: 'Login menggunakan sesi Laravel Sanctum. Token tidak disimpan di localStorage browser — lebih aman dari serangan XSS.'
  },
  {
    title: 'Data terbatas per rumah tangga',
    text: 'Setiap data hanya bisa diakses oleh anggota rumah tangga yang aktif. Tidak ada data yang bocor ke rumah tangga lain.'
  },
  {
    title: 'Verifikasi email wajib',
    text: 'Fitur utama hanya bisa digunakan setelah email diverifikasi — satu langkah sederhana untuk memastikan akun Anda aman.'
  }
]
</script>

<template>
  <section id="privasi" v-scroll-reveal :class="[section, 'lp-scroll-reveal']">
    <div :class="container">
      <div
        class="landing-panel-glow grid grid-cols-1 items-start gap-8 rounded-[32px] border border-rule bg-soft p-[clamp(20px,4vw,48px)] lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-[clamp(40px,6vw,72px)]"
      >
        <div class="flex flex-col gap-[18px]">
          <span :class="iconTile" aria-hidden="true">
            <UIcon name="i-lucide-shield-check" class="size-5" />
          </span>
          <h2 :class="heading2">Data Anda tetap milik Anda.</h2>
          <p :class="ledeText">Semua yang tercatat di Homflo Anda isi sendiri. Tidak ada koneksi ke rekening bank, tidak ada data yang dikirim ke layanan pihak ketiga.</p>
        </div>

        <dl class="m-0 border-t border-border">
          <div
            v-for="item in privacy"
            :key="item.title"
            class="grid grid-cols-1 gap-1 border-b border-rule py-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-5"
          >
            <dt class="m-0 text-[0.9375rem] font-semibold">{{ item.title }}</dt>
            <dd class="m-0 text-sm leading-[1.5] text-muted-foreground text-pretty">
              {{ item.text }}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  </section>
</template>
