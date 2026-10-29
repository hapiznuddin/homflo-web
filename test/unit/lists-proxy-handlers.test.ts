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

const modules = import.meta.glob('../../server/api/lists/**/*.ts')

async function load(name: string): Promise<(event: unknown) => unknown> {
  const module = await modules[`../../server/api/lists/${name}`]!()

  return (module as { default: (event: unknown) => unknown }).default
}

function params(values: Record<string, string>) {
  getRouterParam.mockImplementation((_event: unknown, name: string) => values[name])
}

describe('Lists GET proxies', () => {
  it('GET /api/lists forwards only whitelisted query keys', async () => {
    const handler = await load('index.get.ts')
    getQuery.mockReturnValue({ include_archived: 'true', type: 'shopping', evil: 'x' })

    await handler({})

    expect(laravelFetch).toHaveBeenCalledWith({}, '/lists?include_archived=true&type=shopping')
  })

  it('GET /api/lists/default targets the default route', async () => {
    const handler = await load('default.get.ts')

    await handler({})

    expect(laravelFetch).toHaveBeenCalledWith({}, '/lists/default')
  })

  it('GET /api/lists/{id} encodes the id', async () => {
    const handler = await load('[id].get.ts')
    params({ id: 'abc/def' })

    await handler({})

    expect(laravelFetch).toHaveBeenCalledWith({}, '/lists/abc%2Fdef')
  })

  it('GET /api/lists/{id}/items ignores query params and returns both groups', async () => {
    const handler = await load('[id]/items/index.get.ts')
    params({ id: 'list-1' })
    getQuery.mockReturnValue({ status: 'completed', evil: 'x' })

    await handler({})

    expect(laravelFetch).toHaveBeenCalledWith({}, '/lists/list-1/items')
  })

  it('the non-MVP nested item GET proxy is not registered', async () => {
    expect(modules['../../server/api/lists/[id]/items/[itemId].get.ts']).toBeUndefined()
  })
})

describe('Lists write proxies', () => {
  it('POST /api/lists whitelists name/type', async () => {
    const handler = await load('index.post.ts')
    readBody.mockResolvedValue({ name: 'Belanja', type: 'shopping', household_id: 'h1' })

    await handler({})

    expect(laravelFetch).toHaveBeenCalledWith({}, '/lists', {
      method: 'POST',
      body: { name: 'Belanja', type: 'shopping' }
    })
  })

  it('PATCH /api/lists/{id} only forwards name', async () => {
    const handler = await load('[id].patch.ts')
    params({ id: 'list-1' })
    readBody.mockResolvedValue({ name: 'Baru', type: 'custom' })

    await handler({})

    expect(laravelFetch).toHaveBeenCalledWith({}, '/lists/list-1', {
      method: 'PATCH',
      body: { name: 'Baru' }
    })
  })

  it('archive and restore post to their lifecycle routes', async () => {
    const archive = await load('[id]/archive.post.ts')
    const restore = await load('[id]/restore.post.ts')
    params({ id: 'list-1' })

    await archive({})
    await restore({})

    expect(laravelFetch).toHaveBeenNthCalledWith(1, {}, '/lists/list-1/archive', { method: 'POST' })
    expect(laravelFetch).toHaveBeenNthCalledWith(2, {}, '/lists/list-1/restore', { method: 'POST' })
  })

  it('POST /api/lists/{id}/items whitelists item fields', async () => {
    const handler = await load('[id]/items/index.post.ts')
    params({ id: 'list-1' })
    readBody.mockResolvedValue({
      title: 'Sabun',
      quantity: '2',
      unit: 'pcs',
      estimated_price: '',
      list_id: 'evil',
      created_by: 'evil'
    })

    await handler({})

    expect(laravelFetch).toHaveBeenCalledWith({}, '/lists/list-1/items', {
      method: 'POST',
      body: { title: 'Sabun', quantity: '2', unit: 'pcs', estimated_price: null }
    })
  })

  it('PATCH /api/lists/{id}/items/{itemId} whitelists item update fields', async () => {
    const handler = await load('[id]/items/[itemId].patch.ts')
    params({ id: 'list-1', itemId: 'item-1' })
    readBody.mockResolvedValue({
      actual_price: '12500',
      status: 'completed',
      completed_at: 'x'
    })

    await handler({})

    expect(laravelFetch).toHaveBeenCalledWith({}, '/lists/list-1/items/item-1', {
      method: 'PATCH',
      body: { actual_price: '12500' }
    })
  })

  it('DELETE /api/lists/{id}/items/{itemId} uses DELETE', async () => {
    const handler = await load('[id]/items/[itemId].delete.ts')
    params({ id: 'list-1', itemId: 'item-1' })

    await handler({})

    expect(laravelFetch).toHaveBeenCalledWith({}, '/lists/list-1/items/item-1', {
      method: 'DELETE'
    })
  })

  it('complete forwards a price but omits an empty value', async () => {
    const handler = await load('[id]/items/[itemId]/complete.post.ts')
    params({ id: 'list-1', itemId: 'item-1' })

    readBody.mockResolvedValue({ actual_price: '12500.00' })
    await handler({})

    readBody.mockResolvedValue({ actual_price: '' })
    await handler({})

    expect(laravelFetch).toHaveBeenNthCalledWith(
      1,
      {},
      '/lists/list-1/items/item-1/complete',
      { method: 'POST', body: { actual_price: '12500.00' } }
    )
    expect(laravelFetch).toHaveBeenNthCalledWith(
      2,
      {},
      '/lists/list-1/items/item-1/complete',
      { method: 'POST', body: {} }
    )
  })

  it('uncomplete posts without a body', async () => {
    const handler = await load('[id]/items/[itemId]/uncomplete.post.ts')
    params({ id: 'list-1', itemId: 'item-1' })

    await handler({})

    expect(laravelFetch).toHaveBeenCalledWith({}, '/lists/list-1/items/item-1/uncomplete', {
      method: 'POST'
    })
  })

  it('propagates the Laravel status and body without remapping', async () => {
    const handler = await load('[id]/items/[itemId]/complete.post.ts')
    params({ id: 'list-1', itemId: 'item-1' })
    const payload = {
      success: false,
      error: { code: 'LIST_ITEM_PRICE_LOCKED', message: 'Actual price locked.' }
    }
    const error = Object.assign(new Error('Actual price locked.'), {
      statusCode: 409,
      data: payload
    })
    laravelFetch.mockRejectedValueOnce(error)

    await expect(handler({})).rejects.toBe(error)
  })

  it('expense whitelists only the allowed fields', async () => {
    const handler = await load('[id]/items/[itemId]/expense.post.ts')
    params({ id: 'list-1', itemId: 'item-1' })
    readBody.mockResolvedValue({
      wallet_id: 'w1',
      category_id: 'c1',
      occurred_on: '2026-10-29',
      actual_price: '100',
      amount: '999999',
      description: 'evil',
      source_type: 'App\\Models\\ListItem',
      source_id: 'item-1',
      household_id: 'h1'
    })

    await handler({})

    expect(laravelFetch).toHaveBeenCalledWith({}, '/lists/list-1/items/item-1/expense', {
      method: 'POST',
      body: {
        wallet_id: 'w1',
        category_id: 'c1',
        occurred_on: '2026-10-29',
        actual_price: '100'
      }
    })
  })
})
