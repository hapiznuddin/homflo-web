import { formatRupiah } from '~/utils/format'

// Helper murni domain transaksi (tanpa API Nuxt) agar dapat diuji di
// project unit. Composable mengimpor dari sini.

// Input nominal: digit dengan koma/titik desimal opsional (maks 2 digit),
// tanpa pemisah ribuan (ambigu). Backend menerima bentuk dot numeric.
const AMOUNT_PATTERN = /^\d+([.,]\d{1,2})?$/

// Normalisasi input nominal ke bentuk dot-form untuk backend.
// Mengembalikan null bila format tidak valid.
export function normalizeAmountInput(raw: string): string | null {
  const trimmed = raw.trim()

  if (!AMOUNT_PATTERN.test(trimmed)) {
    return null
  }

  const [whole, fraction] = trimmed.split(/[.,]/) as [string, string?]

  return fraction === undefined ? whole : `${whole}.${fraction}`
}

// Menampilkan string desimal backend ("150000.50") sebagai Rupiah.
// Hanya format tampilan — bukan aritmetika uang.
export function formatTransactionAmount(amount: string): string {
  return formatRupiah(Number(amount))
}
