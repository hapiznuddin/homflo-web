import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Kontrak tamu untuk Maintenance API: tanpa session, boundary wajib
// meneruskan 401 Laravel apa adanya — bukan fixture, bukan HTML login,
// bukan 500 Nitro. Termasuk aksi lifecycle Complete/Cancel.

const serverEntry = resolve(process.cwd(), '.output/server/index.mjs')
const hasBuild = existsSync(serverEntry)
const port = 4328
const origin = `http://127.0.0.1:${port}`

const MAINTENANCE_ID = '01J0MAINT0000000000000001'

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

describe.skipIf(!hasBuild)('maintenance API guest contract', () => {
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

  it('GET /api/maintenance tanpa session → 401', async () => {
    const response = await fetch(`${origin}/api/maintenance`)

    expect(response.status).toBe(401)
  })

  it('POST /api/maintenance tanpa session → 401 (auth sebelum validasi)', async () => {
    const response = await fetch(`${origin}/api/maintenance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })

    expect(response.status).toBe(401)
  })

  it('GET /api/maintenance/{id} tanpa session → 401', async () => {
    const response = await fetch(`${origin}/api/maintenance/${MAINTENANCE_ID}`)

    expect(response.status).toBe(401)
  })

  it('PATCH /api/maintenance/{id} tanpa session → 401', async () => {
    const response = await fetch(`${origin}/api/maintenance/${MAINTENANCE_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'x' })
    })

    expect(response.status).toBe(401)
  })

  it('DELETE /api/maintenance/{id} tanpa session → 401', async () => {
    const response = await fetch(`${origin}/api/maintenance/${MAINTENANCE_ID}`, {
      method: 'DELETE'
    })

    expect(response.status).toBe(401)
  })

  it('POST /api/maintenance/{id}/complete tanpa session → 401', async () => {
    const response = await fetch(`${origin}/api/maintenance/${MAINTENANCE_ID}/complete`, {
      method: 'POST'
    })

    expect(response.status).toBe(401)
  })

  it('POST /api/maintenance/{id}/cancel tanpa session → 401', async () => {
    const response = await fetch(`${origin}/api/maintenance/${MAINTENANCE_ID}/cancel`, {
      method: 'POST'
    })

    expect(response.status).toBe(401)
  })

  it('halaman /maintenance untuk tamu tidak membocorkan data perawatan', async () => {
    const response = await fetch(`${origin}/maintenance`, { redirect: 'manual' })

    // Middleware auth mengalihkan tamu ke login (atau me-render login);
    // yang penting: tidak ada daftar perawatan privat di respons.
    expect([200, 302]).toContain(response.status)

    const text = await response.text()

    expect(text).not.toContain('Cuci AC kamar')
  })
})
