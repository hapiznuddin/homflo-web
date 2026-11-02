<script setup lang="ts">
import type { ThemePreference } from '~/types/preferences'
import { THEME_OPTIONS } from '~/types/preferences'

definePageMeta({ middleware: ['auth', 'onboarding'] })

const preferences = usePreferences()
const toast = useToast()
const { theme, pending, submitting, error, loaded, load, update } = preferences

async function retry(): Promise<void> {
  await load(true)
}

async function selectTheme(next: ThemePreference): Promise<void> {
  if (next === theme.value || submitting.value) {
    return
  }

  if (await update(next)) {
    toast.add({ title: 'Preferensi tema disimpan', color: 'success' })
  }
}

await load()
</script>

<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-5">
    <div>
      <UButton to="/settings" color="neutral" variant="link" icon="i-lucide-arrow-left" class="-ml-2">Pengaturan</UButton>
      <h1 class="mt-2 text-xl font-bold tracking-tight text-highlighted sm:text-2xl">Preferensi Aplikasi</h1>
      <p class="mt-1 text-sm text-muted">Preferensi ini berlaku untuk akun Anda, bukan untuk rumah tangga tertentu.</p>
    </div>

    <div v-if="pending && !loaded" class="flex flex-col gap-3" aria-label="Memuat preferensi">
      <USkeleton class="h-28" />
    </div>

    <UAlert
      v-else-if="error && !loaded"
      color="error"
      variant="soft"
      title="Preferensi belum dapat dimuat."
      :description="error"
      :actions="[{ label: 'Coba lagi', onClick: retry }]"
    />

    <template v-else>
      <section
        class="rounded-2xl border border-default bg-background p-4"
        aria-labelledby="theme-heading"
        :aria-busy="submitting"
      >
        <h2 id="theme-heading" class="text-sm font-semibold text-highlighted">Tema</h2>
        <p class="mt-1 text-xs text-muted">
          Tema disimpan di akun Anda dan diterapkan pada semua perangkat setelah masuk.
        </p>

        <div class="mt-4 flex flex-col gap-2" role="group" aria-label="Pilihan tema">
          <button
            v-for="option in THEME_OPTIONS"
            :key="option.value"
            type="button"
            class="flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-75"
            :class="theme === option.value
              ? 'border-primary bg-primary/10'
              : 'border-default bg-background hover:bg-elevated'"
            :aria-pressed="theme === option.value"
            :disabled="submitting"
            @click="selectTheme(option.value)"
          >
            <span
              class="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border"
              :class="theme === option.value ? 'border-primary' : 'border-muted'"
              aria-hidden="true"
            >
              <span v-if="theme === option.value" class="size-2 rounded-full bg-primary" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-medium text-highlighted">{{ option.label }}</span>
              <span class="mt-0.5 block text-xs text-muted">{{ option.description }}</span>
            </span>
          </button>
        </div>
      </section>

      <UAlert
        v-if="error && loaded"
        color="error"
        variant="soft"
        title="Aksi terakhir gagal."
        :description="error"
        :actions="[{ label: 'Coba lagi', onClick: retry }]"
      />
    </template>
  </div>
</template>
