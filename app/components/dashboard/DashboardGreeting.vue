<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { DashboardPeriod } from '~/types/dashboard'
import { greetingForHour } from '~/utils/format'

interface Props {
  userName: string
  periods: DashboardPeriod[]
  currentKey: string
}

const props = defineProps<Props>()
const emit = defineEmits<{ select: [period: DashboardPeriod] }>()

const greeting = computed(() => `${greetingForHour(new Date().getHours())}, ${props.userName.split(' ')[0]}`)

const periodItems = computed<DropdownMenuItem[][]>(() => [
  props.periods.map(period => ({
    label: period.label,
    icon: period.key === props.currentKey ? 'i-lucide-check' : undefined,
    onSelect: () => emit('select', period)
  }))
])

const currentLabel = computed(
  () => props.periods.find(period => period.key === props.currentKey)?.label ?? ''
)
</script>

<template>
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div class="min-w-0">
      <h1 class="truncate text-xl font-bold tracking-tight text-highlighted sm:text-2xl">
        {{ greeting }}
      </h1>
      <p class="mt-0.5 text-sm text-muted">Kelola rumah tangga dalam satu tempat.</p>
    </div>
    <div class="flex shrink-0 items-center gap-2">
      <UDropdownMenu :items="periodItems">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-calendar"
          :label="currentLabel"
          trailing-icon="i-lucide-chevron-down"
          aria-label="Pilih periode"
        />
      </UDropdownMenu>
      <UButton
        color="neutral"
        variant="outline"
        square
        icon="i-lucide-bell"
        aria-label="Notifikasi"
      />
    </div>
  </div>
</template>
