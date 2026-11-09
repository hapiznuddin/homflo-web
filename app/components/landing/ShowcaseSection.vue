<script setup lang="ts">
import { container, heading2, ledeText } from '~/components/landing/ui'

withDefaults(
  defineProps<{
    id: string
    title: string
    lede: string
    points: { label: string; text: string }[]
    reverse?: boolean
    tone?: 'soft' | 'plain'
  }>(),
  { tone: 'soft' }
)
</script>

<template>
  <section :id="id" class="scroll-mt-20 py-[clamp(24px,3.5vw,48px)]">
    <div :class="container">
      <div
        class="grid grid-cols-1 items-center gap-8 rounded-[32px] p-[clamp(20px,4vw,48px)] lg:grid-cols-2 lg:gap-[clamp(40px,6vw,72px)]"
        :class="tone === 'soft' ? 'landing-panel-glow border border-rule bg-soft' : ''"
      >
        <div class="min-w-0" :class="reverse ? 'order-2 lg:order-1' : 'order-2 lg:order-2'">
          <slot name="visual" />
        </div>

        <div
          class="flex min-w-0 flex-col gap-[18px]"
          :class="reverse ? 'order-1 lg:order-2' : 'order-1 lg:order-1'"
        >
          <h2 :class="heading2">{{ title }}</h2>
          <p :class="ledeText">{{ lede }}</p>
          <ul class="m-0 flex list-none flex-col border-t border-border p-0">
            <li
              v-for="point in points"
              :key="point.label"
              class="grid grid-cols-[20px_minmax(0,1fr)] gap-3 border-b border-rule py-[13px]"
            >
              <UIcon name="i-lucide-check" class="mt-0.5 size-4 text-primary" aria-hidden="true" />
              <div>
                <strong class="block text-[0.9375rem] font-semibold">{{ point.label }}</strong>
                <span
                  class="mt-px block text-sm leading-[1.45] text-muted-foreground text-pretty"
                  >{{ point.text }}</span
                >
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>
