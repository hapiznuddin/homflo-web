import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// nuxt.config.ts memanggil global `defineNuxtConfig` yang biasanya disuntik
// oleh Nuxt. Shim minimal agar konfigurasi bisa diimpor di environment
// node murni tanpa memuat Nuxt runtime.
const globalScope = globalThis as { defineNuxtConfig?: <T>(config: T) => T }

globalScope.defineNuxtConfig ??= config => config

// Kontrak struktural PWA yang diverifikasi test ini. Konfigurasi asli tetap
// di-typecheck oleh project Nuxt (tsconfig.node.json); test memakai shape
// lokal agar program test tidak menarik graph tipe schema Nuxt penuh.
interface PwaManifestShape {
  id?: string
  lang?: string
  name?: string
  short_name?: string
  display?: string
  start_url?: string
  scope?: string
  theme_color?: string
  background_color?: string
  icons?: Array<{ src?: string; sizes?: string; type?: string; purpose?: string }>
}

interface PwaConfigShape {
  registerType?: string
  manifest?: PwaManifestShape
  devOptions?: { enabled?: boolean }
  workbox?: {
    runtimeCaching?: Array<{ urlPattern?: unknown; handler?: string }>
  }
}

interface HomfloNuxtConfig {
  pwa?: PwaConfigShape
  nitro?: { prerender?: { ignore?: string[] } }
}

// Spesifier sengaja dibuat non-literal (bertipe string) agar dynamic import
// tidak menarik nuxt.config.ts beserta graph tipe-nya ke program ini.
const nuxtConfigPath: string = '../../nuxt.config'
const { default: nuxtConfig } = (await import(nuxtConfigPath)) as {
  default: HomfloNuxtConfig
}

describe('nuxt.config PWA contract', () => {
  it('manifest berisi field wajib PWA', () => {
    const manifest = nuxtConfig.pwa?.manifest

    expect(manifest?.id).toBe('/')
    expect(manifest?.lang).toBe('id')
    expect(manifest?.name).toBe('Homflo')
    expect(manifest?.short_name).toBe('Homflo')
    expect(manifest?.display).toBe('standalone')
    expect(manifest?.start_url).toBe('/')
    expect(manifest?.scope).toBe('/')
    expect(manifest?.theme_color).toBe('#00A155')
    expect(manifest?.background_color).toBe('#ffffff')
    expect(manifest?.icons).toHaveLength(3)
    expect(manifest?.icons?.some(icon => icon.sizes === '192x192')).toBe(true)
    expect(manifest?.icons?.some(icon => icon.sizes === '512x512')).toBe(true)
    expect(manifest?.icons?.some(icon => icon.purpose === 'maskable')).toBe(true)
    expect(manifest?.icons?.some(icon => icon.src === '/pwa-icon-192.png')).toBe(true)
    expect(manifest?.icons?.some(icon => icon.src === '/pwa-icon-512.png')).toBe(true)
    expect(manifest?.icons?.every(icon => icon.src?.startsWith('/'))).toBe(true)
    expect(manifest?.icons?.some(icon => icon.purpose === 'any')).toBe(false)
  })

  it('registerType prompt agar update tidak pernah meng-claim klien yang terbuka', () => {
    expect(nuxtConfig.pwa?.registerType).toBe('prompt')
  })

  it('devOptions aktif agar manifest diserve resmi oleh vite-plugin-pwa di dev', () => {
    expect(nuxtConfig.pwa?.devOptions?.enabled).toBe(true)
  })

  it('runtimeCaching menjaga seluruh /api/ tetap NetworkOnly (data finansial & sesi tak boleh di-cache)', () => {
    const rules = nuxtConfig.pwa?.workbox?.runtimeCaching ?? []
    const apiRule = rules.find(rule => typeof rule.urlPattern === 'function')

    expect(apiRule).toBeDefined()
    expect(apiRule?.handler).toBe('NetworkOnly')

    const matches = apiRule?.urlPattern as (input: { url: URL }) => boolean

    expect(matches({ url: new URL('https://example.com/api/auth/me') })).toBe(true)
    expect(matches({ url: new URL('https://example.com/api/households/1/dashboard') })).toBe(true)
    expect(matches({ url: new URL('https://example.com/dashboard') })).toBe(false)
    expect(matches({ url: new URL('https://example.com/_nuxt/entry.js') })).toBe(false)
  })

  it('nitro.prerender.ignore tetap menonaktifkan route _ipx (regression guard build)', () => {
    expect(nuxtConfig.nitro?.prerender?.ignore).toContain('/_ipx/')
  })
})

const productionSwPath = resolve(process.cwd(), '.output/public/sw.js')
const hasProductionBuild = existsSync(productionSwPath)

describe.skipIf(!hasProductionBuild)('production sw.js contract', () => {
  it('workbox runtime NetworkOnly /api/ ikut ter-emit ke sw.js produksi', () => {
    const sw = readFileSync(productionSwPath, 'utf8')

    expect(sw).toContain('NetworkOnly')
    expect(sw).toContain('/api/')
  })
})
