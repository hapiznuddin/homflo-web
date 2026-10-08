import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'
import authMiddleware from '~/middleware/auth'
import onboardingMiddleware from '~/middleware/onboarding'

// Boundary middleware diuji langsung dengan useAuth + navigateTo yang
// di-mock: tidak ada backend, tidak ada perubahan perilaku middleware.

const navigateToMock = vi.hoisted(() => vi.fn())

const authMock = vi.hoisted(() => ({
  status: { value: 'idle' },
  onboarding: { value: { required: false } },
  bootstrap: vi.fn()
}))

mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useAuth', () => () => authMock)

function fakeRoute(path: string): RouteLocationNormalized {
  return {
    path,
    fullPath: path,
    name: undefined,
    meta: {},
    query: {},
    params: {},
    hash: '',
    matched: [],
    redirectedFrom: undefined
  } as RouteLocationNormalized
}

describe('auth boundary middleware', () => {
  beforeEach(() => {
    authMock.bootstrap.mockReset()
    authMock.onboarding.value.required = false
    navigateToMock.mockClear()
  })

  it('guest (unauthenticated) diarahkan ke /login', async () => {
    authMock.bootstrap.mockResolvedValue('unauthenticated')

    await authMiddleware(fakeRoute('/dashboard'), fakeRoute('/'))

    expect(authMock.bootstrap).toHaveBeenCalledTimes(1)
    expect(navigateToMock).toHaveBeenCalledWith('/login')
  })

  it('authenticated dibiarkan lewat tanpa redirect (dashboard boleh render)', async () => {
    authMock.bootstrap.mockResolvedValue('authenticated')

    const result = await authMiddleware(fakeRoute('/dashboard'), fakeRoute('/'))

    expect(authMock.bootstrap).toHaveBeenCalledTimes(1)
    expect(navigateToMock).not.toHaveBeenCalled()
    expect(result).toBeUndefined()
  })

  it('error koneksi (network/5xx) diarahkan ke /login?offline=1, tanpa logout', async () => {
    authMock.bootstrap.mockResolvedValue('error')

    await authMiddleware(fakeRoute('/dashboard'), fakeRoute('/'))

    expect(navigateToMock).toHaveBeenCalledWith({
      path: '/login',
      query: { offline: '1' }
    })
  })

  it('onboarding wajib (authenticated) diarahkan ke /onboarding', async () => {
    authMock.bootstrap.mockResolvedValue('authenticated')
    authMock.onboarding.value.required = true

    await onboardingMiddleware(fakeRoute('/dashboard'), fakeRoute('/'))

    expect(navigateToMock).toHaveBeenCalledWith('/onboarding')
  })

  it('onboarding tidak wajib: tidak ada redirect', async () => {
    authMock.bootstrap.mockResolvedValue('authenticated')
    authMock.onboarding.value.required = false

    await onboardingMiddleware(fakeRoute('/dashboard'), fakeRoute('/'))

    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('guest melewati middleware onboarding juga diarahkan ke /login', async () => {
    authMock.bootstrap.mockResolvedValue('unauthenticated')

    await onboardingMiddleware(fakeRoute('/onboarding'), fakeRoute('/'))

    expect(navigateToMock).toHaveBeenCalledWith('/login')
  })
})
