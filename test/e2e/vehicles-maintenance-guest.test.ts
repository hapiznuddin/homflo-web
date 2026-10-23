import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Kontrak tamu untuk Vehicle Maintenance API: tanpa session, boundary wajib
// meneruskan 401 Laravel apa adanya — bukan fixture, bukan HTML login, bukan
// 500 Nitro. Semua endpoint (list, detail, create, update, delete, complete)
// berada di bawah auth:sanctum.

const serverEntry = resolve(process.cwd(), '.output/server/index.mjs')
const hasBuild = existsSync(serverEntry)
const port = 4330
const origin = `http://127.0.0.1:${port}`
const vehicleId = '01J0VEHICLE000000000000001'
const maintenanceId = '01J0MAINT0000000000000001'
const base = `${origin}/api/vehicles/${vehicleId}/maintenance`

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

describe.skipIf(!hasBuild)('vehicle maintenance API guest contract', () => {
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

  it('GET list maintenance tanpa session → 401', async () => {
    const response = await fetch(base)

    expect(response.status).toBe(401)
  })

  it('POST create tanpa session → 401 (auth sebelum validasi)', async () => {
    const response = await fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })

    expect(response.status).toBe(401)
  })

  it('GET detail tanpa session → 401', async () => {
    const response = await fetch(`${base}/${maintenanceId}`)

    expect(response.status).toBe(401)
  })

  it('PATCH tanpa session → 401', async () => {
    const response = await fetch(`${base}/${maintenanceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'x' })
    })

    expect(response.status).toBe(401)
  })

  it('DELETE tanpa session → 401', async () => {
    const response = await fetch(`${base}/${maintenanceId}`, {
      method: 'DELETE'
    })

    expect(response.status).toBe(401)
  })

  it('POST complete tanpa session → 401', async () => {
    const response = await fetch(`${base}/${maintenanceId}/complete`, {
      method: 'POST'
    })

    expect(response.status).toBe(401)
  })
})
