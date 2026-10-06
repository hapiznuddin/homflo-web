// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/a11y',
    '@vite-pwa/nuxt',
    'shadcn-nuxt',
    '@nuxt/image'
  ],

  // shadcn component folders keep `index.ts` files for local exports and
  // variant utilities. They are not Vue components, so exclude them from
  // Nuxt's component auto-import scan to prevent name collisions with the
  // sibling `.vue` files (for example `ui/button/index.ts` and `Button.vue`).
  components: [
    {
      path: '~/components',
      ignore: ['**/index.ts']
    }
  ],

  // DevTools menambah overhead client+server yang signifikan.
  // Nyalakan lagi hanya saat debugging: NUXT_DEVTOOLS=1 pnpm dev
  devtools: {
    enabled: import.meta.env.NUXT_DEVTOOLS === '1'
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      apiBase: import.meta.env.NUXT_API_BASE
    }
  },

  // Prerender '/' hanya saat build. Di dev, aturan ini memaksa Nitro
  // me-rebuild (~4 detik) setiap ada perubahan file.
  routeRules: import.meta.env.NODE_ENV === 'development'
    ? {}
    : {
        '/': { prerender: true }
      },

  compatibilityDate: '2026-06-30',

  a11y: {
    enabled: true,
    logIssues: true
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  pwa: {
    registerType: 'prompt',
    manifest: {
      name: 'Homflo',
      short_name: 'Homflo',
      description: 'Kelola keuangan rumah tangga dan pribadi.',
      display: 'standalone',
      start_url: '/',
      theme_color: '#00A155',
      background_color: '#ffffff',
      icons: [
        {
          src: 'pwa-icon.svg',
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'any'
        }
      ]
    },
    workbox: {
      // Auth and session traffic must always hit the network. Never serve
      // a cached /api response and never cache session cookies.
      runtimeCaching: [
        {
          urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
          handler: 'NetworkOnly'
        }
      ]
    }
  },

  shadcn: {
    /**
     * Prefix for all the imported component
     */
    prefix: '',
    /**
     * Directory that the component lives in.
     * @default "./components/ui"
     */
    componentDir: '@/components/ui'
  }
})
