import type { BillFrequency, BillItem } from '~/types/bills'

// Helper murni domain bills (tanpa API Nuxt) agar dapat diuji di project
// unit. Semua fungsi di sini HANYA memformat/memilih label dari field
// backend — tanpa aritmetika uang dan tanpa membandingkan jam browser.

const FREQUENCY_LABELS: Record<BillFrequency, string> = {
  monthly: 'Bulanan',
  quarterly: 'Triwulanan',
  semiannual: 'Semesteran',
  yearly: 'Tahunan'
}

export function frequencyLabel(frequency: BillFrequency): string {
  return FREQUENCY_LABELS[frequency]
}

export type BillUiStatus = 'archived' | 'paid' | 'overdue' | 'unpaid'

export const BILL_UI_STATUS_LABELS: Record<BillUiStatus, string> = {
  archived: 'Diarsipkan',
  paid: 'Lunas',
  overdue: 'Terlambat',
  unpaid: 'Belum dibayar'
}

// Memilih status tampilan SEPENUHNYA dari field yang dihitung backend
// (is_active, status, overdue) — urutan penting: arsip > lunas > terlambat.
export function billUiStatus(bill: Pick<BillItem, 'is_active' | 'status' | 'overdue'>): BillUiStatus {
  if (!bill.is_active) {
    return 'archived'
  }

  if (bill.status === 'paid') {
    return 'paid'
  }

  if (bill.overdue) {
    return 'overdue'
  }

  return 'unpaid'
}

// Opsi frekuensi untuk select (D-01: empat nilai MVP, bukan hanya bulanan).
export const BILL_FREQUENCY_OPTIONS: Array<{ label: string, value: BillFrequency }> = [
  { label: 'Bulanan', value: 'monthly' },
  { label: 'Triwulanan', value: 'quarterly' },
  { label: 'Semesteran', value: 'semiannual' },
  { label: 'Tahunan', value: 'yearly' }
]

// Kelas chip status tampilan per status backend (murni pemetaan label).
export function billStatusChipClass(status: BillUiStatus): string {
  switch (status) {
    case 'paid':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
    case 'overdue':
      return 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
    case 'unpaid':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
    default:
      return 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
  }
}
