import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { createServer } from 'node:net'
import { resolve } from 'node:path'
import { once } from 'node:events'

export const E2E_AUTH_ENABLED = process.env.E2E_AUTH === '1'
export const E2E_BUILD_AVAILABLE = existsSync(resolve(process.cwd(), '.output/server/index.mjs'))

export const NUXT_E2E_ORIGIN = 'http://127.0.0.1:4342'
export const API_E2E_ORIGIN = 'http://127.0.0.1:8001'

const NUXT_E2E_PORT = 4342
const API_E2E_PORT = 8001
const READY_TIMEOUT_MS = 30000

export interface FixtureUser {
  id: string
  email: string
  name: string
}

export interface FixtureVehicle {
  id: string
  name: string
  plate_number: string | null
  odometer: number | null
}

export interface FixtureData {
  run_id: string
  database: string
  users: {
    owner_a: FixtureUser
    member_a: FixtureUser
    unverified_a: FixtureUser
    owner_b: FixtureUser
  }
  households: {
    a: { id: string, name: string }
    b: { id: string, name: string }
  }
  vehicles: {
    a: FixtureVehicle
    b: FixtureVehicle
  }
  maintenance: {
    scheduled: { id: string, title: string }
    completed: { id: string, title: string }
  }
  obligation_types: {
    system_tax: { id: string, name: string, code: string }
    custom: { id: string, name: string }
  }
  obligations: {
    custom: { id: string, title: string }
    system: { id: string, title: string }
  }
}

export interface E2ETestClient {
  jar: CookieJar
  origin: string
  apiOrigin: string
  login: (email: string, password: string) => Promise<void>
  attemptLogin: (email: string, password: string) => Promise<LoginAttempt>
  logout: () => Promise<void>
  getPage: (path: string) => Promise<HttpResult<string>>
  getJson: <T = unknown>(path: string) => Promise<HttpResult<T>>
  postJson: <T = unknown>(path: string, body?: unknown) => Promise<HttpResult<T>>
  patchJson: <T = unknown>(path: string, body?: unknown) => Promise<HttpResult<T>>
  deleteJson: <T = unknown>(path: string) => Promise<HttpResult<T>>
}

export interface LoginAttempt {
  status: number
  body: unknown
}

export interface HttpResult<T> {
  status: number
  headers: Headers
  body: T
}

interface AuthenticatedEnvironment {
  fixtures: FixtureData
  password: string
  clients: {
    guest: E2ETestClient
    ownerA: E2ETestClient
    memberA: E2ETestClient
    unverifiedA: E2ETestClient
    ownerB: E2ETestClient
  }
  stop: () => Promise<void>
}

function setCookies(headers: Headers): string[] {
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie

  if (typeof getSetCookie === 'function') {
    return getSetCookie.call(headers)
  }

  const single = headers.get('set-cookie')

  return single ? [single] : []
}

export class CookieJar {
  private readonly cookies = new Map<string, string>()

  store(headers: Headers): void {
    for (const raw of setCookies(headers)) {
      const [pair = '', ...attributes] = raw.split(';')
      const index = pair.indexOf('=')

      if (index <= 0) {
        continue
      }

      const name = pair.slice(0, index).trim()
      const value = pair.slice(index + 1).trim()
      const maxAge = attributes.find(attribute => attribute.trim().toLowerCase().startsWith('max-age='))
      const expires = attributes.find(attribute => attribute.trim().toLowerCase().startsWith('expires='))
      const expired
        = (maxAge !== undefined && Number(maxAge.split('=')[1]) <= 0)
          || (expires !== undefined && Date.parse(expires.slice(expires.indexOf('=') + 1)) <= Date.now())

      if (expired) {
        this.cookies.delete(name)
      } else {
        this.cookies.set(name, value)
      }
    }
  }

  get(name: string): string | undefined {
    return this.cookies.get(name)
  }

  header(): string {
    return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ')
  }

  names(): string[] {
    return [...this.cookies.keys()]
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
  accept?: string
  headers?: Record<string, string>
}

function errorCode(body: unknown): string | undefined {
  let node = body

  for (let depth = 0; depth < 5; depth += 1) {
    if (typeof node !== 'object' || node === null) {
      return undefined
    }

    const candidate = node as { error?: { code?: string }, data?: unknown }

    if (typeof candidate.error?.code === 'string') {
      return candidate.error.code
    }

    node = candidate.data
  }

  return undefined
}

function safeErrorSummary(status: number, body: unknown): string {
  const code = errorCode(body)

  return code ? `HTTP ${status} (${code})` : `HTTP ${status}`
}

class HttpTestClient implements E2ETestClient {
  readonly jar = new CookieJar()

  constructor(
    readonly origin: string,
    readonly apiOrigin: string
  ) {}

  private headers(options: RequestOptions): Headers {
    const headers = new Headers(options.headers)
    headers.set('Accept', options.accept ?? 'application/json')
    headers.set('Origin', this.origin)
    headers.set('Referer', `${this.origin}/`)

    const cookie = this.jar.header()

    if (cookie !== '') {
      headers.set('Cookie', cookie)
    }

    if (options.body !== undefined && options.body !== null && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    return headers
  }

  private async request(url: string, options: RequestOptions = {}): Promise<Response> {
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: this.headers(options),
      body: options.body === undefined || options.body === null ? undefined : JSON.stringify(options.body),
      redirect: 'manual'
    })

    this.jar.store(response.headers)

    return response
  }

  private async parse<T>(response: Response): Promise<T> {
    const text = await response.text()

    if (text === '') {
      return null as T
    }

    try {
      return JSON.parse(text) as T
    } catch {
      return text as T
    }
  }

  private async requestJson<T>(url: string, options: RequestOptions = {}): Promise<HttpResult<T>> {
    const response = await this.request(url, options)

    return {
      status: response.status,
      headers: response.headers,
      body: await this.parse<T>(response)
    }
  }

  private async requestNuxt<T>(path: string, options: RequestOptions = {}): Promise<HttpResult<T>> {
    return this.requestJson<T>(`${this.origin}${path}`, options)
  }

  private async requestLaravel<T>(path: string, options: RequestOptions = {}): Promise<HttpResult<T>> {
    return this.requestJson<T>(`${this.apiOrigin}${path}`, options)
  }

  async getPage(path: string): Promise<HttpResult<string>> {
    const response = await this.request(`${this.origin}${path}`, { accept: 'text/html' })

    return {
      status: response.status,
      headers: response.headers,
      body: await response.text()
    }
  }

  async getJson<T = unknown>(path: string): Promise<HttpResult<T>> {
    return this.requestNuxt<T>(path)
  }

  async postJson<T = unknown>(path: string, body?: unknown): Promise<HttpResult<T>> {
    return this.requestNuxt<T>(path, { method: 'POST', body })
  }

  async patchJson<T = unknown>(path: string, body?: unknown): Promise<HttpResult<T>> {
    return this.requestNuxt<T>(path, { method: 'PATCH', body })
  }

  async deleteJson<T = unknown>(path: string): Promise<HttpResult<T>> {
    return this.requestNuxt<T>(path, { method: 'DELETE' })
  }

  async attemptLogin(email: string, password: string): Promise<LoginAttempt> {
    const csrf = await this.requestLaravel('/sanctum/csrf-cookie')

    if (csrf.status !== 204 && csrf.status !== 200) {
      throw new Error(`CSRF bootstrap failed: HTTP ${csrf.status}`)
    }

    const rawToken = this.jar.get('XSRF-TOKEN')

    if (!rawToken) {
      throw new Error('CSRF bootstrap did not return an XSRF-TOKEN cookie.')
    }

    let token = rawToken

    try {
      token = decodeURIComponent(rawToken)
    } catch {
      // Keep the raw cookie value when it is not percent-encoded.
    }

    const response = await this.requestLaravel('/login', {
      method: 'POST',
      body: { email, password },
      headers: { 'X-XSRF-TOKEN': token }
    })

    return {
      status: response.status,
      body: response.body
    }
  }

  async login(email: string, password: string): Promise<void> {
    const attempt = await this.attemptLogin(email, password)

    if (attempt.status !== 200) {
      throw new Error(`Login failed for ${email}: ${safeErrorSummary(attempt.status, attempt.body)}`)
    }

    const me = await this.getJson<{
      success: boolean
      data: { user: { email: string } }
    }>('/api/auth/me')

    if (me.status !== 200) {
      throw new Error(`Post-login session verification failed: HTTP ${me.status}`)
    }

    const actualEmail = me.body?.data?.user?.email

    if (actualEmail !== email) {
      throw new Error(`Post-login identity mismatch: expected ${email}, received ${actualEmail ?? '<missing>'}.`)
    }
  }

  async logout(): Promise<void> {
    const response = await this.postJson<{ success: boolean }>('/api/auth/logout')

    if (response.status !== 200) {
      throw new Error(`Logout failed: ${safeErrorSummary(response.status, response.body)}`)
    }
  }
}

function requireApiDirectory(): string {
  const directory = process.env.HOMFLO_API_DIR
    ? resolve(process.env.HOMFLO_API_DIR)
    : resolve(process.cwd(), '..', 'homflo-api')

  if (!existsSync(resolve(directory, 'artisan'))) {
    throw new Error(`API directory not found at ${directory}. Set HOMFLO_API_DIR.`)
  }

  return directory
}

function baseApiEnvironment(apiDirectory: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    APP_ENV: 'e2e',
    APP_DEBUG: 'false',
    DB_CONNECTION: 'pgsql',
    DB_HOST: '127.0.0.1',
    DB_PORT: '5432',
    DB_DATABASE: 'homflo_e2e',
    BCRYPT_ROUNDS: '4',
    SESSION_COOKIE: 'homflo_e2e_session',
    SESSION_DRIVER: 'database',
    SANCTUM_STATEFUL_DOMAINS: '127.0.0.1:4342,127.0.0.1:8001',
    FRONTEND_URL: NUXT_E2E_ORIGIN,
    APP_URL: API_E2E_ORIGIN,
    E2E_API_HOST: '127.0.0.1',
    E2E_API_PORT: String(API_E2E_PORT),
    HOMFLO_API_DIR: apiDirectory
  }

  env.E2E_ALLOW_DATABASE_RESET = '1'

  // A stale DB_URL would silently override the other DB settings.
  delete env.DB_URL

  return env
}

function runPrepare(apiDirectory: string, env: NodeJS.ProcessEnv): FixtureData {
  const result = spawnSync('php', [resolve(apiDirectory, 'tests/Support/e2e_prepare.php')], {
    cwd: apiDirectory,
    env,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024
  })

  if (result.status !== 0) {
    const message = (result.stderr || '').trim() || 'prepare script produced no stderr'
    throw new Error(`E2E database preparation failed: ${message}`)
  }

  const line = (result.stdout || '').trim().split('\n').at(-1) ?? ''

  if (line === '') {
    throw new Error('E2E database preparation returned no fixture JSON.')
  }

  const fixtures = JSON.parse(line) as FixtureData

  if (fixtures.database !== 'homflo_e2e') {
    throw new Error(`Refusing fixtures from unexpected database: ${fixtures.database}`)
  }

  return fixtures
}

async function assertPortFree(port: number, label: string): Promise<void> {
  await new Promise<void>((resolvePromise, reject) => {
    const server = createServer()

    server.once('error', (error) => {
      reject(new Error(`${label} port ${port} is not free: ${error.message}`))
    })

    server.listen(port, '127.0.0.1', () => {
      server.close(() => resolvePromise())
    })
  })
}

async function waitFor(
  label: string,
  probe: () => Promise<boolean>,
  timeoutMs = READY_TIMEOUT_MS
): Promise<void> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      if (await probe()) {
        return
      }
    } catch {
      // Keep polling until the deadline.
    }

    await new Promise(resolvePromise => setTimeout(resolvePromise, 250))
  }

  throw new Error(`${label} did not become ready within ${timeoutMs}ms.`)
}

async function stopProcess(child: ChildProcess | undefined): Promise<void> {
  if (!child || child.exitCode !== null) {
    return
  }

  child.kill('SIGTERM')

  await Promise.race([
    once(child, 'exit').then(() => undefined),
    new Promise(resolvePromise => setTimeout(resolvePromise, 3000))
  ])

  if (child.exitCode === null) {
    child.kill('SIGKILL')
  }
}

function createClients(): AuthenticatedEnvironment['clients'] {
  const client = (): E2ETestClient => new HttpTestClient(NUXT_E2E_ORIGIN, API_E2E_ORIGIN)

  return {
    guest: client(),
    ownerA: client(),
    memberA: client(),
    unverifiedA: client(),
    ownerB: client()
  }
}

export function createTestClient(): E2ETestClient {
  return new HttpTestClient(NUXT_E2E_ORIGIN, API_E2E_ORIGIN)
}

export async function startAuthenticatedEnvironment(): Promise<AuthenticatedEnvironment> {
  if (!E2E_BUILD_AVAILABLE) {
    throw new Error('Authenticated E2E requires .output/server/index.mjs. Run pnpm build first.')
  }

  const apiDirectory = requireApiDirectory()
  const runId = `e2e-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`
  const password = randomBytes(24).toString('base64url')
  const env = baseApiEnvironment(apiDirectory)

  env.E2E_RUN_ID = runId
  env.E2E_FIXTURE_PASSWORD = password

  await assertPortFree(API_E2E_PORT, 'API')
  await assertPortFree(NUXT_E2E_PORT, 'Nuxt')

  const fixtures = runPrepare(apiDirectory, env)

  let api: ChildProcess | undefined
  let nuxt: ChildProcess | undefined
  let apiLog = ''
  let nuxtLog = ''

  try {
    api = spawn('php', [resolve(apiDirectory, 'tests/Support/e2e_serve.php')], {
      cwd: apiDirectory,
      env,
      stdio: ['ignore', 'ignore', 'pipe']
    })
    api.stderr?.on('data', (chunk: Buffer) => {
      apiLog = `${apiLog}${chunk.toString()}`.slice(-4000)
    })

    await waitFor('E2E API', async () => {
      if (api?.exitCode !== null) {
        throw new Error(`E2E API exited with code ${api?.exitCode}. ${apiLog}`)
      }

      const response = await fetch(`${API_E2E_ORIGIN}/up`)

      return response.ok
    })

    nuxt = spawn(process.execPath, [resolve(process.cwd(), '.output/server/index.mjs')], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: String(NUXT_E2E_PORT),
        NITRO_HOST: '127.0.0.1',
        NITRO_PORT: String(NUXT_E2E_PORT),
        NUXT_PUBLIC_API_BASE: `${API_E2E_ORIGIN}/api`,
        NUXT_PUBLIC_SITE_URL: NUXT_E2E_ORIGIN
      },
      stdio: ['ignore', 'ignore', 'pipe']
    })
    nuxt.stderr?.on('data', (chunk: Buffer) => {
      nuxtLog = `${nuxtLog}${chunk.toString()}`.slice(-4000)
    })

    await waitFor('Nuxt E2E server', async () => {
      if (nuxt?.exitCode !== null) {
        throw new Error(`Nuxt E2E server exited with code ${nuxt?.exitCode}. ${nuxtLog}`)
      }

      const response = await fetch(`${NUXT_E2E_ORIGIN}/api/auth/me`, {
        headers: { Accept: 'application/json', Origin: NUXT_E2E_ORIGIN }
      })

      return response.status === 401
    })
  } catch (error) {
    await stopProcess(nuxt)
    await stopProcess(api)
    throw error
  }

  const clients = createClients()

  try {
    await clients.ownerA.login(fixtures.users.owner_a.email, password)
    await clients.memberA.login(fixtures.users.member_a.email, password)
    await clients.unverifiedA.login(fixtures.users.unverified_a.email, password)
    await clients.ownerB.login(fixtures.users.owner_b.email, password)
  } catch (error) {
    await stopProcess(nuxt)
    await stopProcess(api)
    throw error
  }

  return {
    fixtures,
    password,
    clients,
    stop: async () => {
      await Promise.allSettled([
        clients.ownerA.logout(),
        clients.memberA.logout(),
        clients.unverifiedA.logout(),
        clients.ownerB.logout()
      ])

      await stopProcess(nuxt)
      await stopProcess(api)
    }
  }
}

export { safeErrorSummary }
