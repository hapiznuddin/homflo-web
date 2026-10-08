import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import App from '~/app.vue'

// Halaman '/' memanggil bootstrap() saat mount; mock agar tidak ada
// request ke backend dan tidak ada redirect ke /dashboard di test ini.
const authMock = vi.hoisted(() => ({
  user: { value: null },
  onboarding: { value: { required: false } },
  bootstrap: vi.fn(async () => 'unauthenticated'),
  logout: vi.fn()
}))

mockNuxtImport('useAuth', () => () => authMock)

beforeAll(async () => {
  await mountSuspended(App, { route: '/' })
})

describe('PWA head contract (document.head)', () => {
  it('tepat SATU <link rel="manifest"> di document.head, href /manifest.webmanifest', () => {
    const links = document.head.querySelectorAll('link[rel="manifest"]')

    expect(links).toHaveLength(1)
    expect(links[0]?.getAttribute('href')).toBe('/manifest.webmanifest')
  })

  it('tidak ada manifest link yang tersisip di body (regresi manual injection)', () => {
    const links = document.body.querySelectorAll('link[rel="manifest"]')

    expect(links).toHaveLength(0)
  })

  it('meta theme-color hadir persis sekali dengan warna brand', () => {
    const metas = document.head.querySelectorAll('meta[name="theme-color"]')

    expect(metas).toHaveLength(1)
    expect(metas[0]?.getAttribute('content')).toBe('#00A155')
  })

  it('favicon link tetap dipertahankan', () => {
    const icon = document.head.querySelector('link[rel="icon"]')

    expect(icon).not.toBeNull()
    expect(icon?.getAttribute('href')).toBe('/favicon.ico')
  })
})
