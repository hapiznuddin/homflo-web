import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Kontrak tamu untuk Property API: tanpa session, boundary Nuxt wajib
// meneruskan 401 Laravel apa adanya (bukan 500 Nitro atau HTML login).
// Tidak ada request yang menyentuh database karena auth berjalan lebih dulu.

const serverEntry = resolve(process.cwd(), '.output/server/index.mjs')
const hasBuild = existsSync(serverEntry)
const port = 4332
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

describe.skipIf(!hasBuild)('properties API guest contract', () => {
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

  it('GET /api/properties tanpa session → 401', async () => {
    const response = await fetch(`${origin}/api/properties`)

    expect(response.status).toBe(401)
  })

  it('POST /api/properties tanpa session → 401 (auth sebelum validasi)', async () => {
    const response = await fetch(`${origin}/api/properties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })

    expect(response.status).toBe(401)
  })

  it('GET /api/properties/{id} tanpa session → 401', async () => {
    const response = await fetch(`${origin}/api/properties/01J0PROPERTY00000000000001`)

    expect(response.status).toBe(401)
  })

  it('PATCH /api/properties/{id} tanpa session → 401', async () => {
    const response = await fetch(`${origin}/api/properties/01J0PROPERTY00000000000001`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'x' })
    })

    expect(response.status).toBe(401)
  })

  it('POST archive/restore tanpa session → 401', async () => {
    const archive = await fetch(`${origin}/api/properties/01J0PROPERTY00000000000001/archive`, {
      method: 'POST'
    })
    const restore = await fetch(`${origin}/api/properties/01J0PROPERTY00000000000001/restore`, {
      method: 'POST'
    })

    expect(archive.status).toBe(401)
    expect(restore.status).toBe(401)
  })

  it('halaman /properties untuk tamu tidak membocorkan data property', async () => {
    const response = await fetch(`${origin}/properties`, { redirect: 'manual' })

    expect([200, 302]).toContain(response.status)

    const text = await response.text()

    expect(text).not.toContain('Rumah utama')
    expect(text).not.toContain('Jl. Mawar')
  })
})
