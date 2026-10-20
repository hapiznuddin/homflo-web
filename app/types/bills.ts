// Kontrak Bills API (mirror presenter backend BillController::presentBill
// + derived hasil BillService::deriveMany). Amount adalah STRING desimal
// dua digit — UI hanya memformat untuk tampilan, tidak pernah berhitung.
// status/overdue/paid_amount/remaining_amount/is_active SELALU dari
// backend (overdue divalidasi server terhadap businessToday Asia/Jakarta);
// browser tidak pernah menghitung ulang status maupun uang.

import type { TransactionItem } from '~/types/transactions'

export type BillFrequency = 'monthly' | 'quarterly' | 'semiannual' | 'yearly'

export interface BillRecurrenceLink {
  id: string
  frequency: BillFrequency
  due_day: number
  is_active: boolean
}

export interface BillCategory {
  id: string
  name: string
  icon: string | null
}

export interface BillItem {
  id: string
  household_id: string
  category: BillCategory | null
  title: string
  /** String desimal eksak dari backend, mis. "150000.00". */
  amount: string
  /** Format Y-m-d; null = bill tanpa tanggal jatuh tempo. */
  due_date: string | null
  /** false = terarsip. Arsip satu arah: backend tidak punya un-arsip. */
  is_active: boolean
  notes: string | null
  /** null = bill sekali; objek jadwal turunan, bukan relasi id. */
  recurrence: BillRecurrenceLink | null
  /** Format Y-m-d; periode pertama dari seri recurrence. */
  recurrence_period: string | null
  /** Turunan server. */
  paid_amount: string
  /** Turunan server: sisa tagihan (tampilan read-only pada form bayar). */
  remaining_amount: string
  payment_count: number
  /** Turunan server: 'paid' bila payment_count >= 1; jangan disimpulkan sendiri. */
  status: 'paid' | 'unpaid'
  /** Turunan server: unpaid && due_date < hari bisnis (Asia/Jakarta). */
  overdue: boolean
  created_at: string
  updated_at: string
}

export interface BillPayment {
  id: string
  amount: string
  occurred_on: string | null
  description: string | null
  wallet: { id: string, name: string, type: string, is_active: boolean } | null
  created_at: string
}

export interface BillDetail extends BillItem {
  /** Histori pembayaran terbaru dahulu; read-only (tanpa endpoint ubah/hapus). */
  payments: BillPayment[]
}

/** Respon POST /api/bills/{bill}/payments (201): transaksi expense + bill segar. */
export interface BillPayResponse {
  payment: TransactionItem
  bill: BillItem
}

/** Respon PATCH /api/bills/recurrences/{recurrence} (presentRecurrence). */
export interface BillRecurrence {
  id: string
  household_id: string
  title: string
  amount: string
  notes: string | null
  frequency: BillFrequency
  due_day: number
  is_active: boolean
  category: BillCategory | null
  created_at: string
  updated_at: string
}

export interface BillFilters {
  /**
   * include_archived=true mengembalikan bill aktif + terarsip (kontrak
   * backend); pemisahan baris arsip dilakukan di tampilan.
   */
  include_archived?: boolean
}

export interface BillFormValues {
  title: string
  /** Input mentah pengguna, mis. "150000" atau "150000,50". */
  amount: string
  due_date: string
  /** ID kategori dari API; '' berarti tanpa kategori (didukung backend). */
  category_id: string
  notes: string
  /** Toggle "Jadwalkan berulang" — hanya berlaku saat CREATE. */
  recurrence: boolean
  frequency: BillFrequency
}

export interface BillRecurrenceFormValues {
  title: string
  amount: string
  category_id: string
  notes: string
  due_day: number
  frequency: BillFrequency
  is_active: boolean
}

export interface BillPayFormValues {
  wallet_id: string
  /** Format Y-m-d; '' = kosong, backend memakai hari bisnis (WIB). */
  occurred_on: string
}
