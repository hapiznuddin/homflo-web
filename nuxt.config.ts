// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxt/a11y', '@vite-pwa/nuxt'],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      apiBase: import.meta.env.NUXT_API_BASE
    }
  },

  routeRules: {
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
  }
})
