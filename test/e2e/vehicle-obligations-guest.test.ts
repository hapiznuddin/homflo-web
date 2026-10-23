import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Kontrak tamu untuk Obligations API dan katalog jenis: tanpa session,
// boundary wajib meneruskan 401 Laravel apa adanya — bukan fixture, bukan
// HTML login, bukan 500 Nitro. Semua endpoint berada di bawah auth:sanctum
// (write juga RequireVerifiedEmail).

const serverEntry = resolve(process.cwd(), '.output/server/index.mjs')
const hasBuild = existsSync(serverEntry)
const port = 4331
const origin = `http://127.0.0.1:${port}`
const vehicleId = '01J0VEHICLE000000000000001'
const obligationId = '01J0OBLIGATION000000000001'
const typeId = '01J0TYPE0000000000000001'
const base = `${origin}/api/vehicles/${vehicleId}/obligations`
const typesBase = `${origin}/api/obligation-types`

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

describe.skipIf(!hasBuild)('obligations API guest contract', () => {
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

  it('GET obligations tanpa session → 401', async () => {
    const response = await fetch(base)

    expect(response.status).toBe(401)
  })

  it('POST obligation tanpa session → 401 (auth sebelum validasi)', async () => {
    const response = await fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })

    expect(response.status).toBe(401)
  })

  it('GET detail obligation tanpa session → 401', async () => {
    const response = await fetch(`${base}/${obligationId}`)

    expect(response.status).toBe(401)
  })

  it('PATCH obligation tanpa session → 401', async () => {
    const response = await fetch(`${base}/${obligationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'x' })
    })

    expect(response.status).toBe(401)
  })

  it('DELETE obligation tanpa session → 401', async () => {
    const response = await fetch(`${base}/${obligationId}`, { method: 'DELETE' })

    expect(response.status).toBe(401)
  })

  it('GET obligation types tanpa session → 401', async () => {
    const response = await fetch(typesBase)

    expect(response.status).toBe(401)
  })

  it('POST obligation type tanpa session → 401', async () => {
    const response = await fetch(typesBase, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Asuransi' })
    })

    expect(response.status).toBe(401)
  })

  it('PATCH obligation type tanpa session → 401', async () => {
    const response = await fetch(`${typesBase}/${typeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Asuransi' })
    })

    expect(response.status).toBe(401)
  })

  it('DELETE obligation type tanpa session → 401', async () => {
    const response = await fetch(`${typesBase}/${typeId}`, { method: 'DELETE' })

    expect(response.status).toBe(401)
  })
})
