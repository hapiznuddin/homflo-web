import { describe, expect, it } from 'vitest'
import {
  csrfHeaders,
  extractXsrf,
  mergeCookieHeader,
  takeSetCookies
} from '../../server/utils/laravelCookies'

// Session/CSRF forwarding boundary: the browser session cookie must be
// preserved, Laravel's fresh XSRF/session cookies must win, and the token
// must be extracted for the X-XSRF-TOKEN header on mutations.

describe('takeSetCookies', () => {
  it('returns every Set-Cookie header from a response', () => {
    const headers = new Headers()
    headers.append('set-cookie', 'XSRF-TOKEN=token-1; Path=/')
    headers.append('set-cookie', 'session=session-1; Path=/; HttpOnly')

    expect(takeSetCookies(headers)).toEqual([
      'XSRF-TOKEN=token-1; Path=/',
      'session=session-1; Path=/; HttpOnly'
    ])
  })
})

describe('mergeCookieHeader', () => {
  it('keeps browser cookies and lets Laravel Set-Cookie values win', () => {
    expect(mergeCookieHeader('session=old; theme=dark', [
      'XSRF-TOKEN=csrf-token; Path=/',
      'session=rotated; Path=/'
    ])).toBe('session=rotated; theme=dark; XSRF-TOKEN=csrf-token')
  })

  it('handles a missing browser cookie header', () => {
    expect(mergeCookieHeader(undefined, ['session=new; Path=/']))
      .toBe('session=new')
  })
})

describe('extractXsrf', () => {
  it('finds the XSRF token among Set-Cookie headers', () => {
    expect(extractXsrf([
      'session=abc; Path=/',
      'XSRF-TOKEN=url%2Bencoded; Path=/'
    ])).toBe('url%2Bencoded')
  })

  it('returns undefined when no token is present', () => {
    expect(extractXsrf(['session=abc; Path=/'])).toBeUndefined()
  })
})

describe('csrfHeaders', () => {
  it('returns the merged cookie header and the fresh XSRF token', () => {
    expect(csrfHeaders('session=browser', [
      'XSRF-TOKEN=fresh-token; Path=/',
      'session=csrf-session; Path=/'
    ])).toEqual({
      cookie: 'session=csrf-session; XSRF-TOKEN=fresh-token',
      xsrf: 'fresh-token'
    })
  })
})
