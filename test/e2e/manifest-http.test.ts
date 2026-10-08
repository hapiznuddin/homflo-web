import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { inflateSync } from 'node:zlib'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Kontrak HTTP manifest di production build. Server Nitro dari .output
// di-spawn di port terpisah; test dilewati bila build belum ada.

function collectIdat(png: Buffer): Buffer {
  const chunks: Buffer[] = []
  let offset = 8

  while (offset < png.length) {
    const length = png.readUInt32BE(offset)
    const type = png.subarray(offset + 4, offset + 8).toString('latin1')

    if (type === 'IDAT') chunks.push(png.subarray(offset + 8, offset + 8 + length))
    if (type === 'IEND') break

    offset += 12 + length
  }

  return Buffer.concat(chunks)
}

const serverEntry = resolve(process.cwd(), '.output/server/index.mjs')
const hasBuild = existsSync(serverEntry)
const port = 4318
const origin = `http://127.0.0.1:${port}`

let child: ChildProcess | undefined

async function waitForServer(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${origin}/manifest.webmanifest`)

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

describe.skipIf(!hasBuild)('GET /manifest.webmanifest (production server)', () => {
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

  it('merespons 200 dengan content-type application/manifest+json', async () => {
    const response = await fetch(`${origin}/manifest.webmanifest`)

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/manifest+json')
  })

  it('body-nya JSON valid dengan field manifest wajib', async () => {
    const response = await fetch(`${origin}/manifest.webmanifest`)
    const manifest = (await response.json()) as Record<string, unknown>

    expect(typeof manifest.name).toBe('string')
    expect(typeof manifest.short_name).toBe('string')
    expect(manifest.id).toBe('/')
    expect(manifest.lang).toBe('id')
    expect(manifest.start_url).toBe('/')
    expect(manifest.scope).toBe('/')
    expect(manifest.display).toBe('standalone')
    expect(manifest.theme_color).toBe('#00A155')
    expect(manifest.background_color).toBe('#ffffff')

    const icons = manifest.icons as Array<{ src?: string; sizes?: string; purpose?: string }>

    expect(Array.isArray(icons)).toBe(true)
    expect(icons.length).toBeGreaterThanOrEqual(3)
    expect(icons.some(icon => icon.sizes === '192x192')).toBe(true)
    expect(icons.some(icon => icon.sizes === '512x512')).toBe(true)
    expect(icons.some(icon => icon.purpose === 'maskable')).toBe(true)
    expect(icons.every(icon => icon.src?.startsWith('/'))).toBe(true)
    expect(icons.some(icon => icon.purpose === 'any')).toBe(false)
  })

  it('ikon tersedia dengan 200 image/png dan ter-decode penuh', async () => {
    const expected: Array<{ path: string; width: number; height: number }> = [
      { path: '/pwa-icon-192.png', width: 192, height: 192 },
      { path: '/pwa-icon-512.png', width: 512, height: 512 },
      { path: '/pwa-maskable-512.png', width: 512, height: 512 }
    ]

    for (const icon of expected) {
      const response = await fetch(`${origin}${icon.path}`)

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('image/png')

      const bytes = Buffer.from(await response.arrayBuffer())

      expect(bytes.subarray(1, 4).toString('latin1')).toBe('PNG')
      expect(bytes.readUInt32BE(16)).toBe(icon.width)
      expect(bytes.readUInt32BE(20)).toBe(icon.height)

      const inflated = inflateSync(collectIdat(bytes))

      expect(inflated.length).toBe(icon.height * (1 + icon.width * 4))
    }
  })
})
