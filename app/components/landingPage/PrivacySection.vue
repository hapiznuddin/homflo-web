<script setup lang="ts">
import { container, heading2, ledeText, section } from '~/components/landingPage/ui'

const privacy = [
  {
    title: 'Tidak terhubung rekening bank',
    text: 'Semua catatan keuangan dimasukkan manual. Homflo tidak meminta akses rekening.'
  },
  {
    title: 'Sesi lewat server',
    text: 'Autentikasi memakai sesi Laravel Sanctum. Browser tidak menyimpan token akses di localStorage.'
  },
  {
    title: 'Data per rumah tangga',
    text: 'Akses dibatasi ke rumah tangga aktif. Data tidak dibagikan lintas rumah tangga.'
  },
  {
    title: 'Verifikasi email',
    text: 'Fitur utama memerlukan email terverifikasi sebelum digunakan.'
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
          <h2 :class="heading2">Jujur soal data.</h2>
          <p :class="ledeText">Homflo adalah buku catatan rumah tangga, bukan aplikasi bank.</p>
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
