<script setup lang="ts">
import LandingHeroLedger from './HeroLedger.vue'
import { container, heading2, ledeText } from '~/components/landingPage/ui'

const problems = [
  'Daftar belanja tercecer di Notes, WhatsApp, dan kertas.',
  'Tagihan jatuh tempo baru ingat setelah lewat.',
  'Riwayat servis kendaraan tidak tahu ada di mana.',
  'Sisa anggaran bulan ini cuma bisa ditebak.'
]
</script>

<template>
  <section v-scroll-reveal class="py-[clamp(48px,7vw,96px)] lp-scroll-reveal">
    <div
      :class="[
        container,
        'grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-[clamp(40px,6vw,80px)]'
      ]"
    >
      <div class="flex min-w-0 flex-col">
        <h2 :class="heading2">Urusan rumah tangga menyebar ke mana-mana.</h2>
        <p :class="[ledeText, 'mt-4']">
          Belanja di catatan. Tagihan di kalender. Servis di ingatan. Saldo di tiga aplikasi berbeda.
          Sulit diurus kalau tidak ada satu tempat yang pegang semua.
        </p>
        <ul class="m-0 mt-6 flex list-none flex-col border-t border-border p-0">
          <li
            v-for="problem in problems"
            :key="problem"
            class="flex items-start gap-3 border-b border-rule py-3.5"
          >
            <UIcon
              name="i-lucide-x"
              class="mt-0.5 size-4 shrink-0 text-red-500 dark:text-red-400"
              aria-hidden="true"
            />
            <span class="text-[0.9375rem] leading-normal text-muted-foreground text-pretty">{{
              problem
            }}</span>
          </li>
        </ul>
        <p class="mt-5 mb-0 text-[0.9375rem] leading-[1.55] text-foreground text-pretty">
          Homflo bukan aplikasi baru untuk dipelajari. Ini tempat yang sama untuk semua yang
          seharusnya sudah Anda catat.
        </p>
      </div>

      <div class="min-w-0">
        <LandingHeroLedger />
      </div>
    </div>
  </section>
</template>
