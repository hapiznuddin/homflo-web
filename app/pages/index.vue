<script setup lang="ts">
import LandingPreview from '~/components/landing/Preview.vue'
import LandingBackgroundRipple from '~/components/landing/BackgroundRipple.vue'
import LandingHeroDashboard from '~/components/landing/HeroDashboard.vue'
import LandingHeroLedger from '~/components/landing/HeroLedger.vue'
import LandingFeatureStory from '~/components/landing/FeatureStory.vue'
import LandingDomainList from '~/components/landing/DomainList.vue'
import {
  actionButton,
  btnGhostOnPrimary,
  btnOnPrimary,
  btnOutline,
  btnPrimary,
  container,
  heading2,
  iconTile,
  ledeText,
  section,
  sectionHead
} from '~/components/landing/ui'

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

const domains = [
  {
    name: 'Ringkasan',
    desc: 'Apa yang perlu diurus bulan ini, dalam satu layar.',
    href: '#ringkasan',
    icon: 'i-lucide-layout-dashboard',
    items: ['Sisa bulan ini', 'Tagihan terdekat', 'Perawatan'],
    featured: true
  },
  {
    name: 'Uang',
    desc: 'Pemasukan, pengeluaran, anggaran, tagihan, dan dompet.',
    href: '#uang',
    icon: 'i-lucide-wallet',
    items: ['Transaksi', 'Anggaran', 'Tagihan', 'Dompet'],
    featured: true
  },
  {
    name: 'Rumah',
    desc: 'Properti, aset, dan perawatan.',
    href: '#rumah',
    icon: 'i-lucide-house'
  },
  {
    name: 'Kendaraan',
    desc: 'Servis, odometer, pajak, STNK.',
    href: '#kendaraan',
    icon: 'i-lucide-car'
  },
  {
    name: 'Daftar',
    desc: 'Belanja rumah dan estimasi harga.',
    href: '#daftar',
    icon: 'i-lucide-shopping-basket'
  },
  {
    name: 'Rumah tangga',
    desc: 'Anggota, undangan, data bersama.',
    href: '#rumah-tangga',
    icon: 'i-lucide-users'
  }
]

const problems = [
  'Daftar belanja tercecer di beberapa tempat.',
  'Tagihan lupa jatuh tempo.',
  'Riwayat servis kendaraan hilang.',
  'Sisa anggaran tidak terlihat.'
]

const homePoints = [
  { label: 'Properti', text: 'Alamat, tipe, dan status kepemilikan.' },
  { label: 'Aset', text: 'Barang rumah dan properti tempatnya.' },
  { label: 'Perawatan', text: 'Jadwal, prioritas, dan riwayat.' }
]

const vehiclePoints = [
  { label: 'Servis', text: 'Jadwal dan riwayat dalam satu kendaraan.' },
  { label: 'Odometer', text: 'Catatan jarak tempuh saat servis.' },
  { label: 'Kewajiban', text: 'Pajak, STNK, dan KIR.' }
]

const listPoints = [
  { label: 'Daftar aktif', text: 'Satu daftar utama selalu tersedia.' },
  { label: 'Item dan estimasi', text: 'Jumlah, satuan, dan perkiraan harga.' },
  { label: 'Selesai dan catat', text: 'Harga aktual menjadi pengeluaran.' }
]

const moneyPoints = [
  { label: 'Transaksi', text: 'Pemasukan, pengeluaran, transfer.' },
  { label: 'Anggaran', text: 'Pagu bulanan dan sisa.' },
  { label: 'Tagihan', text: 'Jatuh tempo, status, pembayaran.' },
  { label: 'Dompet', text: 'Saldo per dompet.' }
]

const householdPoints = [
  {
    label: 'Undangan lewat email',
    text: 'Kirim undangan, lalu anggota menerima dengan akun sendiri.'
  },
  { label: 'Peran pemilik dan anggota', text: 'Pemilik mengelola anggota dan undangan.' },
  { label: 'Data terpisah per rumah tangga', text: 'Akses dibatasi ke rumah tangga aktif.' }
]

const featureStories = [
  {
    id: 'uang',
    title: 'Uang masuk dan keluar, tercatat.',
    lede: 'Catat pemasukan, pengeluaran, dan transfer. Lihat anggaran dan tagihan tanpa pindah aplikasi.',
    points: moneyPoints
  },
  {
    id: 'rumah',
    title: 'Rumah punya catatan.',
    lede: 'Simpan properti, aset, dan riwayat perawatan. Tahu apa yang dimiliki dan kapan dirawat.',
    points: homePoints
  },
  {
    id: 'kendaraan',
    title: 'Kendaraan tidak hanya soal servis.',
    lede: 'Catat kendaraan, jadwal dan riwayat servis, serta kewajiban administratif.',
    points: vehiclePoints
  },
  {
    id: 'daftar',
    title: 'Belanja rumah, tanpa daftar yang hilang.',
    lede: 'Buat daftar, tambah item, centang yang sudah dibeli, lalu catat pengeluarannya.',
    points: listPoints
  },
  {
    id: 'rumah-tangga',
    title: 'Satu rumah tangga, satu lingkup data.',
    lede: 'Undang anggota ke rumah tangga. Setiap anggota memakai akun sendiri, dan data dibatasi ke rumah tangga aktif.',
    points: householdPoints,
    note: 'Belum ada kolaborasi real-time atau izin per anggota.'
  }
]

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
  <div
    class="overflow-x-clip bg-background font-sans text-foreground [&_*::selection]:bg-primary/22 [&_*::selection]:text-foreground [&_*:focus-visible]:outline-2 [&_*:focus-visible]:outline-offset-[3px] [&_*:focus-visible]:outline-ring motion-reduce:**:animate-none motion-reduce:**:transition-none"
  >
    <a
      href="#main"
      class="absolute -top-[100px] start-4 z-[100] rounded-lg bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground focus:top-3"
      >Lewati ke konten</a
    >

    <main id="main">
      <section
        id="ringkasan"
        class="landing-hero-bg relative isolate -mt-20 scroll-mt-24 pb-[clamp(32px,5vw,56px)] pt-[clamp(56px,8vw,104px)] md:-mt-[92px]"
      >
        <LandingBackgroundRipple />
        <div class="h-20 md:h-[92px]" aria-hidden="true" />
        <div :class="[container, 'flex flex-col items-center text-center']">
          <h1
            class="m-0 min-w-0 max-w-[18ch] animate-in text-display font-semibold break-words text-balance fade-in fill-mode-both slide-in-from-bottom-3 duration-600 ease-out-expo lg:max-w-[16ch]"
          >
            Rumah dan uang, satu catatan.
          </h1>
          <p
            class="mt-5 mb-0 max-w-[54ch] animate-in text-hero-sub text-muted-foreground text-pretty fade-in fill-mode-both slide-in-from-bottom-3 delay-75 duration-600 ease-out-expo"
          >
            Catat uang, tagihan, rumah, kendaraan, dan daftar belanja rumah tangga di satu tempat.
            Tanpa menghubungkan rekening bank.
          </p>
          <div
            class="mt-8 flex w-full max-w-[460px] animate-in flex-col gap-2.5 fade-in fill-mode-both slide-in-from-bottom-3 delay-150 duration-600 ease-out-expo min-[480px]:flex-row min-[480px]:justify-center"
          >
            <NuxtLink to="/register" :class="[btnPrimary, actionButton, 'min-h-12 rounded-full! px-6']"
              >Buat rumah tangga
              <UIcon name="i-lucide-arrow-right" class="size-4" aria-hidden="true" />
            </NuxtLink>
            <a href="#fitur" :class="[btnOutline, actionButton, 'min-h-12 rounded-full! px-6']"
              >Lihat isi Homflo</a
            >
          </div>
          <p
            class="mt-4 mb-0 animate-in text-[0.8125rem] leading-[1.5] text-muted-foreground fade-in fill-mode-both slide-in-from-bottom-2 delay-200 duration-500 ease-out-expo"
          >
            Masuk dengan email atau Google. Pratinjau memakai data contoh.
          </p>
        </div>

        <div
          class="mx-auto mt-6 w-[calc(100%-40px)] max-w-[1320px] animate-in delay-250 duration-800 ease-out-expo fill-mode-both fade-in slide-in-from-bottom-6 zoom-in-95 [perspective:1400px] lg:mt-0"
        >
          <LandingHeroDashboard />
        </div>
      </section>

      <section v-scroll-reveal class="py-[clamp(48px,7vw,96px)] lp-scroll-reveal">
        <div
          :class="[
            container,
            'grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-[clamp(40px,6vw,80px)]'
          ]"
        >
          <div class="flex min-w-0 flex-col">
            <h2 :class="heading2">Terlalu banyak tempat untuk hal yang sama.</h2>
            <p :class="[ledeText, 'mt-4']">
              Belanja di catatan. Tagihan di kalender. Servis kendaraan di ingatan. Saldo di
              beberapa aplikasi.
            </p>
            <ul class="m-0 mt-6 flex list-none flex-col border-t border-border p-0">
              <li
                v-for="problem in problems"
                :key="problem"
                class="flex items-start gap-3 border-b border-rule py-3.5"
              >
                <UIcon
                  name="i-lucide-x"
                  class="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span class="text-[0.9375rem] leading-[1.5] text-muted-foreground text-pretty">{{
                  problem
                }}</span>
              </li>
            </ul>
            <p class="mt-5 mb-0 text-[0.9375rem] leading-[1.55] text-foreground text-pretty">
              Bukan aplikasi baru. Tempat yang sama untuk hal yang sudah Anda catat.
            </p>
          </div>

          <div class="min-w-0">
            <LandingHeroLedger />
          </div>
        </div>
      </section>

      <section id="fitur" v-scroll-reveal :class="[section, 'lp-scroll-reveal']">
        <div :class="container">
          <div :class="sectionHead">
            <h2 :class="[heading2, 'max-w-[22ch]']">Enam area, satu rumah tangga.</h2>
            <p :class="ledeText">
              Mulai dari ringkasan, lalu masuk ke bagian yang perlu diurus. Semua memakai rumah
              tangga yang sama.
            </p>
          </div>

          <LandingDomainList :domains="domains" class="mt-10" />
        </div>
      </section>

      <LandingFeatureStory :features="featureStories">
        <template #preview-uang>
  <div class="min-w-0">
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
        <p class="mt-1 mb-0 text-lg font-semibold tracking-[-0.025em]">Rumah Utama</p>
        <p class="mt-[3px] mb-0 text-[0.8125rem] text-muted-foreground">
          Rumah tinggal, milik sendiri, Bandung
        </p>
      </div>
      <span
        class="shrink-0 rounded-full border border-success/40 px-2 py-[3px] text-xs leading-[1.4] text-success"
        >Aktif</span
      >
    </div>

    <div class="mt-3.5 border-t border-rule pt-3.5">
      <p class="mb-1.5 text-xs leading-[1.35] text-muted-foreground">Aset rumah</p>
      <div
        class="flex items-center gap-2 border-t border-rule py-[7px] first-of-type:border-t-0"
      >
        <span
          class="inline-flex size-[26px] shrink-0 items-center justify-center rounded-[7px] bg-soft text-primary"
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
        class="flex items-center gap-2 border-t border-rule py-[7px] first-of-type:border-t-0"
      >
        <span
          class="inline-flex size-[26px] shrink-0 items-center justify-center rounded-[7px] bg-soft text-primary"
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
        class="flex items-center gap-2 border-t border-rule py-[7px] first-of-type:border-t-0"
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
        class="flex items-center gap-2 border-t border-rule py-[7px] first-of-type:border-t-0"
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
        <p class="mt-1 mb-0 text-lg font-semibold tracking-[-0.025em]">Mobil Keluarga</p>
        <p class="mt-[3px] mb-0 text-[0.8125rem] text-muted-foreground">
          Toyota Avanza 2021, B 1234 XYZ
        </p>
      </div>
      <span
        class="shrink-0 rounded-full border border-success/40 px-2 py-[3px] text-xs leading-[1.4] text-success"
        >Aktif</span
      >
    </div>

    <div class="mt-3.5 border-t border-rule pt-3.5">
      <p class="mb-1.5 text-xs leading-[1.35] text-muted-foreground">Jadwal servis</p>
      <div
        class="flex items-center gap-2 border-t border-rule py-[7px] first-of-type:border-t-0"
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
        class="flex items-center gap-2 border-t border-rule py-[7px] first-of-type:border-t-0"
      >
        <span
          class="inline-flex size-[26px] shrink-0 items-center justify-center rounded-[7px] bg-soft text-primary"
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
        class="flex items-center gap-2 border-t border-rule py-[7px] first-of-type:border-t-0"
      >
        <span
          class="inline-flex size-[26px] shrink-0 items-center justify-center rounded-[7px] bg-soft text-primary"
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
    <div class="flex items-center justify-between gap-3 rounded-lg bg-soft p-[13px]">
      <div>
        <p class="m-0 text-xs leading-[1.35] text-muted-foreground">Daftar belanja</p>
        <p class="mt-0.5 mb-0 text-[0.9375rem] font-semibold tracking-[-0.02em]">
          Belanja mingguan
        </p>
      </div>
      <span class="text-xs leading-[1.35] text-muted-foreground">4 item</span>
    </div>

    <div class="border-t border-rule">
      <div class="flex items-center gap-2.5 border-b border-rule py-[9px]">
        <span
          class="inline-flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border border-primary bg-primary text-primary-foreground"
          aria-hidden="true"
        >
          <UIcon name="i-lucide-check" class="size-3.5" />
        </span>
        <span class="min-w-0 flex-auto text-muted-foreground line-through">Beras 5 kg</span>
        <span class="shrink-0 text-xs font-semibold tabular-nums">Rp 72.000</span>
      </div>
      <div class="flex items-center gap-2.5 border-b border-rule py-[9px]">
        <span
          class="inline-flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border border-border text-primary-foreground"
          aria-hidden="true"
        />
        <span class="min-w-0 flex-auto">Telur 1 kg</span>
        <span class="shrink-0 text-xs font-semibold tabular-nums">Rp 32.000</span>
      </div>
      <div class="flex items-center gap-2.5 border-b border-rule py-[9px]">
        <span
          class="inline-flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border border-border text-primary-foreground"
          aria-hidden="true"
        />
        <span class="min-w-0 flex-auto">Sabun cuci 2 pcs</span>
        <span class="shrink-0 text-xs font-semibold tabular-nums">Rp 46.000</span>
      </div>
      <div class="flex items-center gap-2.5 border-b border-rule py-[9px]">
        <span
          class="inline-flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border border-border text-primary-foreground"
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
          <div class="rounded-[28px] border border-rule bg-soft p-3 sm:p-4">
      <div class="rounded-2xl border border-border bg-card p-[clamp(18px,3vw,28px)]">
        <div class="flex items-start justify-between gap-3 border-b border-rule pb-3.5">
          <div>
            <p class="m-0 text-xs leading-[1.35] text-muted-foreground">Rumah tangga</p>
            <p class="mt-1 mb-0 text-lg font-semibold tracking-[-0.025em]">
              Rumah Tangga Budi
            </p>
          </div>
          <span
            class="shrink-0 rounded-full border border-border px-2 py-[3px] text-xs leading-[1.4] text-muted-foreground"
            >Data contoh</span
          >
        </div>

        <div
          class="flex items-center gap-2.5 border-b border-rule py-3 last:border-b-0 last:pb-0"
        >
          <span
            class="inline-flex size-[30px] shrink-0 items-center justify-center rounded-full bg-primary text-[0.625rem] font-semibold text-primary-foreground"
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
            class="inline-flex size-[30px] shrink-0 items-center justify-center rounded-full bg-soft-strong text-[0.625rem] font-semibold text-primary"
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
            class="inline-flex size-[30px] shrink-0 items-center justify-center rounded-full border border-border bg-transparent text-[0.625rem] font-semibold text-muted-foreground"
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
    </div>
        </template>
      </LandingFeatureStory>

      <section id="cara-kerja" v-scroll-reveal :class="[section, 'lp-scroll-reveal']">
        <div :class="container">
          <div :class="sectionHead">
            <h2 :class="heading2">Mulai dalam tiga langkah.</h2>
            <p :class="ledeText">
              Dari akun baru sampai catatan pertama. Tidak perlu menghubungkan rekening bank.
            </p>
          </div>

          <ol
            class="m-0 mt-10 grid list-none grid-cols-1 border-t border-border p-0 md:grid-cols-3"
          >
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
    </main>
  </div>
</template>
