<script setup lang="ts">
interface Props {
  title: string
  value: string
  subtitle: string
  icon: string
  tone?: 'neutral' | 'positive' | 'negative'
}

withDefaults(defineProps<Props>(), { tone: 'neutral' })
</script>

<template>
  <UCard :ui="{ body: 'p-4 sm:p-5' }">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="truncate text-sm text-muted">{{ title }}</p>
        <p class="mt-1 truncate text-xl font-bold tracking-tight text-highlighted sm:text-2xl">
          {{ value }}
        </p>
        <p
          class="mt-1 text-xs"
          :class="tone === 'positive' ? 'text-success' : tone === 'negative' ? 'text-destructive' : 'text-muted'"
        >
          {{ subtitle }}
        </p>
      </div>
      <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-elevated" aria-hidden="true">
        <UIcon :name="icon" class="size-5 text-default" />
      </span>
    </div>
  </UCard>
</template>
