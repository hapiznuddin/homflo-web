import type {
  DashboardPeriod,
  DashboardResponse
} from '~/types/dashboard'
import { formatMonthLabel } from '~/utils/format'
import type {
  LaravelBudgetsPayload,
  LaravelDashboardPayload,
  LaravelTransactionsPayload
} from '~/utils/dashboardMapper'
import { mapDashboardFinance, mapDashboardResponse } from '~/utils/dashboardMapper'
import { readError } from '~/composables/useApiError'

// ---------------------------------------------------------------------------
// Read-model dashboard: data aktual dari GET /api/dashboard (Nuxt server
// boundary -> Laravel -> PostgreSQL). Satu request agregat per periode,
// inflight-deduplicated, dengan sequencing agar request lama tidak menimpa
// hasil periode yang lebih baru. Tidak ada fixture dan tidak ada fallback
// data karangan saat API gagal.
// ---------------------------------------------------------------------------

function periodKeyOf(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Composable. Single shared load per period (inflight-deduplicated), so the
// dashboard never fires duplicate requests from layout + page + components.
// ---------------------------------------------------------------------------

export function periodOptions(count = 13): DashboardPeriod[] {
  const now = new Date()
  const options: DashboardPeriod[] = []

  for (let offset = 0; offset < count; offset++) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    const year = date.getFullYear()
    const month = date.getMonth() + 1

    options.push({ key: periodKeyOf(year, month), label: formatMonthLabel(year, month) })
  }

  return options
}

export function useDashboard() {
  const now = new Date()
  const period = useState<DashboardPeriod>('dashboard-period', () => ({
    key: periodKeyOf(now.getFullYear(), now.getMonth() + 1),
    label: formatMonthLabel(now.getFullYear(), now.getMonth() + 1)
  }))

  const data = useState<DashboardResponse | null>('dashboard-data', () => null)
  const pending = useState<boolean>('dashboard-pending', () => false)
  const error = useState<string | null>('dashboard-error', () => null)
  const inflightKey = useState<string | null>('dashboard-inflight', () => null)
  const requestSeq = useState<number>('dashboard-request-seq', () => 0)

  async function load(): Promise<void> {
    if (inflightKey.value === period.value.key) {
      return
    }

    // Already have fresh data for this period.
    if (data.value?.period.key === period.value.key && !error.value) {
      return
    }

    inflightKey.value = period.value.key
    pending.value = true
    error.value = null
    requestSeq.value += 1

    const current = requestSeq.value

    try {
      const [year, month] = period.value.key.split('-').map(Number) as [number, number]

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

      // Tiga request paralel di bawah satu guard sequencing: agregat
      // periode, target budget + actual spending server, dan transaksi
      // terbaru. Gagal satu = error state (tanpa data nol palsu).
      const [dashboardEnvelope, budgetsEnvelope, transactionsEnvelope] = await Promise.all([
        $fetch<{ success: boolean, data: LaravelDashboardPayload }>('/api/dashboard', {
          params: { month, year },
          credentials: 'include',
          headers
        }),
        $fetch<{ success: boolean, data: LaravelBudgetsPayload['data'], meta?: LaravelBudgetsPayload['meta'] }>('/api/budgets', {
          params: { month, year },
          credentials: 'include',
          headers
        }),
        $fetch<{ success: boolean, data: LaravelTransactionsPayload }>('/api/transactions', {
          params: { sort_by: 'occurred_on', sort_dir: 'desc', per_page: 5 },
          credentials: 'include',
          headers
        })
      ])

      if (current !== requestSeq.value) {
        return
      }

      // Server route meneruskan envelope Laravel apa adanya (pola
      // me.get.ts); unwrap di sini agar mapper menerima objek data.
      const base = mapDashboardResponse(dashboardEnvelope.data)
      const finance = mapDashboardFinance(
        base,
        { data: budgetsEnvelope.data, meta: budgetsEnvelope.meta },
        transactionsEnvelope.data,
        year,
        month
      )

      data.value = { ...base, ...finance }
    } catch (err) {
      if (current !== requestSeq.value) {
        return
      }

      error.value = readError(err, 'Data dashboard belum dapat dimuat.')
    } finally {
      if (current === requestSeq.value) {
        pending.value = false
        inflightKey.value = null
      }
    }
  }

  function setPeriod(next: DashboardPeriod): void {
    if (next.key === period.value.key) {
      return
    }

    period.value = next
    void load()
  }

  return { period, data, pending, error, load, setPeriod, periodOptions }
}
