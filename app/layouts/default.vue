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

const logoSet = computed(() => ({
  expanded: [
    { src: '/img/homflo-light-horizontal.webp', class: 'dark:hidden' },
    { src: '/img/homflo-dark-horizontal.webp', class: 'hidden dark:block' }
  ],
  collapsed: [
    { src: '/img/homflo-light-icon.webp', class: 'dark:hidden' },
    { src: '/img/homflo-dark-icon.webp', class: 'hidden dark:block' }
  ]
}))

const pastelColors = [
  { bg: '#FDE7F3', text: '#9D174D' },
  { bg: '#E0F2FE', text: '#1D4ED8' },
  { bg: '#DCFCE7', text: '#166534' },
  { bg: '#FEF3C7', text: '#92400E' },
  { bg: '#F3E8FF', text: '#6B21A8' },
  { bg: '#E0F7FA', text: '#0F766E' }
]

const avatarTheme = computed(() => {
  const name = auth.user.value?.name ?? 'Pengguna'
  const sum = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  const color = pastelColors[sum % pastelColors.length]
  return color
})
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar
      collapsible
      resizable
      class="hidden lg:flex"
      :ui="{ footer: 'border-t border-default' }"
    >
      <template #header="{ collapsed }">
        <div class="flex items-center justify-center w-full">
          <NuxtImg
            v-for="(logo, index) in collapsed ? logoSet.collapsed : logoSet.expanded"
            :key="index"
            :src="logo.src"
            alt="Homflo Logo"
            width="100%"
            height="100%"
            :class="['mx-auto w-full max-w-30', logo.class]"
          />
        </div>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu :collapsed="collapsed" :items="items[0]" orientation="vertical" />
        <p v-if="!collapsed" class="mt-2 px-2 text-xs font-medium text-muted uppercase">
          Rumah Tangga
        </p>
        <UNavigationMenu :collapsed="collapsed" :items="items[1]" orientation="vertical" />
        <p v-if="!collapsed" class="mt-2 px-2 text-xs font-medium text-muted uppercase">Sistem</p>
        <UNavigationMenu :collapsed="collapsed" :items="items[2]" orientation="vertical" />
      </template>

      <template #footer="{ collapsed }">
        <div class="flex flex-col gap-6 my-4 w-full">
          <div v-if="!collapsed" class="flex items-center gap-2 px-2 py-1">
            <UAvatar
              :text="userInitial"
              size="md"
              :alt="auth.user.value?.name ?? 'Pengguna'"
              :style="{
                backgroundColor: avatarTheme.bg,
                color: avatarTheme.text,
                border: '1px solid rgba(0,0,0,0.04)'
              }"
              class="font-semibold"
            />
            <div class="min-w-0 flex-1 leading-tight">
              <p class="truncate text-sm font-medium">{{ auth.user.value?.name ?? '-' }}</p>
              <p class="truncate text-xs text-muted">{{ auth.household.value?.role ?? '-' }}</p>
            </div>
          </div>
          <div v-if="collapsed" class="flex items-center justify-center">
            <UAvatar
              :text="userInitial"
              size="md"
              :alt="auth.user.value?.name ?? 'Pengguna'"
              :style="{
                backgroundColor: avatarTheme.bg,
                color: avatarTheme.text,
                border: '1px solid rgba(0,0,0,0.04)'
              }"
              class="font-semibold"
            />
          </div>
          <!-- <div v-if="!collapsed" class="flex items-center justify-between px-2 py-1 text-sm">
            <ThemeSwitch />
          </div> -->
          <UButton
            :label="collapsed ? undefined : 'Keluar'"
            icon="i-lucide-log-out"
            variant="ghost"
            :block="!collapsed"
            :square="collapsed"
            class="justify-start dark:text-white"
            @click="onLogout()"
          />
        </div>
      </template>
    </UDashboardSidebar>

    <UDashboardPanel>
      <template #header>
        <UDashboardNavbar>
          <template #leading>
            <UDashboardSidebarCollapse class="md:hidden" />
          </template>

          <template #right>
            <div class="flex items-center gap-4">
              <ThemeSwitch />
              <UAvatar
                :text="userInitial"
                size="md"
                :alt="auth.user.value?.name ?? 'Pengguna'"
                :style="{
                  backgroundColor: avatarTheme.bg,
                  color: avatarTheme.text,
                  border: '1px solid rgba(0,0,0,0.04)'
                }"
                class="font-semibold"
              />
            </div>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div class="mx-auto w-full pb-28 pt-2 md:pb-20 lg:pb-10">
          <slot />
        </div>
      </template>
    </UDashboardPanel>

    <PwaInstallBanner />
    <PwaUpdatePrompt />

    <nav
      aria-label="Navigasi utama"
      class="fixed inset-x-0 bottom-0 z-10 border-t border-default bg-background pb-[env(safe-area-inset-bottom)] lg:hidden"
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
