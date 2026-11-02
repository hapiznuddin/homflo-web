/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - handler modules rely on Nitro auto-imports, which are
// installed as globals below; the unit tsconfig does not include Nitro types.
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Proxy handlers rely on Nitro auto-imports. The unit project runs in plain
// Node, so the globals are installed before the lazy imports execute.
const laravelFetch = vi.fn()
const readBody = vi.fn()
const getQuery = vi.fn()
const getRouterParam = vi.fn()

beforeAll(() => {
  Object.assign(globalThis as Record<string, unknown>, {
    defineEventHandler: (handler: unknown) => handler,
    laravelFetch,
    readBody,
    getQuery,
    getRouterParam,
    createError: (input: Record<string, unknown>) =>
      Object.assign(new Error(String(input.message ?? 'error')), input)
  })
})

beforeEach(() => {
  laravelFetch.mockReset()
  readBody.mockReset()
  getQuery.mockReset()
  getRouterParam.mockReset()

  laravelFetch.mockResolvedValue({ success: true })
  readBody.mockResolvedValue({})
  getQuery.mockReturnValue({})
  getRouterParam.mockReturnValue(undefined)
})

const householdModules = import.meta.glob('../../server/api/households/**/*.ts')

async function loadHousehold(name: string): Promise<(event: unknown) => unknown> {
  const module = await householdModules[`../../server/api/households/${name}`]!()

  return (module as { default: (event: unknown) => unknown }).default
}

async function loadPreference(
  name: 'get' | 'patch'
): Promise<(event: unknown) => unknown> {
  // Glob di akar server/api tidak dapat diandalkan di unit project; pakai
  // import dinamis langsung.
  const module = await import(`../../server/api/preferences.${name}.ts`)

  return (module as { default: (event: unknown) => unknown }).default
}

function params(values: Record<string, string>) {
  getRouterParam.mockImplementation((_event: unknown, name: string) => values[name])
}

describe('Household settings proxies', () => {
  it('PATCH /api/households/{id} meneruskan hanya nama dan meng-encode id', async () => {
    const handler = await loadHousehold('[id].patch.ts')
    params({ id: 'h/1' })
    readBody.mockResolvedValue({ name: 'Rumah Baru', role: 'owner', household_id: 'h2' })

    await handler({})

    expect(laravelFetch).toHaveBeenCalledWith({}, '/households/h%2F1', {
      method: 'PATCH',
      body: { name: 'Rumah Baru' }
    })
  })

  it('PATCH /api/households/{id} tanpa nama string mengirim string kosong', async () => {
    const handler = await loadHousehold('[id].patch.ts')
    params({ id: 'h1' })
    readBody.mockResolvedValue({ name: 42 })

    await handler({})

    expect(laravelFetch).toHaveBeenCalledWith({}, '/households/h1', {
      method: 'PATCH',
      body: { name: '' }
    })
  })

  it('POST /api/households/{id}/activate memanggil endpoint aktivasi', async () => {
    const handler = await loadHousehold('[id]/activate.post.ts')
    params({ id: 'h2' })

    await handler({})

    expect(laravelFetch).toHaveBeenCalledWith({}, '/households/h2/activate', {
      method: 'POST'
    })
  })
})

describe('Household invitations proxies', () => {
  it('GET /api/households/{id}/invitations meneruskan status sebagai query', async () => {
    const handler = await loadHousehold('[id]/invitations.get.ts')
    params({ id: 'h1' })
    getQuery.mockReturnValue({ status: 'all', evil: 'x' })

    await handler({})

    expect(laravelFetch).toHaveBeenCalledWith({}, '/households/h1/invitations?status=all')
  })

  it('GET invitations tanpa status memanggil route tanpa query', async () => {
    const handler = await loadHousehold('[id]/invitations.get.ts')
    params({ id: 'h1' })
    getQuery.mockReturnValue({ evil: 'x' })

    await handler({})

    expect(laravelFetch).toHaveBeenCalledWith({}, '/households/h1/invitations')
  })

  it('GET invitations meng-encode nilai status dan id', async () => {
    const handler = await loadHousehold('[id]/invitations.get.ts')
    params({ id: 'h/1' })
    getQuery.mockReturnValue({ status: 'a&b' })

    await handler({})

    expect(laravelFetch).toHaveBeenCalledWith(
      {},
      '/households/h%2F1/invitations?status=a%26b'
    )
  })

  it('POST revoke memanggil route cabut dengan id ter-encode', async () => {
    const handler = await loadHousehold('[id]/invitations/[invitationId]/revoke.post.ts')
    params({ id: 'h1', invitationId: 'inv/../x' })

    await handler({})

    expect(laravelFetch).toHaveBeenCalledWith(
      {},
      '/households/h1/invitations/inv%2F..%2Fx/revoke',
      { method: 'POST' }
    )
  })
})

describe('Preferences proxies', () => {
  it('GET /api/preferences meneruskan tanpa parameter tambahan', async () => {
    const handler = await loadPreference('get')

    await handler({})

    expect(laravelFetch).toHaveBeenCalledWith({}, '/preferences')
  })

  it('PATCH /api/preferences hanya meneruskan theme', async () => {
    const handler = await loadPreference('patch')

    readBody.mockResolvedValue({ theme: 'dark', locale: 'en', user_id: 'u1' })

    await handler({})

    expect(laravelFetch).toHaveBeenCalledWith({}, '/preferences', {
      method: 'PATCH',
      body: { theme: 'dark' }
    })
  })

  it('PATCH /api/preferences tanpa theme string mengirim string kosong', async () => {
    const handler = await loadPreference('patch')

    readBody.mockResolvedValue({ theme: ['dark'] })

    await handler({})

    expect(laravelFetch).toHaveBeenCalledWith({}, '/preferences', {
      method: 'PATCH',
      body: { theme: '' }
    })
  })
})
