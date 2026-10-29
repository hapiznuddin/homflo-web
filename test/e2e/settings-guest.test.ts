import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Kontrak tamu untuk boundary Settings: tanpa session, proxy wajib
// meneruskan 401 Laravel apa adanya dan halaman Settings tidak boleh
// me-render data rumah tangga privat.

const serverEntry = resolve(process.cwd(), '.output/server/index.mjs')
const hasBuild = existsSync(serverEntry)
const port = 4333
const origin = `http://127.0.0.1:${port}`
const householdId = '01J0000000000000000000001'
const memberId = '01J0000000000000000000002'
const invitationId = '01J0000000000000000000003'

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

function jsonRequest(path: string, method: string): Promise<Response> {
  return fetch(`${origin}${path}`, {
    method,
    redirect: 'manual',
    headers: { 'Content-Type': 'application/json' },
    body: method === 'GET' ? undefined : JSON.stringify({})
  })
}

describe.skipIf(!hasBuild)('settings API guest contract', () => {
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

  it('GET /api/households/{id}/members tanpa session → 401', async () => {
    const response = await fetch(`${origin}/api/households/${householdId}/members`)

    expect(response.status).toBe(401)
  })

  it('POST /api/households/{id}/invitations tanpa session → 401', async () => {
    const response = await jsonRequest(`/api/households/${householdId}/invitations`, 'POST')

    expect(response.status).toBe(401)
  })

  it('PATCH /api/households/{id}/members/{member} tanpa session → 401', async () => {
    const response = await jsonRequest(
      `/api/households/${householdId}/members/${memberId}`,
      'PATCH'
    )

    expect(response.status).toBe(401)
  })

  it('DELETE /api/households/{id}/members/{member} tanpa session → 401', async () => {
    const response = await jsonRequest(
      `/api/households/${householdId}/members/${memberId}`,
      'DELETE'
    )

    expect(response.status).toBe(401)
  })

  it('GET /api/invitations tanpa session → 401', async () => {
    const response = await fetch(`${origin}/api/invitations`)

    expect(response.status).toBe(401)
  })

  it('POST /api/invitations/{id}/accept tanpa session → 401', async () => {
    const response = await jsonRequest(`/api/invitations/${invitationId}/accept`, 'POST')

    expect(response.status).toBe(401)
  })

  it('POST /api/password/change tanpa session → 401', async () => {
    const response = await jsonRequest('/api/password/change', 'POST')

    expect(response.status).toBe(401)
  })

  for (const path of [
    '/settings',
    '/settings/household',
    '/settings/members',
    '/settings/preferences'
  ]) {
    it(`halaman ${path} untuk tamu tidak membocorkan data rumah tangga`, async () => {
      const response = await fetch(`${origin}${path}`, { redirect: 'manual' })
      const location = response.headers.get('location') ?? ''

      expect([200, 302]).toContain(response.status)

      if (response.status === 302) {
        expect(location).toContain('/login')
      }

      const text = await response.text()

      expect(text).not.toContain('Tautan undangan untuk')
      expect(text).not.toContain('Hapus anggota')
    })
  }
})
