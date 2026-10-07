import type { H3Event } from 'h3'

function takeSetCookies(headers: Headers): string[] {
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie
  const value = typeof getSetCookie === 'function' ? getSetCookie.call(headers) : []

  return Array.isArray(value) ? value : [value]
}

function mergeCookieHeader(existing: string | undefined, setCookies: string[]): string {
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

function extractXsrf(setCookies: string[]): string | undefined {
  return setCookies
    .map(cookie => cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)?.[1])
    .find(Boolean)
}

export function laravelBase(): string {
  const config = useRuntimeConfig()

  return (config.public.apiBase as string).replace(/\/+$/, '')
}

export function laravelOrigin(): string {
  return laravelBase().replace(/\/api$/, '')
}

// Forward the browser Cookie header server-to-server so Laravel sees the
// session. Cookie values never leave the server and are never copied to
// client storage.
export function forwardCookies(event: H3Event): Record<string, string> {
  const cookie = getRequestHeader(event, 'cookie')

  return cookie ? { cookie } : {}
}

// Sanctum only starts the session for recognized frontend origins, so the
// browser Origin/Referer must be forwarded. Fall back to the configured
// frontend origin — never this server's own origin, which lacks the port
// and is not in Sanctum's stateful list.
export function forwardAuthHeaders(event: H3Event): Record<string, string> {
  const config = useRuntimeConfig()
  const origin = getRequestHeader(event, 'origin') ?? getRequestHeader(event, 'referer')

  return {
    ...forwardCookies(event),
    origin: origin ?? (config.public.siteUrl as string)
  }
}

interface LaravelFetchOptions {
  method?: string
  body?: unknown
  ensureCsrf?: boolean
}

// Single boundary for session-sensitive Laravel mutations.
//
// Browser -> Nuxt -> Laravel, forwarding cookies + origin. For mutations,
// CSRF state is bootstrapped server-side first (sanctum/csrf-cookie),
// because the browser never holds a usable XSRF token for these calls.
// Laravel Set-Cookie headers (session rotation, fresh XSRF) are forwarded
// back to the browser. Non-2xx Laravel responses surface as errors.
export async function laravelFetch<T>(event: H3Event, path: string, options: LaravelFetchOptions = {}): Promise<T> {
  const { method = 'GET', body, ensureCsrf = true } = options
  const browserCookies = getRequestHeader(event, 'cookie')
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...forwardAuthHeaders(event)
  }

  if (method !== 'GET' && ensureCsrf) {
    const csrfResponse = await fetch(`${laravelOrigin()}/sanctum/csrf-cookie`, { headers })

    const csrfCookies = takeSetCookies(csrfResponse.headers)
    const xsrf = extractXsrf(csrfCookies)

    headers.cookie = mergeCookieHeader(browserCookies, csrfCookies)

    if (xsrf) {
      headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrf)
    }

    const response = await fetch(`${laravelBase()}${path}`, {
      method,
      headers: {
        ...headers,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    })

    const outgoing = [...csrfCookies, ...takeSetCookies(response.headers)]

    if (outgoing.length > 0) {
      appendResponseHeaders(event, { 'set-cookie': outgoing })
    }

    return forwardLaravelResponse<T>(event, response, csrfCookies)
  }

  const response = await fetch(`${laravelBase()}${path}`, {
    method,
    headers: {
      ...headers,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  })

  return forwardLaravelResponse<T>(event, response, [])
}

// Forward Set-Cookie headers, then surface Laravel's exact body. Errors
// keep the Laravel status code with the Laravel body nested under `data`,
// which readError() unwraps on the client.
async function forwardLaravelResponse<T>(event: H3Event, response: Response, priorCookies: string[]): Promise<T> {
  const outgoing = [...priorCookies, ...takeSetCookies(response.headers)]

  if (outgoing.length > 0) {
    appendResponseHeaders(event, { 'set-cookie': outgoing })
  }

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message
      = (payload as { error?: { message?: string }, message?: string } | null)?.error?.message
        ?? (payload as { message?: string } | null)?.message
        ?? 'Request failed.'

    throw createError({ statusCode: response.status, message, data: payload })
  }

  return payload as T
}
