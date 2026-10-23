<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import MobileNavbar from '~/components/MobileNavbar.vue'

const auth = useAuth()

const sidebarMobileWidth = 'w-56 max-w-[72vw]'

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
      to: '/transactions'
    },
    {
      label: 'Kategori',
      icon: 'i-lucide-tags',
      to: '/categories'
    },
    {
      label: 'Anggaran',
      icon: 'i-lucide-wallet',
      to: '/budgets'
    },
    {
      label: 'Tagihan',
      icon: 'i-lucide-receipt',
      to: '/bills'
    },
    {
      label: 'Daftar',
      icon: 'i-lucide-list'
    }
  ],
  [
    {
      label: 'Aset',
      icon: 'i-lucide-package',
      to: '/assets'
    },
    {
      label: 'Perawatan',
      icon: 'i-lucide-wrench',
      to: '/maintenance'
    },
    {
      label: 'Beranda',
      icon: 'i-lucide-house',
      disabled: true
    },
    {
      label: 'Kendaraan',
      icon: 'i-lucide-car',
      to: '/vehicles'
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
  const color = pastelColors[sum % pastelColors.length]!
  return color
})
</script>

<template>
  <div>
    <UDashboardGroup>
    <UDashboardSidebar
      collapsible
      resizable
      class="hidden lg:flex"
      open
      toggle-side="right"
      :ui="{ content: sidebarMobileWidth }"
    >
      <template #header="{ collapsed }">
        <div class="lg:w-full">
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
        <UNavigationMenu
          :collapsed="collapsed"
          :items="items[0]"
          orientation="vertical"
          :ui="{
            link: 'rounded-full before:rounded-full text-stone-500 hover:before:bg-accent dark:text-stone-400 dark:hover:before:bg-accent data-active:bg-accent/30 data-active:text-primary dark:data-active:text-primary-dark'
          }"
        />
        <p v-if="!collapsed" class="mt-2 px-2 text-xs font-medium text-muted uppercase">
          Rumah Tangga
        </p>
        <UNavigationMenu
          :collapsed="collapsed"
          :items="items[1]"
          orientation="vertical"
          :ui="{
            link: 'rounded-full before:rounded-full text-stone-500 hover:before:bg-accent dark:text-stone-400 dark:hover:before:bg-accent data-active:bg-accent/30 data-active:text-primary dark:data-active:text-primary-dark'
          }"
        />
        <p v-if="!collapsed" class="mt-2 px-2 text-xs font-medium text-muted uppercase">Sistem</p>
        <UNavigationMenu
          :collapsed="collapsed"
          :items="items[2]"
          orientation="vertical"
          :ui="{
            link: 'rounded-full before:rounded-full text-stone-500 hover:before:bg-accent dark:text-stone-400 dark:hover:before:bg-accent data-active:bg-accent/30 data-active:text-primary dark:data-active:text-primary-dark'
          }"
        />
      </template>

      <template #footer="{ collapsed }">
        <div class="flex flex-col gap-6 my-4 w-full">
          <div
            v-if="!collapsed"
            class="flex items-center bg-stone-200/30 p-1 rounded-xl dark:bg-stone-700/50"
          >
            <div class="flex items-center gap-2 px-2 py-1">
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
        <UDashboardNavbar
          :toggle="{
            color: 'neutral',
            variant: 'subtle',
            class: 'rounded-xl'
          }"
        >
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
    </UDashboardGroup>

    <MobileNavbar />
  </div>
</template>
