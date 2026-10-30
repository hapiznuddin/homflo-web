/**
 * Sanitize a redirect path from query parameters.
 *
 * Only same-origin internal paths are allowed. Absolute URLs, protocol-relative
 * URLs, paths starting with \\, and character control characters are rejected.
 * The path must start with / and must not be //. Maximum 512 characters.
 * /login and /register as targets are rejected to prevent redirect loops.
 *
 * Returns the sanitized pathname + search (fragment is dropped).
 * Returns null if the path is invalid or should be rejected.
 */
export function safeRedirectPath(path: string): string | null {
  // 1. Tolak non-string, kosong, atau >512 karakter
  if (typeof path !== 'string' || path.length === 0 || path.length > 512) {
    return null
  }

  // 2. Tolak yang tidak diawali /, atau diawali //
  if (!path.startsWith('/') || path.startsWith('//')) {
    return null
  }

  // 3. Tolak yang mengandung \\ atau karakter kontrol (\u0000–\u001f)
  if (path.includes('\\')) {
    return null
  }

  // 3. Tolak karakter kontrol ASCII 0-31
  for (let i = 0; i < path.length; i++) {
    const code = path.charCodeAt(i)
    if (code < 0x20) {
      return null
    }
  }

  // 4. Parse dengan basis origin dummy; tolak bila origin berubah
  let url: URL
  try {
    const dummyOrigin = 'https://homflo.local'
    url = new URL(path, dummyOrigin)

    // Pastikan origin masih cocok (hanya path yang boleh berubah)
    if (url.origin !== dummyOrigin) {
      return null
    }
  } catch {
    return null
  }

  // 5. Tolak tujuan /login dan /register untuk mencegah loop
  const lowered = path.toLowerCase()
  if (lowered === '/login' || lowered === '/register') {
    return null
  }

  // 6. Kembalikan pathname + search (fragment dibuang agar tidak ada vektor tambahan)
  const search = url.search || ''
  return url.pathname + search
}

/**
 * Validates and extracts a redirect path from a query object.
 * Returns null if the redirect is invalid or should be rejected.
 */
export function extractRedirectQuery(query: Record<string, unknown>): string | null {
  const redirect = query.redirect

  if (redirect === undefined || redirect === null || typeof redirect !== 'string') {
    return null
  }

  return safeRedirectPath(redirect)
}
