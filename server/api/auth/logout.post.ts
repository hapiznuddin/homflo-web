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

export default defineEventHandler(async (event) => {
  const browserCookies = getRequestHeader(event, 'cookie')

  // Bootstrap CSRF state on the Laravel session first.
  const csrfResponse = await fetch(`${laravelOrigin()}/sanctum/csrf-cookie`, {
    headers: {
      Accept: 'application/json',
      ...forwardAuthHeaders(event)
    }
  })
  const csrfCookies = takeSetCookies(csrfResponse.headers)

  const xsrf = csrfCookies
    .map((cookie) => cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)?.[1])
    .find(Boolean)

  const logoutResponse = await fetch(`${laravelOrigin()}/logout`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...forwardAuthHeaders(event),
      cookie: mergeCookieHeader(browserCookies, csrfCookies),
      ...(xsrf ? { 'X-XSRF-TOKEN': decodeURIComponent(xsrf) } : {})
    }
  })

  const outgoing = [...csrfCookies, ...takeSetCookies(logoutResponse.headers)]

  if (outgoing.length > 0) {
    appendResponseHeaders(event, { 'set-cookie': outgoing })
  }

  if (!logoutResponse.ok) {
    throw createError({ statusCode: logoutResponse.status, message: 'Logout gagal.' })
  }

  return { success: true }
})
