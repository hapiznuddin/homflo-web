import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Kontrak tamu untuk Bills API: tanpa session, boundary wajib meneruskan
// 401 Laravel apa adanya — bukan fixture, bukan HTML login, bukan 500
// Nitro. 401 (bukan 404) pada /api/bills/recurrences/* juga membuktikan
// rute statis recurrences terdaftar/terbedakan dari rute dinamis
// /api/bills/[id] di Nitro (R-W1) dan path forward ke Laravel benar.

const serverEntry = resolve(process.cwd(), '.output/server/index.mjs')
const hasBuild = existsSync(serverEntry)
const port = 4325
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

describe.skipIf(!hasBuild)('bills API guest contract', () => {
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

  it('GET /api/bills tanpa session → 401', async () => {
    const response = await fetch(`${origin}/api/bills`)

    expect(response.status).toBe(401)
  })

  it('GET /api/bills?include_archived=true tanpa session → 401', async () => {
    const response = await fetch(`${origin}/api/bills?include_archived=true`)

    expect(response.status).toBe(401)
  })

  it('POST /api/bills tanpa session → 401 (auth sebelum validasi)', async () => {
    const response = await fetch(`${origin}/api/bills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })

    expect(response.status).toBe(401)
  })

  it('GET /api/bills/{id} tanpa session → 401', async () => {
    const response = await fetch(`${origin}/api/bills/01J0BILL00000000000000001`)

    expect(response.status).toBe(401)
  })

  it('PATCH /api/bills/{id} tanpa session → 401', async () => {
    const response = await fetch(`${origin}/api/bills/01J0BILL00000000000000001`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'x' })
    })

    expect(response.status).toBe(401)
  })

  it('DELETE /api/bills/{id} tanpa session → 401', async () => {
    const response = await fetch(`${origin}/api/bills/01J0BILL00000000000000001`, {
      method: 'DELETE'
    })

    expect(response.status).toBe(401)
  })

  it('POST /api/bills/{id}/archive tanpa session → 401', async () => {
    const response = await fetch(`${origin}/api/bills/01J0BILL00000000000000001/archive`, {
      method: 'POST'
    })

    expect(response.status).toBe(401)
  })

  it('POST /api/bills/{id}/payments tanpa session → 401', async () => {
    const response = await fetch(`${origin}/api/bills/01J0BILL00000000000000001/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })

    expect(response.status).toBe(401)
  })

  it('PATCH /api/bills/recurrences/{id} tanpa session → 401 (rute statis terbedakan, bukan 404)', async () => {
    const response = await fetch(`${origin}/api/bills/recurrences/r1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })

    expect(response.status).toBe(401)
  })

  it('halaman /bills untuk tamu tidak membocorkan konten privat', async () => {
    const response = await fetch(`${origin}/bills`, { redirect: 'manual' })

    // Middleware auth mengalihkan tamu ke login (atau me-render login);
    // yang penting: tidak ada daftar tagihan privat di respons.
    expect([200, 302]).toContain(response.status)

    const text = await response.text()

    expect(text).not.toContain('Belum ada tagihan berjalan.')
    expect(text).not.toContain('Tambah Tagihan')
  })
})
