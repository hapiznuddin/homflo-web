<script setup lang="ts">
import LandingDomainList from './DomainList.vue'
import LandingFeatureStory from './FeatureStory.vue'
import LandingPreview from './Preview.vue'
import { container, heading2, ledeText, section, sectionHead } from '~/components/landingPage/ui'
</script>

<template>
  <section id="fitur" v-scroll-reveal :class="[section, 'lp-scroll-reveal']">
    <div :class="container">
      <div :class="sectionHead">
        <h2 :class="[heading2, 'max-w-[22ch]']">Semua yang perlu diurus, ada di sini.</h2>
        <p :class="ledeText">
          Enam area dalam satu rumah tangga — mulai dari ringkasan harian, sampai catatan kendaraan
          dan daftar belanja. Tidak perlu berpindah aplikasi.
        </p>
      </div>

      <LandingDomainList class="mt-10" />

      <LandingFeatureStory>
        <template #preview-uang>
          <div class="min-w-0 my-auto lg:py-4">
            <LandingPreview />
            <p class="mt-2.5 mb-0 text-end text-xs text-muted-foreground">
              Pratinjau area Uang · data contoh
            </p>
          </div>
        </template>

        <template #preview-rumah>
          <div class="rounded-2xl border border-border bg-card p-[clamp(18px,3vw,28px)]">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="m-0 text-[0.8125rem] leading-[1.4] text-muted-foreground">Properti</p>
                <p class="mt-1 mb-0 text-lg font-semibold tracking-tight">Rumah Utama</p>
                <p class="mt-1 mb-0 text-[0.8125rem] text-muted-foreground">
                  Rumah tinggal, milik sendiri, Bandung
                </p>
              </div>
              <span
                class="shrink-0 rounded-full border border-success/40 px-2 py-1 text-xs leading-[1.4] text-success"
                >Aktif</span
              >
            </div>

            <div class="mt-3.5 border-t border-rule pt-3.5">
              <p class="mb-1.5 text-xs leading-[1.35] text-muted-foreground">Aset rumah</p>
              <div
                class="flex items-center gap-2 border-t border-rule py-2 first-of-type:border-t-0"
              >
                <span
                  class="inline-flex size-6 shrink-0 items-center justify-center rounded-[7px] bg-soft text-primary"
                  aria-hidden="true"
                >
                  <UIcon name="i-lucide-package" class="size-4" />
                </span>
                <div class="min-w-0 flex-auto">
                  <p class="m-0 text-[0.8125rem] font-medium leading-[1.35]">AC Kamar Utama</p>
                  <p class="m-0 text-xs leading-[1.35] text-muted-foreground">Ruang keluarga</p>
                </div>
              </div>
              <div
                class="flex items-center gap-2 border-t border-rule py-2 first-of-type:border-t-0"
              >
                <span
                  class="inline-flex size-6 shrink-0 items-center justify-center rounded-[7px] bg-soft text-primary"
                  aria-hidden="true"
                >
                  <UIcon name="i-lucide-package" class="size-4" />
                </span>
                <div class="min-w-0 flex-auto">
                  <p class="m-0 text-[0.8125rem] font-medium leading-[1.35]">Kulkas Dapur</p>
                  <p class="m-0 text-xs leading-[1.35] text-muted-foreground">Dapur</p>
                </div>
              </div>
            </div>

            <div class="mt-3.5 border-t border-rule pt-3.5">
              <p class="mb-1.5 text-xs leading-[1.35] text-muted-foreground">
                Perawatan berikutnya
              </p>
              <div
                class="flex items-center gap-2 border-t border-rule py-2 first-of-type:border-t-0"
              >
                <div
                  class="inline-flex min-w-11 shrink-0 items-center justify-center rounded-md bg-soft px-1.5 py-1 text-xs font-semibold text-primary"
                >
                  12 Nov
                </div>
                <div class="min-w-0 flex-auto">
                  <p class="m-0 text-[0.8125rem] font-medium leading-[1.35]">Servis AC</p>
                  <p class="m-0 text-xs leading-[1.35] text-muted-foreground">Terjadwal</p>
                </div>
              </div>
              <div
                class="flex items-center gap-2 border-t border-rule py-2 first-of-type:border-t-0"
              >
                <div
                  class="inline-flex min-w-11 shrink-0 items-center justify-center rounded-md bg-soft px-1.5 py-1 text-xs font-semibold text-primary"
                >
                  20 Nov
                </div>
                <div class="min-w-0 flex-auto">
                  <p class="m-0 text-[0.8125rem] font-medium leading-[1.35]">Ganti filter air</p>
                  <p class="m-0 text-xs leading-[1.35] text-muted-foreground">Terjadwal</p>
                </div>
              </div>
            </div>
          </div>
        </template>

        <template #preview-kendaraan>
          <div class="rounded-2xl border border-border bg-card p-[clamp(18px,3vw,28px)]">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="m-0 text-[0.8125rem] leading-[1.4] text-muted-foreground">Kendaraan</p>
                <p class="mt-1 mb-0 text-lg font-semibold tracking-tight">Mobil Keluarga</p>
                <p class="mt-1 mb-0 text-[0.8125rem] text-muted-foreground">
                  Toyota Avanza 2021, B 1234 XYZ
                </p>
              </div>
              <span
                class="shrink-0 rounded-full border border-success/40 px-2 py-2 text-xs leading-[1.4] text-success"
                >Aktif</span
              >
            </div>

            <div class="mt-3.5 border-t border-rule pt-3.5">
              <p class="mb-1.5 text-xs leading-[1.35] text-muted-foreground">Jadwal servis</p>
              <div
                class="flex items-center gap-2 border-t border-rule py-2 first-of-type:border-t-0"
              >
                <div
                  class="inline-flex min-w-11 shrink-0 items-center justify-center rounded-md bg-soft px-1.5 py-1 text-xs font-semibold text-primary"
                >
                  18 Nov
                </div>
                <div class="min-w-0 flex-auto">
                  <p class="m-0 text-[0.8125rem] font-medium leading-[1.35]">
                    Servis rutin 10.000 km
                  </p>
                  <p class="m-0 text-xs leading-[1.35] text-muted-foreground">Odometer 42.500 km</p>
                </div>
              </div>
            </div>

            <div class="mt-3.5 border-t border-rule pt-3.5">
              <p class="mb-1.5 text-xs leading-[1.35] text-muted-foreground">Kewajiban</p>
              <div
                class="flex items-center gap-2 border-t border-rule py-2 first-of-type:border-t-0"
              >
                <span
                  class="inline-flex size-6 shrink-0 items-center justify-center rounded-[7px] bg-soft text-primary"
                  aria-hidden="true"
                >
                  <UIcon name="i-lucide-file-text" class="size-4" />
                </span>
                <div class="min-w-0 flex-auto">
                  <p class="m-0 text-[0.8125rem] font-medium leading-[1.35]">Pajak Kendaraan</p>
                  <p class="m-0 text-xs leading-[1.35] text-muted-foreground">Aktif</p>
                </div>
              </div>
              <div
                class="flex items-center gap-2 border-t border-rule py-2 first-of-type:border-t-0"
              >
                <span
                  class="inline-flex size-6 shrink-0 items-center justify-center rounded-[7px] bg-soft text-primary"
                  aria-hidden="true"
                >
                  <UIcon name="i-lucide-file-text" class="size-4" />
                </span>
                <div class="min-w-0 flex-auto">
                  <p class="m-0 text-[0.8125rem] font-medium leading-[1.35]">STNK / Registrasi</p>
                  <p class="m-0 text-xs leading-[1.35] text-muted-foreground">Aktif</p>
                </div>
              </div>
            </div>
          </div>
        </template>

        <template #preview-daftar>
          <div class="rounded-2xl border border-border bg-card p-[clamp(18px,3vw,28px)]">
            <div class="flex items-center justify-between gap-3 rounded-lg bg-soft p-2">
              <div>
                <p class="m-0 text-xs leading-[1.35] text-muted-foreground">Daftar belanja</p>
                <p class="mt-0.5 mb-0 text-[0.9375rem] font-semibold tracking-[-0.02em]">
                  Belanja mingguan
                </p>
              </div>
              <span class="text-xs leading-[1.35] text-muted-foreground">4 item</span>
            </div>

            <div class="border-t border-rule">
              <div class="flex items-center gap-2.5 border-b border-rule py-2">
                <span
                  class="inline-flex size-4 shrink-0 items-center justify-center rounded-[5px] border border-primary bg-primary text-primary-foreground"
                  aria-hidden="true"
                >
                  <UIcon name="i-lucide-check" class="size-3.5" />
                </span>
                <span class="min-w-0 flex-auto text-muted-foreground line-through">Beras 5 kg</span>
                <span class="shrink-0 text-xs font-semibold tabular-nums">Rp 72.000</span>
              </div>
              <div class="flex items-center gap-2.5 border-b border-rule py-2">
                <span
                  class="inline-flex size-4 shrink-0 items-center justify-center rounded-[5px] border border-border text-primary-foreground"
                  aria-hidden="true"
                />
                <span class="min-w-0 flex-auto">Telur 1 kg</span>
                <span class="shrink-0 text-xs font-semibold tabular-nums">Rp 32.000</span>
              </div>
              <div class="flex items-center gap-2.5 border-b border-rule py-2">
                <span
                  class="inline-flex size-4 shrink-0 items-center justify-center rounded-[5px] border border-border text-primary-foreground"
                  aria-hidden="true"
                />
                <span class="min-w-0 flex-auto">Sabun cuci 2 pcs</span>
                <span class="shrink-0 text-xs font-semibold tabular-nums">Rp 46.000</span>
              </div>
              <div class="flex items-center gap-2.5 border-b border-rule py-2">
                <span
                  class="inline-flex size-4 shrink-0 items-center justify-center rounded-[5px] border border-border text-primary-foreground"
                  aria-hidden="true"
                />
                <span class="min-w-0 flex-auto">Minyak goreng 2 L</span>
                <span class="shrink-0 text-xs font-semibold tabular-nums">Rp 38.000</span>
              </div>
            </div>

            <div class="flex items-baseline justify-between gap-3 pt-2.5 text-xs">
              <span>Estimasi total</span>
              <strong class="text-[0.9375rem] tabular-nums">Rp 188.000</strong>
            </div>
          </div>
        </template>

        <template #preview-rumah-tangga>
            <div class="rounded-2xl border border-border bg-card p-[clamp(18px,3vw,28px)]">
              <div class="flex items-start justify-between gap-3 border-b border-rule pb-3.5">
                <div>
                  <p class="m-0 text-xs leading-[1.35] text-muted-foreground">Rumah tangga</p>
                  <p class="mt-1 mb-0 text-lg font-semibold tracking-tight">
                    Rumah Tangga Budi
                  </p>
                </div>
                <span
                  class="shrink-0 rounded-full border border-border px-2 py-2 text-xs leading-[1.4] text-muted-foreground"
                  >Data contoh</span
                >
              </div>

              <div
                class="flex items-center gap-2.5 border-b border-rule py-3 last:border-b-0 last:pb-0"
              >
                <span
                  class="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-[0.625rem] font-semibold text-primary-foreground"
                  >B</span
                >
                <div class="min-w-0 flex-auto">
                  <p class="m-0 text-sm font-medium leading-[1.35]">Budi</p>
                  <p class="m-0 text-xs leading-[1.35] text-muted-foreground">budi@email.com</p>
                </div>
                <span class="shrink-0 text-xs text-muted-foreground">Pemilik</span>
              </div>
              <div
                class="flex items-center gap-2.5 border-b border-rule py-3 last:border-b-0 last:pb-0"
              >
                <span
                  class="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-soft-strong text-[0.625rem] font-semibold text-primary"
                  >S</span
                >
                <div class="min-w-0 flex-auto">
                  <p class="m-0 text-sm font-medium leading-[1.35]">Sari</p>
                  <p class="m-0 text-xs leading-[1.35] text-muted-foreground">sari@email.com</p>
                </div>
                <span class="shrink-0 text-xs text-muted-foreground">Anggota</span>
              </div>
              <div
                class="flex items-center gap-2.5 border-b border-rule py-3 last:border-b-0 last:pb-0"
              >
                <span
                  class="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-transparent text-[0.625rem] font-semibold text-muted-foreground"
                  aria-hidden="true"
                >
                  <UIcon name="i-lucide-mail" class="size-3.5" />
                </span>
                <div class="min-w-0 flex-auto">
                  <p class="m-0 text-sm font-medium leading-[1.35]">anggota@email.com</p>
                  <p class="m-0 text-xs leading-[1.35] text-muted-foreground">Undangan menunggu</p>
                </div>
                <span class="shrink-0 text-xs text-muted-foreground">Menunggu</span>
              </div>
            </div>
        </template>
      </LandingFeatureStory>
    </div>
  </section>
</template>
