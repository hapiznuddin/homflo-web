import { describe, expect, it } from 'vitest'
import { extractRedirectQuery, safeRedirectPath } from '~/utils/redirect'

describe('safeRedirectPath', () => {
  it('accepts valid internal paths', () => {
    expect(safeRedirectPath('/dashboard')).toBe('/dashboard')
    expect(safeRedirectPath('/transactions')).toBe('/transactions')
    expect(safeRedirectPath('/settings/profile')).toBe('/settings/profile')
  })

  it('preserves query string but drops fragment', () => {
    expect(safeRedirectPath('/transactions?page=2')).toBe('/transactions?page=2')
    expect(safeRedirectPath('/settings/profile?tab=security')).toBe('/settings/profile?tab=security')
    expect(safeRedirectPath('/dashboard#section')).toBe('/dashboard')
  })

  it('rejects external absolute URLs', () => {
    expect(safeRedirectPath('https://evil.example')).toBeNull()
    expect(safeRedirectPath('http://evil.example/path')).toBeNull()
  })

  it('rejects protocol-relative URLs', () => {
    expect(safeRedirectPath('//evil.example')).toBeNull()
    expect(safeRedirectPath('//evil.example/path')).toBeNull()
  })

  it('rejects javascript: scheme', () => {
    expect(safeRedirectPath('javascript:alert(1)')).toBeNull()
    expect(safeRedirectPath('javascript:void(0)')).toBeNull()
  })

  it('rejects login and register paths', () => {
    expect(safeRedirectPath('/login')).toBeNull()
    expect(safeRedirectPath('/register')).toBeNull()
    expect(safeRedirectPath('/LOGIN')).toBeNull()
    expect(safeRedirectPath('/Register')).toBeNull()
  })

  it('rejects paths with backslashes', () => {
    expect(safeRedirectPath('/dashboard\\..\\evil')).toBeNull()
  })

  it('rejects paths with control characters', () => {
    expect(safeRedirectPath('/dashboard\u0000')).toBeNull()
    expect(safeRedirectPath('/dashboard\n')).toBeNull()
  })

  it('rejects empty, non-string, and too long paths', () => {
    expect(safeRedirectPath('')).toBeNull()
    expect(safeRedirectPath('a'.repeat(513))).toBeNull()
  })

  it('rejects paths not starting with /', () => {
    expect(safeRedirectPath('dashboard')).toBeNull()
    expect(safeRedirectPath('evil.com/path')).toBeNull()
  })

  it('rejects encoded external URLs', () => {
    expect(safeRedirectPath(encodeURI('https://evil.example'))).toBeNull()
    expect(safeRedirectPath('//evil.example/%2e%2e/etc/passwd')).toBeNull()
  })
})

describe('extractRedirectQuery', () => {
  it('extracts valid redirect from query object', () => {
    expect(extractRedirectQuery({ redirect: '/dashboard' })).toBe('/dashboard')
    expect(extractRedirectQuery({ redirect: '/transactions?page=1' })).toBe('/transactions?page=1')
  })

  it('returns null for missing or invalid redirect', () => {
    expect(extractRedirectQuery({})).toBeNull()
    expect(extractRedirectQuery({ redirect: null })).toBeNull()
    expect(extractRedirectQuery({ redirect: undefined })).toBeNull()
    expect(extractRedirectQuery({ redirect: 123 })).toBeNull()
    expect(extractRedirectQuery({ redirect: '/login' })).toBeNull()
    expect(extractRedirectQuery({ redirect: 'https://evil.example' })).toBeNull()
  })
})
