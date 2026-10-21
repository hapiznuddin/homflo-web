import type { TransactionType } from '~/types/transactions'
import { formatRupiah } from '~/utils/format'

// Helper murni domain transaksi (tanpa API Nuxt) agar dapat diuji di
// project unit. Composable mengimpor dari sini.

// --- Representasi per tipe (Phase 15.2.1) -------------------------------
// Transfer tampil NETRAL — bukan pemasukan, bukan pengeluaran — sesuai
// kontrak backend (transfer tidak pernah dihitung sebagai income/expense;
// preseden dashboard Phase 15.1: label "Transfer", netral, unsigned,
// ikon panah dua arah).

export function transactionTypeLabel(type: TransactionType): string {
  if (type === 'income') {
    return 'Pemasukan'
  }

  if (type === 'expense') {
    return 'Pengeluaran'
  }

  return 'Transfer'
}

export function transactionTypeIcon(type: TransactionType): string {
  if (type === 'income') {
    return 'i-lucide-trending-up'
  }

  if (type === 'expense') {
    return 'i-lucide-trending-down'
  }

  return 'i-lucide-arrow-right-left'
}

// Tanda nominal di daftar: '+' pemasukan, '-' pengeluaran, transfer
// tanpa tanda (unsigned — bukan arus kas masuk/keluar).
export function transactionAmountSign(type: TransactionType): string {
  if (type === 'income') {
    return '+'
  }

  if (type === 'expense') {
    return '-'
  }

  return ''
}

// Warna nominal: pemasukan sukses, pengeluaran highlighted, transfer
// netral text-default (tanpa muatan positif/negatif).
export function transactionAmountClass(type: TransactionType): string {
  if (type === 'income') {
    return 'text-success'
  }

  if (type === 'expense') {
    return 'text-highlighted'
  }

  return 'text-default'
}

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
