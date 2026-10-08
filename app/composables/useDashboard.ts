import type {
  DashboardBudgetCategory,
  DashboardMaintenance,
  DashboardPeriod,
  DashboardResponse,
  DashboardTransaction,
  DashboardUpcomingBill
} from '~/types/dashboard'
import { formatFullDate, formatMonthLabel, formatShortDate } from '~/utils/format'

// ---------------------------------------------------------------------------
// Fixture data (temporary). The backend dashboard API does not exist yet, so
// this file holds clearly isolated, typed fixture data shaped exactly like
// the future GET /api/dashboard response. Replace `loadFixture` with a real
// API call when the endpoint lands; components must not change.
// ---------------------------------------------------------------------------

function hashSeed(key: string): number {
  let hash = 0

  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  }

  return hash
}

function mulberry(seed: number): () => number {
  let state = seed

  return () => {
    state |= 0
    state = (state + 0x6D2B79F5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const BILL_DEFS = [
  { title: 'Internet', icon: 'i-lucide-wifi' },
  { title: 'Air PAM', icon: 'i-lucide-droplets' },
  { title: 'Perawatan AC', icon: 'i-lucide-air-vent' },
  { title: 'Listrik Pascabayar', icon: 'i-lucide-zap' }
] as const

const TX_DEFS = [
  { title: 'Belanja Supermarket', icon: 'i-lucide-shopping-cart', wallet: 'Rekening BCA Utama' },
  { title: 'Token Listrik', icon: 'i-lucide-zap', wallet: 'Dompet Jago' },
  { title: 'Service Motor Honda Vario', icon: 'i-lucide-wrench', wallet: 'Kas Tunai' },
  { title: 'Freelance Consultation', icon: 'i-lucide-briefcase', wallet: 'Rekening Mandiri' },
  { title: 'Isi Galon', icon: 'i-lucide-droplet', wallet: 'Dompet Jago' }
] as const

const MAINTENANCE_DEFS = [
  { title: 'Cuci & Service AC Master', priority: 'tinggi', location: 'Kamar Utama' },
  { title: 'Ganti Oli & Servis Berkala', priority: 'sedang', location: 'Honda HR-V' },
  { title: 'Kuras & Sterilisasi Toren', priority: 'rutin', location: 'Toren Atas' }
] as const

function buildFixture(periodKey: string, year: number, month: number): DashboardResponse {
  const rand = mulberry(hashSeed(periodKey))
  const daysInMonth = new Date(year, month, 0).getDate()

  const income = 12000000 + Math.floor(rand() * 6000000)
  const expense = 6500000 + Math.floor(rand() * 4000000)

  const bills: DashboardUpcomingBill[] = BILL_DEFS.slice(0, 3).map((def, index) => {
    const day = Math.min(daysInMonth, 2 + index * 9 + Math.floor(rand() * 5))

    return {
      id: `bill-${periodKey}-${index}`,
      title: def.title,
      icon: def.icon,
      dueLabel: `Jatuh tempo ${formatShortDate(new Date(year, month - 1, day))}`,
      amount: [416250, 135000, 850000, 502500][index] ?? 200000,
      urgent: index === 0
    }
  })

  const transactions: DashboardTransaction[] = TX_DEFS.map((def, index) => {
    const isIncome = index === 3
    const day = Math.max(1, daysInMonth - 2 - index * 3)

    return {
      id: `tx-${periodKey}-${index}`,
      title: def.title,
      icon: def.icon,
      dateLabel: formatFullDate(new Date(year, month - 1, day)),
      wallet: def.wallet,
      amount: [685000, 502500, 220000, 3500000, 78000][index] ?? 100000,
      direction: isIncome ? 'in' : 'out'
    }
  })

  const maintenance: DashboardMaintenance[] = MAINTENANCE_DEFS.map((def, index) => {
    const day = Math.min(daysInMonth, 3 + index * 8 + Math.floor(rand() * 4))

    return {
      id: `mnt-${periodKey}-${index}`,
      title: def.title,
      priority: def.priority as DashboardMaintenance['priority'],
      dateLabel: formatShortDate(new Date(year, month - 1, day)),
      location: def.location
    }
  })

  const categories: Array<Omit<DashboardBudgetCategory, 'percent' | 'status' | 'note'>> = [
    { id: 'kebutuhan', name: 'Kebutuhan Rumah', icon: 'i-lucide-shopping-basket', spent: 4200000, budget: 5000000 },
    { id: 'tagihan', name: 'Tagihan & Utilitas', icon: 'i-lucide-receipt', spent: 2850000, budget: 3000000 },
    { id: 'perawatan', name: 'Perawatan Rumah', icon: 'i-lucide-house-plus', spent: 1250000, budget: 2000000 },
    { id: 'kendaraan', name: 'Operasional Kendaraan', icon: 'i-lucide-car', spent: 980000, budget: 1500000 }
  ]

  const budget: DashboardBudgetCategory[] = categories.map((category) => {
    const percent = Math.round((category.spent / category.budget) * 100)
    const status = percent >= 100 ? 'over' : percent >= 90 ? 'near-limit' : percent >= 70 ? 'warning' : 'normal'

    return {
      ...category,
      percent,
      status,
      note: percent >= 90 && percent < 100 ? 'Mendekati limit' : undefined
    }
  })

  const netCashFlow = income - expense

  return {
    period: { key: periodKey, label: formatMonthLabel(year, month) },
    financial: {
      income,
      expense,
      netCashFlow,
      incomeChangePercent: 8 + Math.floor(rand() * 9),
      budgetUsagePercent: Math.round((expense / 12500000) * 100),
      cashFlowStatus: netCashFlow > 0 ? 'surplus' : netCashFlow < 0 ? 'defisit' : 'seimbang'
    },
    budget,
    upcomingBills: bills,
    recentTransactions: transactions,
    maintenance
  }
}

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

    try {
      // Replace with: await $fetch<DashboardResponse>(`/api/dashboard?period=${period.value.key}`)
      await new Promise(resolve => setTimeout(resolve, 350))

      const [year, month] = period.value.key.split('-').map(Number) as [number, number]
      data.value = buildFixture(period.value.key, year, month)
    } catch {
      error.value = 'Data dashboard belum dapat dimuat.'
    } finally {
      pending.value = false
      inflightKey.value = null
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
