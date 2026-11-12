<script setup lang="ts">
import { container, heading2, ledeText, section, sectionHead, iconTile } from '~/components/landingPage/ui'

const steps = [
  {
    icon: 'i-lucide-user-plus',
    title: 'Daftar akun',
    text: 'Pakai email atau Google. Verifikasi email untuk membuka fitur utama.',
    meta: ['Email', 'Google']
  },
  {
    icon: 'i-lucide-house-plus',
    title: 'Buat rumah tangga',
    text: 'Beri nama rumah tangga. Anda menjadi pemiliknya dan bisa mengundang anggota.',
    meta: ['Nama rumah', 'Undang anggota']
  },
  {
    icon: 'i-lucide-pencil-line',
    title: 'Mulai mencatat',
    text: 'Uang, tagihan, rumah, kendaraan, dan daftar belanja siap diisi.',
    meta: ['Uang', 'Rumah', 'Kendaraan', 'Daftar']
  }
]
</script>

<template>
  <section id="cara-kerja" v-scroll-reveal :class="[section, 'lp-scroll-reveal']">
    <div :class="container">
      <div :class="sectionHead">
        <h2 :class="heading2">Mulai dalam tiga langkah.</h2>
        <p :class="ledeText">
          Dari akun baru sampai catatan pertama. Tidak perlu menghubungkan rekening bank.
        </p>
      </div>

      <ol class="m-0 mt-10 grid list-none grid-cols-1 border-t border-border p-0 md:grid-cols-3">
        <li
          v-for="(step, index) in steps"
          :key="step.title"
          v-scroll-reveal="{ delay: Math.min(index * 90, 240) }"
          class="border-b border-rule py-[22px] md:border-b-0 md:py-[26px] md:pe-[clamp(16px,2.4vw,32px)] md:pb-0 md:[&:not(:first-child)]:border-s md:[&:not(:first-child)]:border-rule md:[&:not(:first-child)]:ps-[clamp(16px,2.4vw,32px)] lp-scroll-reveal-child"
        >
          <div class="flex items-center gap-3">
            <span :class="iconTile" aria-hidden="true">
              <UIcon :name="step.icon" class="size-5" />
            </span>
            <span class="text-xs tabular-nums text-muted-foreground"
              >Langkah {{ String(index + 1).padStart(2, '0') }}</span
            >
          </div>
          <h3 class="m-0 mt-4 mb-2 text-lg font-semibold tracking-[-0.02em]">
            {{ step.title }}
          </h3>
          <p
            class="m-0 max-w-[38ch] text-[0.9375rem] leading-[1.5] text-muted-foreground text-pretty"
          >
            {{ step.text }}
          </p>
          <div class="mt-4 flex flex-wrap gap-1.5">
            <span
              v-for="item in step.meta"
              :key="item"
              class="rounded-full border border-rule bg-card px-2.5 py-1 text-xs leading-[1.35] text-muted-foreground"
              >{{ item }}</span
            >
          </div>
        </li>
      </ol>
    </div>
  </section>
</template>
