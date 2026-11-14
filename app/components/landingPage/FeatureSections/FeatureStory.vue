<!-- eslint-disable @stylistic/indent -->
<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import { FeatureStoryItem } from './featureStories'
import { container, heading2, ledeText } from '~/components/landingPage/ui'

interface FeatureStoryItem {
  id: string
  title: string
  lede: string
  points: { label: string; text: string }[]
  note?: string
}

const activeIndex = ref(0)
const rows: HTMLElement[] = []
let observer: IntersectionObserver | null = null

const rowRef =
  (index: number) =>
  (el: Element | ComponentPublicInstance | null): void => {
    if (el instanceof HTMLElement) rows[index] = el
  }

// Satu sumber kebenaran untuk daftar fitur dan pratinjau: baris yang melewati
// pita tengah viewport menentukan indeks aktif. IntersectionObserver, bukan
// listener scroll, jadi tidak ada pembacaan layout tiap frame.
onMounted(() => {
  if (typeof IntersectionObserver === 'undefined') return

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const index = Number((entry.target as HTMLElement).dataset.index)
        if (!Number.isNaN(index)) activeIndex.value = index
      }
    },
    { rootMargin: '-40% 0px -40% 0px', threshold: 0 }
  )

  rows.forEach((row) => observer?.observe(row))
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
</script>

<template>
  <section :class="[container, 'pt-[clamp(90px,4vw,48px)]']" data-feature-story>
    <div
      class="grid grid-cols-1 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-[clamp(40px,6vw,80px)]"
    >
      <div>
        <div
          v-for="(feature, index) in FeatureStoryItem"
          :id="feature.id"
          :key="feature.id"
          :ref="rowRef(index)"
          :data-index="index"
          data-feature-row
          class="scroll-mt-24 border-t border-rule py-10 first:border-t-0 first:pt-0 lg:flex lg:min-h-[70vh] lg:flex-col lg:justify-center lg:border-t-0 lg:border-l lg:py-12 lg:pl-6"
          :class="index === activeIndex ? 'lg:border-primary' : 'lg:border-rule'"
          :aria-current="index === activeIndex ? 'true' : undefined"
        >
          <div
            v-scroll-reveal="{ threshold: 0.05 }"
            class="flex flex-col gap-4 lp-scroll-reveal lp-feature-reveal"
          >
            <div>
              <p
                class="m-0 text-xs font-semibold tracking-[0.12em] tabular-nums transition-colors duration-200 ease-out"
                :class="index === activeIndex ? 'text-primary' : 'text-muted-foreground'"
              >
                0{{ index + 1 }}
              </p>
              <h2
                :class="[
                  heading2,
                  'mt-2 transition-colors duration-200 ease-out',
                  index === activeIndex ? 'lg:text-foreground' : 'lg:text-muted-foreground'
                ]"
              >
                {{ feature.title }}
              </h2>
              <p :class="[ledeText, 'mt-3']">{{ feature.lede }}</p>
            </div>

            <ul class="m-0 flex list-none flex-col border-t border-border p-0">
              <li
                v-for="point in feature.points"
                :key="point.label"
                class="grid grid-cols-[20px_minmax(0,1fr)] gap-3 border-b border-rule py-3"
              >
                <UIcon
                  name="i-lucide-check"
                  class="mt-0.5 size-4 text-primary"
                  aria-hidden="true"
                />
                <div>
                  <strong class="block text-[0.9375rem] font-semibold">{{ point.label }}</strong>
                  <span
                    class="mt-px block text-sm leading-[1.45] text-muted-foreground text-pretty"
                    >{{ point.text }}</span
                  >
                </div>
              </li>
            </ul>

            <p
              v-if="feature.note"
              class="m-0 border-t border-rule pt-3 text-[0.8125rem] leading-normal text-muted-foreground text-pretty"
            >
              {{ feature.note }}
            </p>
          </div>

          <!-- Mobile: pratinjau mengikuti urutan baca, tanpa panel sticky. -->
          <div
            v-scroll-reveal="{ threshold: 0.1 }"
            class="mt-7 lp-scroll-reveal lp-feature-reveal lg:hidden"
            data-feature-preview-inline
          >
            <slot :name="`preview-${feature.id}`" />
          </div>
        </div>
      </div>

      <!-- Desktop: satu pratinjau sticky, diganti oleh fitur yang aktif. -->
      <div class="hidden lg:block justify-center items-center">
        <div class="lg:sticky lg:top-32 lp-feature-stage justify-center items-center">
          <div class="grid justify-center items-center">
            <div
              v-for="(feature, index) in FeatureStoryItem"
              :key="feature.id"
              class="col-start-1 row-start-1 transition-[opacity,translate] duration-300 ease-out-expo motion-reduce:transition-opacity justify-center items-center"
              data-feature-preview
              :class="
                index === activeIndex
                  ? 'translate-y-0 opacity-100'
                  : 'pointer-events-none translate-y-2 opacity-0 motion-reduce:translate-y-0'
              "
              :aria-hidden="index !== activeIndex"
              :inert="index !== activeIndex || undefined"
            >
              <slot :name="`preview-${feature.id}`" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
