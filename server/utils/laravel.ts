import type { H3Event } from 'h3'

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
// browser Origin/Referer must be forwarded. Fall back to this server's own
// origin, which is the frontend the browser is actually using.
export function forwardAuthHeaders(event: H3Event): Record<string, string> {
  const origin = getRequestHeader(event, 'origin') ?? getRequestHeader(event, 'referer')

  return {
    ...forwardCookies(event),
    origin: origin ?? getRequestURL(event).origin
  }
}
