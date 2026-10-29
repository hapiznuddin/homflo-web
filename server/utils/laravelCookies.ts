// Pure cookie/CSRF helpers shared by the Laravel boundary. Kept free of
// Nitro imports so the merge rules can be unit-tested directly.

export function takeSetCookies(headers: Headers): string[] {
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie
  const value = typeof getSetCookie === 'function' ? getSetCookie.call(headers) : []

  return Array.isArray(value) ? value : [value]
}

export function mergeCookieHeader(existing: string | undefined, setCookies: string[]): string {
  const jar = new Map<string, string>()

  for (const pair of [...(existing ? existing.split('; ') : [])]) {
    const index = pair.indexOf('=')

    if (index > 0) {
      jar.set(pair.slice(0, index).trim(), pair.slice(index + 1))
    }
  }

  for (const setCookie of setCookies) {
    const pair = setCookie.split(';')[0] ?? ''
    const index = pair.indexOf('=')

    if (index > 0) {
      jar.set(pair.slice(0, index).trim(), pair.slice(index + 1))
    }
  }

  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ')
}

export function extractXsrf(setCookies: string[]): string | undefined {
  return setCookies
    .map(cookie => cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)?.[1])
    .find(Boolean)
}

/**
 * Build the cookie header and XSRF token for a Laravel mutation after the
 * CSRF bootstrap response. Browser cookies are preserved and Laravel's
 * Set-Cookie values take precedence.
 */
export function csrfHeaders(
  browserCookies: string | undefined,
  csrfSetCookies: string[]
): { cookie: string, xsrf?: string } {
  const xsrf = extractXsrf(csrfSetCookies)

  return {
    cookie: mergeCookieHeader(browserCookies, csrfSetCookies),
    xsrf
  }
}
