<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const auth = useAuth()

const items: NavigationMenuItem[][] = [
  [
    {
      label: 'Dashboard',
      icon: 'i-lucide-layout-dashboard',
      to: '/dashboard'
    },
    {
      label: 'Uang',
      icon: 'i-lucide-circle-dollar-sign',
      disabled: true
    },
    {
      label: 'Daftar',
      icon: 'i-lucide-list',
      disabled: true
    }
  ],
  [
    {
      label: 'Beranda',
      icon: 'i-lucide-house',
      disabled: true
    },
    {
      label: 'Kendaraan',
      icon: 'i-lucide-car',
      disabled: true
    }
  ],
  [
    {
      label: 'Pengaturan',
      icon: 'i-lucide-settings',
      disabled: true
    },
    {
      label: 'Akun',
      icon: 'i-lucide-user',
      to: '/account'
    }
  ]
]

const userInitial = computed(() => auth.user.value?.name.charAt(0).toUpperCase() ?? '?')

async function onLogout(): Promise<void> {
  await auth.logout()
  await navigateTo('/login')
}
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar
      collapsible
      resizable
      class="hidden md:flex"
      :ui="{ footer: 'border-t border-default' }"
    >
      <template #header="{ collapsed }">
        <span v-if="!collapsed" class="text-base font-bold">Homflo</span>
        <UIcon v-else name="i-lucide-house" class="mx-auto size-5 text-primary" />
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="items[0]"
          orientation="vertical"
        />
        <p v-if="!collapsed" class="mt-4 mb-1 px-2 text-xs font-medium text-muted uppercase">
          Rumah Tangga
        </p>
        <UNavigationMenu
          :collapsed="collapsed"
          :items="items[1]"
          orientation="vertical"
        />
        <p v-if="!collapsed" class="mt-4 mb-1 px-2 text-xs font-medium text-muted uppercase">
          Sistem
        </p>
        <UNavigationMenu
          :collapsed="collapsed"
          :items="items[2]"
          orientation="vertical"
        />
      </template>

      <template #footer="{ collapsed }">
        <div class="flex flex-col gap-2">
          <div v-if="!collapsed" class="flex items-center gap-2 px-2 py-1">
            <UAvatar :text="userInitial" size="sm" :alt="auth.user.value?.name ?? 'Pengguna'" />
            <div class="min-w-0 flex-1 leading-tight">
              <p class="truncate text-sm font-medium">{{ auth.user.value?.name ?? '-' }}</p>
              <p class="truncate text-xs text-muted">{{ auth.household.value?.role ?? '-' }}</p>
            </div>
          </div>
          <div v-if="!collapsed" class="flex items-center justify-between px-2 py-1 text-sm">
            <span>Tema gelap</span>
            <ThemeSwitch />
          </div>
          <UButton
            :label="collapsed ? undefined : 'Keluar'"
            icon="i-lucide-log-out"
            color="neutral"
            variant="ghost"
            :block="!collapsed"
            :square="collapsed"
            @click="onLogout()"
          />
        </div>
      </template>
    </UDashboardSidebar>

    <UDashboardPanel>
      <template #header>
        <UDashboardNavbar title="Homflo">
          <template #leading>
            <UDashboardSidebarCollapse class="md:hidden" />
          </template>

          <template #right>
            <ThemeSwitch />
            <UAvatar :text="userInitial" size="sm" :alt="auth.user.value?.name ?? 'Pengguna'" />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div class="mx-auto w-full max-w-2xl px-4 pb-28 pt-4 md:pb-10 lg:max-w-5xl">
          <slot />
        </div>
      </template>
    </UDashboardPanel>

    <PwaInstallBanner />
    <PwaUpdatePrompt />

    <nav
      aria-label="Navigasi utama"
      class="fixed inset-x-0 bottom-0 z-10 border-t border-default bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
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
  </UDashboardGroup>
</template>
