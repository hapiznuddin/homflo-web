# Phase 13 — Dashboard Financial Integration Report

**Project:** Homflo
**Status:** Implementasi frontend selesai, review provider. Tidak ada commit/push/rebase/reset/clean. Working tree API bersih; Web berisi perubahan source-nyata + artifact tsbuildinfo yang dihasilkan gaates.

**Tanggal eksekusi:** 2026-10-15

## 1. Ringkasan perubahan

Dashboard kini mengonsumsi API finansial yang benar-benar tersedia:
- agregat periodik: `GET /api/dashboard` (read model, tetap membawa `financial` nol-jujur + koleksi bawaan);
- target dan turunan server: `GET /api/budgets?year=&month=` memberikan `actual_spending`, `remaining`, `usage_percentage`, `usage_status`, serta `meta.household.actual_spending` ketika `year` dan `month` dikirim bersama;
- transaksi terbaru: `GET /api/transactions?sort_by=occurred_on&sort_dir=desc&per_page=5` memakai kontrak presenter asli, tanpa sort karangan baru.

Total household **hanya** berasal dari `meta.household.actual_spending` ketika
`meta.period` cocok dengan periode Dashboard. Tidak ada penjumlahan
`spent`/`actual_spending` kategori di browser.

Pengeluaran dan anggaran ditampilkan apa adanya sebagai decimal string di
boundary (dikonversi ke `Number` hanya untuk presentasi Rupiah, bukan
kalkulasi). Remaining negatif ditampilkan jujur. `usage_status=no_budget`
ditampilkan sebagai `Tanpa target` plus keterangan sisa/lebih; tanpa 0% atau
`NaN`.

Domain yang belum didukung (income, net cash flow, bills/maintenance aktual)
dipertahankan sebagai status jujur: income dan net cash flow dikembalikan
`0` dengan `availability income/netCashFlow = false` sehingga UI menampilkan
`Belum tersedia`, bukan angka terverifikasi. Bills/maintenance bawaan dari
read model tetap ditampilkan apa adanya (kosong => empty state yang jujur).

## 2. File berubah

- `app/types/dashboard.ts` — `DashboardResponse` diperluas dengan
  `availability: DashboardDataAvailability` (income/expense/netCashFlow).
- `app/utils/dashboardMapper.ts`
  - ditambah tipe `LaravelBudgetApiItem`, `LaravelBudgetsPayload`,
    `LaravelTransactionApiItem`, `LaravelTransactionsPayload`.
  - `mapBudgetApiItem`, `mapTransactionApiItem`, `mapDashboardFinance`.
  - `mapDashboardResponse` memberikan `availability` default (semua false).
- `app/composables/useDashboard.ts` — satu `load` sekarang melakukan 3 request
  paralel (`/api/dashboard`, `/api/budgets`, `/api/transactions`) dengan
  guard sequencing/race protection yang sudah ada. Budget & transaksi yang
  gagal membuat error state, bukan nol.
- `app/pages/dashboard/index.vue` — 3 KPI kini mengecek
  `data.availability.*`; income/netCashFlow menampilkan `—`/`Belum tersedia`
  bila tidak tersedia; expense memakai `meta` backend.
- Test: `test/unit/dashboard-mapper.test.ts` (+20+ kasus),
  `test/nuxt/dashboard-composable.test.ts`,
  `test/nuxt/dashboard-page.test.ts`,
  `test/nuxt/dashboard-page-states.test.ts`.

## 3. Matriks KPI dan sumber data

| KPI | Sumber API | Definisi angka | Periode | Tersedia | Empty handling |
|---|---|---|---|---|---|
| Pengeluaran bulan ini | `GET /api/budgets` → `meta.household.actual_spending` | total pengeluaran tervalidasi server dari transaksi `type=expense` | kokok `year/month` dengan Dashboard | **Ya, hanya ketika meta cocok** | `Belum tersedia` bila meta absent/tak cocok; tidak diganti penjumlahan |
| Pendapatan bulan ini | (tidak ada API agregat) | — | — | **Tidak** | `Belum tersedia`, angka terverifikasi tidak ditampilkan |
| Arus kas bersih | (tidak ada API agregat) | — | — | **Tidak** | `Belum tersedia` |
| Persentase anggaran | `GET /api/budgets` → `usage_percentage` | per budget, server-side | per budget | **Ya** (null bila `no_budget`) | `no_budget` → tanpa persentase numerik |

Perhatian: dashboard backend (`/api/dashboard`) tetap mengembalikan
`financial.expense=0` (UNSUPPORTED_DOMAINS). Income/expense/net cash flow dari
buku absen tidak dipakai. Pengeluaran truth diambil dari `meta` endpoint
Budget.

## 4. Kontrak API yang dikonsumsi

- Budget: envelope `{ success, data: BudgetItem[], meta? }`;
  tiap item memuat `amount`, `actual_spending`, `remaining`,
  `usage_percentage` (`number|null`), `usage_status`
  (`normal`/`no_budget`).
- `meta` hanya ada bila `year` & `month` lengkap → `{ period, household: { actual_spending } }`.
- Transactions: envelope `{ success, data: { data: TransactionItem[], meta } }`,
  sort `occurred_on desc`, `per_page=5`.

Yang dipakai: `meta` household total. Tidak ada penjumlahan `actual_spending`
data[] per kategori (kokok disegarkan: 8.280.000 vs 6.500.000).

## 5. Penanganan `meta` kondisional

`mapDashboardFinance` memverifikasi `meta.period.year/month` cocok dengan
`(year, month)` yang diminta dan `meta.household.actual_spending` valid
string desimal. Bila tidak cocok/meta hilang, `expense=0` ditampilkan pada
field read-model tetapi `availability.expense=false`, sehingga UI menampilkan
`Belum tersedia`. Field read-model integer nol yang dipakai hanya sebagai
placeholder UI, **ditandai tidak terverifikasi**; tidak ada angka terverifikasi
yang dikesampingkan.

## 6. Budget nol & remaining negatif

- `usage_status=no_budget` → `percent=0`, `status='normal'`,
  `note='Tanpa target · Sisa/Lebih …'`. Tidak ada `0%` persentase
  numerik.
- `remaining < 0` → `note` mengandung `Lebih` + nominal absolut.
- Budget kosong → `Belum ada anggaran` (empty state).
- API gagal → error state + tombol `Coba lagi` tanpa mengganti data nol.

## 7. Domain belum didukung

- Income dan net cash flow: BELUM ada API agregat. UI menampilkan
  `Belum tersedia`, bukan nol.
- Bills dan Maintenance: bawaan read-model (`/api/dashboard`) ditampilkan apa
  adanya — bila kosong, empty state yang jujur. Tidak ada fixture/jumlah
  tagihan palsu.
- Budget bulan mendatang: tidak didukung sebagai fitur khusus — mengikuti
  kontrak Phase 12.

## 8. Quality gates

- `pnpm lint`: exit 0.
- `pnpm typecheck`: exit 0.
- `pnpm test`: 25 files, 220/220 passed (exit 0).
- `pnpm build`: complete, exit 0.

Tambahan per file baru test:
- `test/unit/dashboard-mapper.test.ts` → 17+ kasus termasuk no_budget,
  remaining negatif, meta mismatch, meta missing.
- `test/nuxt/dashboard-composable.test.ts` → total household dari meta, memo
  tak-campur, anti-penjumlahan.
- `test/nuxt/dashboard-page-states.test.ts` → KPI belum tersedia (jujur).

## 9. Browser smoke test

Tools: Chrome headless shell 148.0.7778.97, DevTools Protocol; preview
`pnpm build` + `pnpm preview` di :3000; Laravel API container :8000 +
PostgreSQL `homflo_db`.

Asersi (semua PASS):
1. Tamu dialihkan dari `/dashboard`.
2. Login UI berhasil.
3. KPI pengeluaran memakai total aktual server `275.000` (meta), bukan
   penjumlahan kategori (99999999.99 yang disengaja tidak terbaca).
4. KPI pendapatan & arus kas jujur `Belum tersedia`.
5. Budget aktual tampil dengan nama kategori seed.
6. Transaksi terbaru tampil (`SmokeTxDash2`).
7. Tanpa angka nol palsu.
8. Ganti periode ke September 2026 → empty state `Belum ada anggaran` jujur.
9. Tidak overflow horizontal di viewport 360 px (scroll 360 ≤ 360).
10. Tidak overflow horizontal di viewport 390 px (scroll 390 ≤ 390).
11. Tanpa console/page error fatal.

Data seed test (kategori/budget/transaksi) dibersihkan: 0 residual
Smokedash dan 0 Smokedash transaksi; 0 residual budget (verified via SQL).

## 10. Working tree

API: bersih (no tracked/untracked modification) — tidak ada perubahan backend.
Web (tracked, source-of-truth): 8 file dartar di atas. Plus
`tsconfig.test.tsbuildinfo` (artifact generated testing, bukan source-of-truth).
Tidak ada commit/rebase/reset/clean/stash, sesuai proteksi repository Phase 13.

## 11. Risiko dan business decision terbuka

- Owner-vs-member authorization belum final — handled server-side; UI tidak
  mengambil keputusan.
- Kategori tipe / retention / audit trail / periode dashboard baru /
  transaksi rencana / visibilitas antar_anggota — tetap unresolved, tidak
  diperluas pada Phase 13.
- Aggregate overflow boundary (P2 review 12.1) tetap teori; tidak ditangani
  di sini.
- Usage percentage serialisasi sebagai integer JSON diterima sebagai number
  (ditest `84`).
- Budget yang termasuk lintas periode tidak dicampur (verified test).

## 12. Rekomendasi tahap berikutnya

- Phase 14 (opsional): income/net cash flow/saldo — memerlukan API agregat
  baru di backend; tidak ada di scope Phase 13, dan tidak boleh difalsifikasi
  di frontend.
- Perbaikan kecil: bersihkan import `App\Models\Transaction` yang tidak
  dipakai di `BudgetService` (INFO dari review 12.1) — opsional, perlu
  persetujuan.
- Perhitungan `meta` absent di dashboard: pertimbangkan indikasi
  semi-persistent error ketimbang `Belum tersedia` — keputusan produk.
- UI period-switch: telah lolos 11/11; dapat diperluas untuk validasi
  Console SSR cookie forwarding secara log yang lebih spesifik.

Phase 13 berhenti di sini sesuai instruksi: integrasi-dashboard aktual
terkonsolidasi; siap untuk review.
