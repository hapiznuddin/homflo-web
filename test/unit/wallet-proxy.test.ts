/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - handler module relies on Nitro auto-imports, installed as
// globals below; the unit tsconfig does not include Nitro types.
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn()

beforeAll(() => {
  Object.assign(globalThis as Record<string, unknown>, {
    defineEventHandler: (handler: unknown) => handler,
    laravelBase: () => 'http://laravel.test/api',
    forwardAuthHeaders: () => ({
      cookie: 'homflo-session=abc',
      origin: 'http://localhost:3000'
    }),
    $fetch: fetchMock,
    createError: (input: Record<string, unknown>) =>
      Object.assign(new Error(String(input.message ?? 'error')), input)
  })
})

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({ success: true, data: [] })
})

const modules = import.meta.glob('../../server/api/wallets/**/*.ts')

async function load(name: string): Promise<(event: unknown) => unknown> {
  const module = await modules[`../../server/api/wallets/${name}`]!()

  return (module as { default: (event: unknown) => unknown }).default
}

describe('Wallets proxy', () => {
  it('GET /api/wallets meneruskan sesi ke /wallets tanpa body atau query arbitrer', async () => {
    const handler = await load('index.get.ts')

    await handler({})

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('http://laravel.test/api/wallets', {
      headers: {
        Accept: 'application/json',
        cookie: 'homflo-session=abc',
        origin: 'http://localhost:3000'
      }
    })

    const [, options] = fetchMock.mock.calls[0] as [string, Record<string, unknown>]

    expect(options.method).toBeUndefined()
    expect(options.body).toBeUndefined()
  })

  it('mempertahankan status dan body error Laravel (401 tamu / 404 household)', async () => {
    const handler = await load('index.get.ts')
    const payload = {
      success: false,
      error: { code: 'HOUSEHOLD_NOT_FOUND', message: 'Household not found.' }
    }
    const error = Object.assign(new Error('Household not found.'), {
      statusCode: 404,
      data: payload
    })

    fetchMock.mockRejectedValueOnce(error)

    // Proxy membungkus ulang lewat createError tetapi status dan body
    // Laravel (di bawah `data`) tidak di-remap.
    await expect(handler({})).rejects.toMatchObject({ statusCode: 404, data: payload })
  })

  it('hanya proxy read yang terdaftar — tidak ada endpoint write Wallet palsu', () => {
    expect(Object.keys(modules).sort()).toEqual([
      '../../server/api/wallets/index.get.ts'
    ])
  })
})
