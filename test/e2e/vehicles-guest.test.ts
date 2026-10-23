import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Kontrak tamu untuk Vehicles API: tanpa session, boundary wajib
// meneruskan 401 Laravel apa adanya — bukan fixture, bukan HTML login,
// bukan 500 Nitro.

const serverEntry = resolve(process.cwd(), '.output/server/index.mjs')
const hasBuild = existsSync(serverEntry)
const port = 4329
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

describe.skipIf(!hasBuild)('vehicles API guest contract', () => {
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

  it('GET /api/vehicles tanpa session → 401', async () => {
    const response = await fetch(`${origin}/api/vehicles`)

    expect(response.status).toBe(401)
  })

  it('POST /api/vehicles tanpa session → 401 (auth sebelum validasi)', async () => {
    const response = await fetch(`${origin}/api/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })

    expect(response.status).toBe(401)
  })

  it('GET /api/vehicles/{id} tanpa session → 401', async () => {
    const response = await fetch(`${origin}/api/vehicles/01J0VEHICLE000000000000001`)

    expect(response.status).toBe(401)
  })

  it('PATCH /api/vehicles/{id} tanpa session → 401', async () => {
    const response = await fetch(`${origin}/api/vehicles/01J0VEHICLE000000000000001`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'x' })
    })

    expect(response.status).toBe(401)
  })

  it('DELETE /api/vehicles/{id} tanpa session → 401', async () => {
    const response = await fetch(`${origin}/api/vehicles/01J0VEHICLE000000000000001`, {
      method: 'DELETE'
    })

    expect(response.status).toBe(401)
  })

  it('halaman /vehicles untuk tamu tidak membocorkan data kendaraan', async () => {
    const response = await fetch(`${origin}/vehicles`, { redirect: 'manual' })

    // Middleware auth mengalihkan tamu ke login (atau me-render login);
    // yang penting: tidak ada daftar kendaraan privat di respons.
    expect([200, 302]).toContain(response.status)

    const text = await response.text()

    expect(text).not.toContain('Motor Beat')
  })
})
