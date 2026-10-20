// Kontrak Wallets API (mirror presenter backend WalletController::
// presentWallet). Phase 14.3.4: READ-ONLY — hanya dipakai pemilih dompet
// pada form pembayaran bill; tidak ada proxy write Wallet dan tidak ada
// operasi tulis di UI.

export interface WalletItem {
  id: string
  household_id: string
  name: string
  type: string
  opening_balance: string
  is_active: boolean
  /** String desimal saldo saat ini — TAMPILAN SAJA; validasi saldo tetap backend. */
  balance: string
  created_at: string
  updated_at: string
}
