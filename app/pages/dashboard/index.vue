<script setup lang="ts">
import { formatRupiah } from '~/utils/format'

definePageMeta({ middleware: ['auth', 'onboarding'] })

const auth = useAuth()
const { user, household } = auth
const { period, data, pending, error, load, setPeriod, periodOptions } = useDashboard()

await load()
const firstName = computed(() => user.value?.name.split(' ')[0] ?? 'Keluarga')
const householdName = computed(() => household.value?.name ?? '')

function retry(): void {
  void load()
}
</script>

<template>
  <div class="flex flex-col gap-4 sm:gap-5 w-full">
    <div v-if="pending && !data" class="flex flex-col gap-4" aria-label="Memuat dashboard">
      <USkeleton class="h-16 w-2/3" />
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <USkeleton v-for="index in 3" :key="index" class="h-28" />
      </div>
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <USkeleton class="h-64 lg:col-span-2" />
        <USkeleton class="h-64" />
      </div>
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      title="Data dashboard belum dapat dimuat."
      :description="error"
      :actions="[{ label: 'Coba lagi', onClick: retry }]"
    />

    <template v-else-if="data">
      <DashboardGreeting
        :user-name="firstName"
        :household-name="householdName"
        :periods="periodOptions()"
        :current-key="period.key"
        @select="setPeriod"
      />

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <DashboardKpiCard
          title="Pendapatan Bulan Ini"
          :value="data.availability.income ? formatRupiah(data.financial.income) : '—'"
          :subtitle="data.availability.income ? `Bulan ${data.period.label}` : 'Belum tersedia'"
          icon="i-lucide-trending-up"
          :tone="data.availability.income ? 'positive' : 'neutral'"
        />
        <DashboardKpiCard
          title="Pengeluaran Bulan Ini"
          :value="data.availability.expense ? formatRupiah(data.financial.expense) : '—'"
          :subtitle="data.availability.expense ? `Bulan ${data.period.label}` : 'Belum tersedia'"
          icon="i-lucide-trending-down"
        />
        <DashboardKpiCard
          title="Arus Kas Bersih"
          :value="data.availability.netCashFlow ? formatRupiah(data.financial.netCashFlow, true) : '—'"
          :subtitle="data.availability.netCashFlow ? (data.financial.cashFlowStatus === 'surplus' ? 'Surplus bulan ini' : 'Perlu perhatian bulan ini') : 'Belum tersedia'"
          icon="i-lucide-wallet"
          :tone="data.availability.netCashFlow ? (data.financial.cashFlowStatus === 'surplus' ? 'positive' : 'negative') : 'neutral'"
        />
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DashboardBudget :categories="data.budget" class="lg:col-span-2" />
        <DashboardUpcomingBills
          :bills="data.upcomingBills"
          :unsupported="data.unsupportedDomains.includes('bills')"
        />
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DashboardRecentTransactions :transactions="data.recentTransactions" class="lg:col-span-2" />
        <DashboardMaintenance
          :items="data.maintenance"
          :unsupported="data.unsupportedDomains.includes('maintenance')"
        />
      </div>

      <DashboardQuickActions />
    </template>
  </div>
</template>
