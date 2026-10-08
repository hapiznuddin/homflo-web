import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Regresi untuk akar masalah "CSS 404": HTML hasil build harus
// menautkan stylesheet HANYA lewat aset /_nuxt/*.css yang diserve 200
// text/css, dan tidak boleh menyebut /main.css (referensi stylesheet
// manual yang pernah memicu request 404 di panel Network browser).

const serverEntry = resolve(process.cwd(), '.output/server/index.mjs')
const hasBuild = existsSync(serverEntry)
const port = 4317
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

function stylesheetHrefs(html: string): string[] {
  const hrefs: string[] = []
  const pattern = /<link[^>]+rel="stylesheet"[^>]*>/g

  for (const tag of html.match(pattern) ?? []) {
    const match = tag.match(/href="([^"]+)"/)

    if (match?.[1]) {
      hrefs.push(match[1])
    }
  }

  return hrefs
}

async function loadRoute(path: string): Promise<{ html: string; sheets: string[] }> {
  const response = await fetch(`${origin}${path}`)

  expect(response.status).toBe(200)

  const html = await response.text()

  return { html, sheets: stylesheetHrefs(html) }
}

describe.skipIf(!hasBuild)('generated HTML stylesheet contract', () => {
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

  for (const path of ['/', '/login']) {
    it(`route ${path}: stylesheet hanya /_nuxt/*.css, nol referensi main.css`, async () => {
      const { html, sheets } = await loadRoute(path)

      expect(html).not.toContain('main.css')
      expect(sheets.length).toBeGreaterThan(0)

      for (const href of sheets) {
        expect(href.startsWith('/_nuxt/')).toBe(true)
        expect(href.endsWith('.css')).toBe(true)
      }
    })

    it(`route ${path}: setiap stylesheet tersedia 200 text/css`, async () => {
      const { sheets } = await loadRoute(path)

      for (const href of sheets) {
        const response = await fetch(`${origin}${href}`)

        expect(response.status).toBe(200)
        expect(response.headers.get('content-type')).toContain('text/css')
      }
    })
  }
})
