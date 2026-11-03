// Kontrak Wallets API (mirror presenter backend WalletController::
// presentWallet). READ-ONLY di web: hanya daftar (halaman Dompet, pemilih
// dompet transaksi, pembayaran bill). Tidak ada proxy write Wallet dan
// tidak ada operasi tulis di UI.

export type WalletType = 'cash' | 'bank' | 'e-wallet'

export interface WalletItem {
  id: string
  household_id: string
  name: string
  type: WalletType
  opening_balance: string
  is_active: boolean
  /** String desimal saldo saat ini — TAMPILAN SAJA; validasi saldo tetap backend. */
  balance: string
  created_at: string
  updated_at: string
}
