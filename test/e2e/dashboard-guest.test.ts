import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Kontrak tamu untuk read-model dashboard: tanpa session, boundary wajib
// meneruskan 401 Laravel apa adanya — bukan fixture, bukan HTML login,
// bukan 500 Nitro.

const serverEntry = resolve(process.cwd(), '.output/server/index.mjs')
const hasBuild = existsSync(serverEntry)
const port = 4321
const origin = `http://127.0.0.1:${port}`

let child: ChildProcess | undefined

async function waitForServer(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${origin}/`)

      if (response.ok) {
        return
      }
    } catch {
      // server belum siap
    }

    await new Promise(resolvePromise => setTimeout(resolvePromise, 250))
  }

  throw new Error(`Server production tidak siap dalam ${timeoutMs}ms`)
}

describe.skipIf(!hasBuild)('dashboard API guest contract', () => {
  beforeAll(async () => {
    child = spawn(process.execPath, [serverEntry], {
      env: {
        ...process.env,
        PORT: String(port),
        NITRO_PORT: String(port),
        HOST: '127.0.0.1',
        NITRO_HOST: '127.0.0.1',
        NODE_ENV: 'production'
      },
      stdio: 'ignore'
    })

    await waitForServer(30000)
  })

  afterAll(() => {
    child?.kill('SIGKILL')
  })

  it('GET /api/dashboard tanpa session → 401 envelope Laravel', async () => {
    const response = await fetch(`${origin}/api/dashboard?month=10&year=2026`)

    expect(response.status).toBe(401)

    const body = await response.json()

    // Nitro membungkus createError; body Laravel tetap utuh di `data`.
    expect(body.statusCode).toBe(401)
    expect(body.data).toEqual({ message: 'Unauthenticated.' })
  })

  it('boundary memvalidasi dulu: param rusak → 422 walau tanpa session', async () => {
    const response = await fetch(`${origin}/api/dashboard?month=13&year=2101`)

    expect(response.status).toBe(422)

    const body = await response.json()

    expect(body.data.errors).toEqual({
      month: ['Bulan harus berupa angka 1 sampai 12.'],
      year: ['Tahun harus berupa angka 2000 sampai 2100.']
    })
  })

  it('response tamu bukan fixture read-model', async () => {
    const response = await fetch(`${origin}/api/dashboard`)
    const text = await response.text()

    expect(text).not.toContain('upcomingBills')
    expect(text).not.toContain('netCashFlow')
    expect(response.headers.get('content-type')).toContain('application/json')
  })
})
