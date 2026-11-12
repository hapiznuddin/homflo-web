<script setup lang="ts">
import { domains } from './domain'
</script>

<template>
  <nav
    class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12"
    aria-label="Area produk Homflo"
  >
    <a
      v-for="(domain, index) in domains"
      :key="domain.href"
      v-scroll-reveal="{ delay: Math.min(index * 70, 280) }"
      :href="domain.href"
      class="group flex flex-col rounded-2xl border p-5 text-inherit no-underline transition-[background-color,border-color,color] duration-180 ease-out hover:border-primary/40 focus-ring sm:p-6 lp-scroll-reveal-child"
      :class="
        domain.featured
          ? 'border-rule bg-soft sm:col-span-2 lg:col-span-6'
          : 'border-border bg-card hover:bg-soft lg:col-span-3'
      "
    >
      <div class="flex items-start justify-between gap-3">
        <span
          class="inline-flex size-10 shrink-0 items-center justify-center rounded-xl"
          :class="domain.featured ? 'bg-primary text-primary-foreground' : 'bg-soft text-primary'"
          aria-hidden="true"
        >
          <UIcon :name="domain.icon" class="size-5" />
        </span>
        <UIcon
          name="i-lucide-arrow-up-right"
          class="size-4 shrink-0 text-muted-foreground transition-[color,transform] duration-180 ease-out group-hover:-translate-y-0.5 group-hover:text-primary"
          aria-hidden="true"
        />
      </div>

      <div class="mt-4 min-w-0">
        <p class="m-0 text-[1.0625rem] font-semibold leading-[1.3] tracking-[-0.02em]">
          {{ domain.name }}
        </p>
        <p class="mt-1 mb-0 max-w-[42ch] text-sm leading-normal text-muted-foreground text-pretty">
          {{ domain.desc }}
        </p>
      </div>

      <div v-if="domain.items?.length" class="mt-auto flex flex-wrap gap-1.5 pt-5">
        <span
          v-for="item in domain.items"
          :key="item"
          class="rounded-full border border-rule bg-background/70 px-2.5 py-1 text-xs leading-[1.35] text-muted-foreground"
          >{{ item }}</span
        >
      </div>
    </a>
  </nav>
</template>
