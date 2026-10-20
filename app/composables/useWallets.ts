import type { WalletItem } from '~/types/wallets'
import { readError } from '~/composables/useApiError'

// ---------------------------------------------------------------------------
// Read-only daftar dompet: Browser -> Nuxt /api/wallets (pass-through) ->
// Laravel -> PostgreSQL. Phase 14.3.4 TANPA operasi tulis (kontrak
// 14.3.1 §5.8) — hanya dipakai pemilih dompet aktif pada form pembayaran
// bill. balance bersifat TAMPILAN; validasi saldo tetap backend
// (INSUFFICIENT_FUNDS).
// ---------------------------------------------------------------------------

export function useWallets() {
  const items = useState<WalletItem[]>('wallets-items', () => [])
  const pending = useState<boolean>('wallets-pending', () => false)
  const error = useState<string | null>('wallets-error', () => null)
  const inflight = useState<boolean>('wallets-inflight', () => false)
  const requestSeq = useState<number>('wallets-request-seq', () => 0)

  function requestHeaders(): Record<string, string> {
    // Server-side rendering has no browser cookies of its own: forward
    // them explicitly so SSR resolves the real session instead of always
    // looking like a guest (same pattern as useAuth bootstrap).
    const headers: Record<string, string> = { Accept: 'application/json' }

    if (import.meta.server) {
      const { cookie } = useRequestHeaders(['cookie'])

      if (cookie) {
        headers.Cookie = cookie
      }
    }

    return headers
  }

  async function load(force = false): Promise<void> {
    if (inflight.value) {
      return
    }

    // Already have fresh data.
    if (!force && items.value.length > 0 && !error.value) {
      return
    }

    inflight.value = true
    pending.value = true
    error.value = null
    requestSeq.value += 1

    const current = requestSeq.value

    try {
      const envelope = await $fetch<{ success: boolean, data: WalletItem[] }>('/api/wallets', {
        credentials: 'include',
        headers: requestHeaders()
      })

      if (current !== requestSeq.value) {
        return
      }

      // Server route meneruskan envelope Laravel apa adanya; unwrap di
      // sini. Respons adalah array flat (tanpa pagination/filter).
      items.value = envelope.data
    } catch (err) {
      if (current !== requestSeq.value) {
        return
      }

      error.value = readError(err, 'Data dompet belum dapat dimuat.')
    } finally {
      if (current === requestSeq.value) {
        pending.value = false
        inflight.value = false
      }
    }
  }

  async function refresh(): Promise<void> {
    await load(true)
  }

  return {
    items,
    pending,
    error,
    load,
    refresh
  }
}
