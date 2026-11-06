<script setup lang="ts">
import '~/assets/css/landing.css'
import LandingNav from '~/components/landing/Nav.vue'
import LandingPreview from '~/components/landing/Preview.vue'

definePageMeta({ layout: 'landing' })

const auth = useAuth()

onMounted(async () => {
  const status = await auth.bootstrap()

  if (status === 'authenticated') {
    await navigateTo('/dashboard')
  }
})

useSeoMeta({
  title: 'Homflo — Uang dan rumah tangga di satu tempat',
  description:
    'Catat pemasukan dan pengeluaran, pantau anggaran dan tagihan, kelola properti, aset, kendaraan, serta daftar belanja rumah tangga.',
  ogTitle: 'Homflo — Uang dan rumah tangga di satu tempat',
  ogDescription:
    'Satu tempat untuk keuangan, tagihan, properti, aset, kendaraan, dan belanja rumah tangga.',
  ogType: 'website',
  ogImage: '/img/homflo-light-horizontal.webp',
  twitterCard: 'summary_large_image'
})

useHead({
  htmlAttrs: { lang: 'id' }
})

const domains = [
  {
    num: '01',
    name: 'Ringkasan',
    desc: 'Pendapatan, pengeluaran, arus kas, anggaran, tagihan, dan perawatan bulan ini.',
    href: '#ringkasan'
  },
  {
    num: '02',
    name: 'Uang',
    desc: 'Transaksi, dompet, anggaran, tagihan, dan kategori.',
    href: '#uang'
  },
  {
    num: '03',
    name: 'Rumah',
    desc: 'Properti, aset rumah, dan riwayat perawatan.',
    href: '#rumah'
  },
  {
    num: '04',
    name: 'Kendaraan',
    desc: 'Informasi kendaraan, jadwal servis, riwayat, dan kewajiban.',
    href: '#kendaraan'
  },
  {
    num: '05',
    name: 'Daftar',
    desc: 'Belanja rumah, item, estimasi harga, dan pengeluaran.',
    href: '#daftar'
  }
]

const faqs = [
  {
    q: 'Apa itu Homflo?',
    a: 'Homflo adalah aplikasi web untuk mengelola uang dan kebutuhan rumah tangga di satu tempat. Isinya mencakup transaksi, anggaran, tagihan, properti, aset, kendaraan, dan daftar belanja.'
  },
  {
    q: 'Siapa yang cocok memakai Homflo?',
    a: 'Individu, pasangan, atau keluarga yang ingin mencatat keuangan dan urusan rumah dalam satu rumah tangga. Setiap anggota memakai akun sendiri.'
  },
  {
    q: 'Apa saja yang bisa dikelola?',
    a: 'Pemasukan, pengeluaran, transfer, dompet, anggaran bulanan, tagihan dan pembayarannya, kategori, properti, aset, perawatan rumah, kendaraan, servis, kewajiban kendaraan, serta daftar belanja.'
  },
  {
    q: 'Apakah perlu menghubungkan rekening bank?',
    a: 'Tidak. Homflo tidak terhubung ke rekening bank. Semua catatan keuangan dimasukkan secara manual.'
  },
  {
    q: 'Bisa dipakai bersama anggota keluarga?',
    a: 'Bisa. Anda dapat mengundang anggota ke rumah tangga. Pemilik rumah tangga mengelola anggota dan undangan; setiap anggota memakai akun sendiri.'
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
  <div class="lp-root">
    <a href="#main" class="lp-skip">Lewati ke konten</a>

    <LandingNav />

    <main id="main">
      <section id="ringkasan" class="lp-hero">
        <div class="lp-container lp-hero-grid">
          <div class="lp-hero-copy">
            <h1>Rumah dan uang, satu tempat.</h1>
            <p class="lp-hero-sub">
              Kelola uang, tagihan, aset, kendaraan, dan belanja rumah dalam satu rumah tangga.
            </p>
            <div class="lp-hero-actions">
              <NuxtLink to="/register" class="lp-btn lp-btn-primary">Buat rumah tangga</NuxtLink>
              <a href="#cara-kerja" class="lp-btn lp-btn-outline">Lihat cara kerja</a>
            </div>
            <p class="lp-hero-note">Masuk dengan email atau Google.</p>
          </div>

          <div class="lp-hero-visual">
            <LandingPreview />
          </div>
        </div>
      </section>

      <section class="lp-section">
        <div class="lp-container lp-problem-grid">
          <div class="lp-problem-copy">
            <h2 class="lp-h2">Terlalu banyak tempat untuk hal yang sama.</h2>
            <p class="lp-lede">
              Catatan belanja di notes. Tagihan di kalender. Servis kendaraan di ingatan. Uang di
              beberapa aplikasi.
            </p>
          </div>

          <div>
            <dl class="lp-problem-list">
              <div class="lp-problem-row">
                <dt>Pengeluaran dan pemasukan</dt>
                <dd>Satu catatan arus kas.</dd>
              </div>
              <div class="lp-problem-row">
                <dt>Anggaran bulanan</dt>
                <dd>Sisa anggaran terlihat.</dd>
              </div>
              <div class="lp-problem-row">
                <dt>Tagihan</dt>
                <dd>Jatuh tempo dan status.</dd>
              </div>
              <div class="lp-problem-row">
                <dt>Rumah dan kendaraan</dt>
                <dd>Aset, servis, kewajiban.</dd>
              </div>
              <div class="lp-problem-row">
                <dt>Belanja rumah</dt>
                <dd>Daftar yang bisa dicentang.</dd>
              </div>
            </dl>
            <p class="lp-problem-close">
              Homflo menyatukan semuanya dalam satu rumah tangga. Bukan menambah aplikasi baru.
            </p>
          </div>
        </div>
      </section>

      <section id="fitur" class="lp-section">
        <div class="lp-container">
          <div class="lp-index-head">
            <div>
              <h2 class="lp-h2">Satu rumah tangga, lima area.</h2>
            </div>
            <p class="lp-lede">Mulai dari ringkasan, lalu masuk ke bagian yang perlu diurus.</p>
          </div>

          <nav class="lp-index" aria-label="Area produk Homflo">
            <a v-for="domain in domains" :key="domain.num" :href="domain.href" class="lp-index-row">
              <span class="lp-index-num">{{ domain.num }}</span>
              <span class="lp-index-name">{{ domain.name }}</span>
              <span class="lp-index-desc">{{ domain.desc }}</span>
              <UIcon
                name="i-lucide-arrow-up-right"
                class="lp-index-icon size-4"
                aria-hidden="true"
              />
            </a>
          </nav>
        </div>
      </section>

      <section id="uang" class="lp-section lp-money">
        <div class="lp-container lp-money-grid">
          <div class="lp-money-copy">
            <h2 class="lp-h2">Uang masuk dan keluar, tercatat.</h2>
            <p class="lp-lede">
              Catat pemasukan, pengeluaran, dan transfer. Lihat anggaran dan tagihan tanpa pindah
              aplikasi.
            </p>
            <ul class="lp-feature-list">
              <li>
                <strong>Transaksi</strong>
                <span>Pemasukan, pengeluaran, transfer.</span>
              </li>
              <li>
                <strong>Anggaran</strong>
                <span>Pagu bulanan dan sisa.</span>
              </li>
              <li>
                <strong>Tagihan</strong>
                <span>Jatuh tempo, status, pembayaran.</span>
              </li>
              <li>
                <strong>Dompet</strong>
                <span>Saldo per dompet.</span>
              </li>
            </ul>
          </div>

          <div class="lp-money-visual">
            <LandingPreview />
            <p class="lp-visual-caption">Pratinjau area Uang · data contoh</p>
          </div>
        </div>
      </section>

      <section id="rumah" class="lp-section">
        <div class="lp-container lp-split">
          <div class="lp-split-visual">
            <div class="lp-home-visual">
              <div class="lp-record-head">
                <div>
                  <p class="lp-label">Properti</p>
                  <p class="lp-record-title">Rumah Utama</p>
                  <p class="lp-record-sub">Rumah tinggal, milik sendiri, Bandung</p>
                </div>
                <span class="lp-status">Aktif</span>
              </div>

              <div class="lp-record-stack">
                <div class="lp-record-card">
                  <p class="lp-preview-label">Aset rumah</p>
                  <div class="lp-simple-row">
                    <span class="lp-row-icon" aria-hidden="true">
                      <UIcon name="i-lucide-package" class="size-4" />
                    </span>
                    <div class="lp-row-main">
                      <p>AC Kamar Utama</p>
                      <p class="lp-preview-footnote">Ruang keluarga</p>
                    </div>
                  </div>
                  <div class="lp-simple-row">
                    <span class="lp-row-icon" aria-hidden="true">
                      <UIcon name="i-lucide-package" class="size-4" />
                    </span>
                    <div class="lp-row-main">
                      <p>Kulkas Dapur</p>
                      <p class="lp-preview-footnote">Dapur</p>
                    </div>
                  </div>
                </div>

                <div class="lp-record-card">
                  <p class="lp-preview-label">Perawatan berikutnya</p>
                  <div class="lp-simple-row">
                    <div class="lp-date-chip">12 Nov</div>
                    <div class="lp-row-main">
                      <p>Servis AC</p>
                      <p class="lp-preview-footnote">Terjadwal</p>
                    </div>
                  </div>
                  <div class="lp-simple-row">
                    <div class="lp-date-chip">20 Nov</div>
                    <div class="lp-row-main">
                      <p>Ganti filter air</p>
                      <p class="lp-preview-footnote">Terjadwal</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="lp-split-copy">
            <h2 class="lp-h2">Rumah punya catatan.</h2>
            <p class="lp-lede">
              Simpan properti, aset, dan riwayat perawatan. Tahu apa yang dimiliki dan kapan
              dirawat.
            </p>
            <ul class="lp-split-list">
              <li>
                <UIcon name="i-lucide-check" class="lp-tick size-4" aria-hidden="true" />
                <div>
                  <strong>Properti</strong>
                  <span>Alamat, tipe, dan status kepemilikan.</span>
                </div>
              </li>
              <li>
                <UIcon name="i-lucide-check" class="lp-tick size-4" aria-hidden="true" />
                <div>
                  <strong>Aset</strong>
                  <span>Barang rumah dan properti tempatnya.</span>
                </div>
              </li>
              <li>
                <UIcon name="i-lucide-check" class="lp-tick size-4" aria-hidden="true" />
                <div>
                  <strong>Perawatan</strong>
                  <span>Jadwal, prioritas, dan riwayat.</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section id="kendaraan" class="lp-section">
        <div class="lp-container lp-split lp-split-reverse">
          <div class="lp-split-visual">
            <div class="lp-vehicle-visual">
              <div class="lp-record-head">
                <div>
                  <p class="lp-label">Kendaraan</p>
                  <p class="lp-record-title">Mobil Keluarga</p>
                  <p class="lp-record-sub">Toyota Avanza 2021, B 1234 XYZ</p>
                </div>
                <span class="lp-status">Aktif</span>
              </div>

              <div class="lp-record-stack">
                <div class="lp-record-card">
                  <p class="lp-preview-label">Jadwal servis</p>
                  <div class="lp-simple-row">
                    <div class="lp-date-chip">18 Nov</div>
                    <div class="lp-row-main">
                      <p>Servis rutin 10.000 km</p>
                      <p class="lp-preview-footnote">Odometer 42.500 km</p>
                    </div>
                  </div>
                </div>

                <div class="lp-record-card">
                  <p class="lp-preview-label">Kewajiban</p>
                  <div class="lp-simple-row">
                    <span class="lp-row-icon" aria-hidden="true">
                      <UIcon name="i-lucide-file-text" class="size-4" />
                    </span>
                    <div class="lp-row-main">
                      <p>Pajak Kendaraan</p>
                      <p class="lp-preview-footnote">Aktif</p>
                    </div>
                  </div>
                  <div class="lp-simple-row">
                    <span class="lp-row-icon" aria-hidden="true">
                      <UIcon name="i-lucide-file-text" class="size-4" />
                    </span>
                    <div class="lp-row-main">
                      <p>STNK / Registrasi</p>
                      <p class="lp-preview-footnote">Aktif</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="lp-split-copy">
            <h2 class="lp-h2">Kendaraan tidak hanya soal servis.</h2>
            <p class="lp-lede">
              Catat kendaraan, jadwal dan riwayat servis, serta kewajiban administratif.
            </p>
            <ul class="lp-split-list">
              <li>
                <UIcon name="i-lucide-check" class="lp-tick size-4" aria-hidden="true" />
                <div>
                  <strong>Servis</strong>
                  <span>Jadwal dan riwayat dalam satu kendaraan.</span>
                </div>
              </li>
              <li>
                <UIcon name="i-lucide-check" class="lp-tick size-4" aria-hidden="true" />
                <div>
                  <strong>Odometer</strong>
                  <span>Catatan jarak tempuh saat servis.</span>
                </div>
              </li>
              <li>
                <UIcon name="i-lucide-check" class="lp-tick size-4" aria-hidden="true" />
                <div>
                  <strong>Kewajiban</strong>
                  <span>Pajak, STNK, dan KIR.</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section id="daftar" class="lp-section lp-lists">
        <div class="lp-container lp-lists-grid">
          <div class="lp-lists-visual">
            <div class="lp-list-head">
              <div>
                <p class="lp-preview-label">Daftar belanja</p>
                <p class="lp-property-name">Belanja mingguan</p>
              </div>
              <span class="lp-preview-footnote">4 item</span>
            </div>

            <div class="lp-shopping">
              <div class="lp-shopping-row lp-is-done">
                <span class="lp-check lp-is-done" aria-hidden="true">
                  <UIcon name="i-lucide-check" class="size-3.5" />
                </span>
                <span class="lp-row-main">Beras 5 kg</span>
                <span class="lp-row-amount">Rp 72.000</span>
              </div>
              <div class="lp-shopping-row">
                <span class="lp-check" aria-hidden="true" />
                <span class="lp-row-main">Telur 1 kg</span>
                <span class="lp-row-amount">Rp 32.000</span>
              </div>
              <div class="lp-shopping-row">
                <span class="lp-check" aria-hidden="true" />
                <span class="lp-row-main">Sabun cuci 2 pcs</span>
                <span class="lp-row-amount">Rp 46.000</span>
              </div>
              <div class="lp-shopping-row">
                <span class="lp-check" aria-hidden="true" />
                <span class="lp-row-main">Minyak goreng 2 L</span>
                <span class="lp-row-amount">Rp 38.000</span>
              </div>
            </div>

            <div class="lp-list-total">
              <span>Estimasi total</span>
              <strong>Rp 188.000</strong>
            </div>
          </div>

          <div class="lp-lists-copy">
            <h2 class="lp-h2">Belanja rumah, tanpa daftar yang hilang.</h2>
            <p class="lp-lede">
              Buat daftar, tambah item, centang yang sudah dibeli, lalu catat pengeluarannya.
            </p>
            <ul class="lp-split-list">
              <li>
                <UIcon name="i-lucide-check" class="lp-tick size-4" aria-hidden="true" />
                <div>
                  <strong>Daftar aktif</strong>
                  <span>Satu daftar utama selalu tersedia.</span>
                </div>
              </li>
              <li>
                <UIcon name="i-lucide-check" class="lp-tick size-4" aria-hidden="true" />
                <div>
                  <strong>Item dan estimasi</strong>
                  <span>Jumlah, satuan, dan perkiraan harga.</span>
                </div>
              </li>
              <li>
                <UIcon name="i-lucide-check" class="lp-tick size-4" aria-hidden="true" />
                <div>
                  <strong>Selesai dan catat</strong>
                  <span>Harga aktual menjadi pengeluaran.</span>
                </div>
              </li>
            </ul>

            <div class="lp-household-note">
              <div class="lp-avatars" aria-hidden="true">
                <span class="lp-avatar">B</span>
                <span class="lp-avatar">S</span>
              </div>
              <p>
                <strong>Dipakai bersama.</strong>
                <span>Undang anggota ke rumah tangga. Data terpisah per rumah tangga aktif.</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="cara-kerja" class="lp-section">
        <div class="lp-container">
          <div class="lp-steps-head">
            <div>
              <h2 class="lp-h2">Mulai dalam tiga langkah.</h2>
            </div>
            <NuxtLink to="/register" class="lp-btn lp-btn-primary">Mulai sekarang</NuxtLink>
          </div>

          <ol class="lp-steps">
            <li class="lp-step">
              <span class="lp-step-num">01</span>
              <h3>Daftar akun</h3>
              <p>Pakai email atau Google. Verifikasi email untuk membuka fitur utama.</p>
            </li>
            <li class="lp-step">
              <span class="lp-step-num">02</span>
              <h3>Buat rumah tangga</h3>
              <p>Beri nama rumah tangga. Anda menjadi pemiliknya.</p>
            </li>
            <li class="lp-step">
              <span class="lp-step-num">03</span>
              <h3>Mulai mencatat</h3>
              <p>Uang, tagihan, rumah, kendaraan, dan daftar belanja siap diisi.</p>
            </li>
          </ol>
        </div>
      </section>

      <section id="privasi" class="lp-section">
        <div class="lp-container lp-trust-grid">
          <div class="lp-trust-copy">
            <h2 class="lp-h2">Jujur soal data.</h2>
            <p class="lp-lede">Homflo adalah buku catatan rumah tangga, bukan aplikasi bank.</p>
          </div>

          <dl class="lp-trust-list">
            <div class="lp-trust-row">
              <dt>Tidak terhubung rekening bank</dt>
              <dd>
                Semua catatan keuangan dimasukkan manual. Homflo tidak meminta akses rekening.
              </dd>
            </div>
            <div class="lp-trust-row">
              <dt>Sesi lewat server</dt>
              <dd>
                Autentikasi memakai sesi Laravel Sanctum. Browser tidak menyimpan token akses di
                localStorage.
              </dd>
            </div>
            <div class="lp-trust-row">
              <dt>Data per rumah tangga</dt>
              <dd>
                Akses dibatasi ke rumah tangga aktif. Data tidak dibagikan lintas rumah tangga.
              </dd>
            </div>
            <div class="lp-trust-row">
              <dt>Verifikasi email</dt>
              <dd>Fitur utama memerlukan email terverifikasi sebelum digunakan.</dd>
            </div>
          </dl>
        </div>
      </section>

      <section id="faq" class="lp-section">
        <div class="lp-container lp-faq-grid">
          <div class="lp-faq-copy">
            <h2 class="lp-h2">Pertanyaan yang sering muncul.</h2>
            <p class="lp-lede">Jawaban singkat tentang produk, data, dan cara mulai.</p>
          </div>

          <div class="lp-faq-list">
            <details v-for="faq in faqs" :key="faq.q" class="lp-faq-item">
              <summary>
                <span>{{ faq.q }}</span>
                <UIcon name="i-lucide-plus" class="lp-faq-icon size-4" aria-hidden="true" />
              </summary>
              <p>{{ faq.a }}</p>
            </details>
          </div>
        </div>
      </section>

      <section class="lp-final">
        <div class="lp-container lp-final-inner">
          <div>
            <h2>Mulai dari rumah tangga Anda.</h2>
            <p>Satu tempat untuk uang dan urusan rumah. Tanpa menghubungkan rekening bank.</p>
          </div>
          <div class="lp-final-actions">
            <NuxtLink to="/register" class="lp-btn lp-btn-on-primary">Buat rumah tangga</NuxtLink>
            <NuxtLink to="/login" class="lp-btn lp-btn-ghost-on-primary">Masuk</NuxtLink>
          </div>
        </div>
      </section>
    </main>

    <footer class="lp-footer">
      <div class="lp-container">
        <div class="lp-footer-grid">
          <div class="lp-footer-brand">
            <NuxtLink to="/" class="lp-wordmark" aria-label="Homflo, beranda">
              <NuxtImg
                src="/img/homflo-light-horizontal.webp"
                alt="Homflo"
                width="132"
                height="28"
                class="lp-logo lp-logo-light"
              />
              <NuxtImg
                src="/img/homflo-dark-horizontal.webp"
                alt=""
                width="132"
                height="28"
                class="lp-logo lp-logo-dark"
                aria-hidden="true"
              />
            </NuxtLink>
            <p>Aplikasi rumah tangga untuk mencatat uang, tagihan, aset, kendaraan, dan belanja.</p>
          </div>

          <div>
            <h2>Produk</h2>
            <ul>
              <li><a href="#fitur">Fitur</a></li>
              <li><a href="#cara-kerja">Cara kerja</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h2>Akun</h2>
            <ul>
              <li><NuxtLink to="/login">Masuk</NuxtLink></li>
              <li><NuxtLink to="/register">Daftar</NuxtLink></li>
            </ul>
          </div>
        </div>

        <div class="lp-footer-bottom">
          <span>© 2026 Homflo</span>
          <span>Dibuat untuk rumah tangga.</span>
        </div>
      </div>
    </footer>
  </div>
</template>
