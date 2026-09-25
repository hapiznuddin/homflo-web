<template>
  <div class="min-h-dvh bg-slate-50 text-slate-900">
    <header
      class="sticky top-0 z-10 border-b border-slate-200 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur"
    >
      <div class="mx-auto flex h-14 w-full max-w-2xl items-center justify-between px-4">
        <NuxtLink to="/dashboard" class="text-base font-bold"> Homflo </NuxtLink>
        <nav class="hidden items-center gap-4 md:flex" aria-label="Utama">
          <NuxtLink to="/dashboard" class="rounded-md px-2 py-2 text-sm"> Beranda </NuxtLink>
          <NuxtLink to="/account" class="rounded-md px-2 py-2 text-sm"> Akun </NuxtLink>
        </nav>
      </div>
    </header>

    <main class="mx-auto w-full max-w-2xl px-4 pb-28 pt-4 md:pb-10">
      <slot />
    </main>

    <PwaInstallBanner />
    <PwaUpdatePrompt />

    <nav
      aria-label="Navigasi utama"
      class="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div class="mx-auto grid w-full max-w-2xl grid-cols-2">
        <NuxtLink
          to="/dashboard"
          class="flex min-h-16 flex-col items-center justify-center gap-1 text-xs"
        >
          <UIcon name="i-lucide-house" class="size-6" aria-hidden="true" />
          Beranda
        </NuxtLink>
        <NuxtLink
          to="/account"
          class="flex min-h-16 flex-col items-center justify-center gap-1 text-xs"
        >
          <UIcon name="i-lucide-user" class="size-6" aria-hidden="true" />
          Akun
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>
