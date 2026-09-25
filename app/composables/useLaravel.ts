// Direct Laravel client for non-/api/me endpoints. Auth bootstrap itself
// always goes through the Nuxt server boundary (/api/auth/me).
export function useLaravelOrigin(): string {
  const config = useRuntimeConfig()

  return (config.public.apiBase as string).replace(/\/+$/, '').replace(/\/api$/, '')
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))

  return match ? decodeURIComponent(match[1] ?? '') : null
}

export function useLaravel() {
  const api = $fetch.create({
    baseURL: `${useLaravelOrigin()}/api`,
    credentials: 'include',
    headers: { Accept: 'application/json' }
  })

  // Bootstrap CSRF cookies for Laravel web routes (login/register).
  // Reads only the XSRF-TOKEN cookie, never any auth credential.
  async function csrf(): Promise<Record<string, string>> {
    await $fetch(`${useLaravelOrigin()}/sanctum/csrf-cookie`, {
      credentials: 'include',
      headers: { Accept: 'application/json' }
    })

    const token = readCookie('XSRF-TOKEN')

    return token ? { 'X-XSRF-TOKEN': token } : {}
  }

  return { api, csrf, origin: useLaravelOrigin() }
}
