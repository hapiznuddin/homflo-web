import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  E2E_AUTH_ENABLED,
  startAuthenticatedEnvironment,
  type E2ETestClient,
  type FixtureData
} from './auth/harness'

interface ApiEnvelope<T> {
  success: boolean
  data: T
}

interface ListRecord {
  id: string
  name: string
  type: string
  archived_at: string | null
  counts: { active: number, completed: number }
}

interface ItemRecord {
  id: string
  list_id: string
  title: string
  quantity: string | null
  estimated_price: string | null
  actual_price: string | null
  status: 'active' | 'completed'
  expense: { id: string, amount: string } | null
}

interface ItemsResponse {
  list_id: string
  counts: { active: number, completed: number }
  active: ItemRecord[]
  completed: ItemRecord[]
}

interface WalletRecord {
  id: string
  name: string
  is_active: boolean
}

interface Environment {
  fixtures: FixtureData
  clients: {
    guest: E2ETestClient
    ownerA: E2ETestClient
    memberA: E2ETestClient
    unverifiedA: E2ETestClient
    ownerB: E2ETestClient
  }
  stop: () => Promise<void>
}

function dataOf<T>(body: unknown): T {
  return (body as ApiEnvelope<T>).data
}

function nestedErrorCode(body: unknown): string | undefined {
  let node = body

  for (let depth = 0; depth < 5; depth += 1) {
    if (typeof node !== 'object' || node === null) {
      return undefined
    }

    const candidate = node as { error?: { code?: string }, data?: unknown }

    if (typeof candidate.error?.code === 'string') {
      return candidate.error.code
    }

    node = candidate.data
  }

  return undefined
}

// Wallet seeding happens directly against Laravel because the web boundary
// deliberately exposes no Wallet write proxy (wallets are read-only for the
// browser). Everything under test below flows through the Nuxt proxy.
async function seedWallet(client: E2ETestClient, runId: string): Promise<WalletRecord> {
  const response = await client.postLaravelJson<ApiEnvelope<WalletRecord>>('/api/wallets', {
    name: `E2E Wallet ${runId}`,
    type: 'cash',
    opening_balance: '100000.00'
  })

  if (response.status !== 201) {
    throw new Error(`Wallet seeding failed: HTTP ${response.status} ${JSON.stringify(response.body).slice(0, 200)}`)
  }

  return dataOf<WalletRecord>(response.body)
}

describe.skipIf(!E2E_AUTH_ENABLED)('authenticated Lists item E2E', () => {
  let env: Environment

  beforeAll(async () => {
    env = await startAuthenticatedEnvironment()
  }, 120_000)

  afterAll(async () => {
    await env?.stop()
  })

  it('guest list and item requests are proxied as 401', async () => {
    const list = await env.clients.guest.getJson('/api/lists')
    expect(list.status).toBe(401)

    const create = await env.clients.guest.postJson('/api/lists', { name: 'X', type: 'custom' })
    expect(create.status).toBe(401)

    const item = await env.clients.guest.postJson('/api/lists/01J/items', { title: 'X' })
    expect(item.status).toBe(401)
  })

  it('unverified member gets EMAIL_NOT_VERIFIED on list creation', async () => {
    const response = await env.clients.unverifiedA.postJson('/api/lists', {
      name: `Unverified List ${env.fixtures.run_id}`,
      type: 'custom'
    })

    expect(response.status).toBe(403)
    expect(nestedErrorCode(response.body)).toBe('EMAIL_NOT_VERIFIED')
  })

  it('owner drives the full item lifecycle including Expense locking', async () => {
    const { fixtures, clients } = env
    const owner = clients.ownerA
    const runId = fixtures.run_id

    // Create list through the proxy.
    const created = await owner.postJson<ApiEnvelope<ListRecord>>('/api/lists', {
      name: `E2E Lifecycle ${runId}`,
      type: 'custom'
    })
    expect(created.status).toBe(200)
    const list = dataOf<ListRecord>(created.body)
    expect(list.counts).toEqual({ active: 0, completed: 0 })

    // Create item (201 contract).
    const item = await owner.postJson<ApiEnvelope<ItemRecord>>(`/api/lists/${list.id}/items`, {
      title: 'Beli Gula',
      quantity: '2',
      unit: 'kg',
      estimated_price: '15000'
    })
    expect(item.status).toBe(200)
    const itemId = dataOf<ItemRecord>(item.body).id
    expect(dataOf<ItemRecord>(item.body).status).toBe('active')

    // Update active item.
    const updated = await owner.patchJson<ApiEnvelope<ItemRecord>>(
      `/api/lists/${list.id}/items/${itemId}`,
      { title: 'Beli Gula Pasir', quantity: '3' }
    )
    expect(updated.status).toBe(200)
    expect(dataOf<ItemRecord>(updated.body).title).toBe('Beli Gula Pasir')
    expect(dataOf<ItemRecord>(updated.body).quantity).toBe('3.00')

    // Complete with an actual price snapshot.
    const completed = await owner.postJson<ApiEnvelope<ItemRecord>>(
      `/api/lists/${list.id}/items/${itemId}/complete`,
      { actual_price: '12500' }
    )
    expect(completed.status).toBe(200)
    expect(dataOf<ItemRecord>(completed.body).status).toBe('completed')
    expect(dataOf<ItemRecord>(completed.body).actual_price).toBe('12500.00')

    // Idempotency/concurrency contract: completing again is a 409.
    const recomplete = await owner.postJson<ApiEnvelope<unknown>>(
      `/api/lists/${list.id}/items/${itemId}/complete`
    )
    expect(recomplete.status).toBe(409)
    expect(nestedErrorCode(recomplete.body)).toBe('LIST_ITEM_ALREADY_COMPLETED')

    // Expense through the dedicated list-item endpoint (owner-only).
    const wallet = await seedWallet(owner, `${runId}-own`)
    const expense = await owner.postJson<ApiEnvelope<{ created: boolean, expense: { amount: string } }>>(
      `/api/lists/${list.id}/items/${itemId}/expense`,
      { wallet_id: wallet.id }
    )
    // Laravel emits 201 upstream; the Nitro proxy normalizes 2xx to 200,
    // so the web boundary contract is 200 + { created:false|true } body.
    expect(expense.status).toBe(200)
    expect(dataOf<{ created: boolean }>(expense.body).created).toBe(true)
    expect(dataOf<{ expense: { amount: string } }>(expense.body).expense.amount).toBe('12500.00')

    // Retry is idempotent: same stored Expense, created=false, HTTP 200.
    const retry = await owner.postJson<ApiEnvelope<{ created: boolean }>>(
      `/api/lists/${list.id}/items/${itemId}/expense`,
      { wallet_id: wallet.id }
    )
    expect(retry.status).toBe(200)
    expect(dataOf<{ created: boolean }>(retry.body).created).toBe(false)

    // Price is locked once the Expense exists.
    const locked = await owner.patchJson<ApiEnvelope<unknown>>(
      `/api/lists/${list.id}/items/${itemId}`,
      { actual_price: '99000' }
    )
    expect(locked.status).toBe(409)
    expect(nestedErrorCode(locked.body)).toBe('LIST_ITEM_PRICE_LOCKED')

    // Uncomplete retains the actual_price snapshot but the Expense survives.
    const uncompleted = await owner.postJson<ApiEnvelope<ItemRecord>>(
      `/api/lists/${list.id}/items/${itemId}/uncomplete`
    )
    expect(uncompleted.status).toBe(200)
    expect(dataOf<ItemRecord>(uncompleted.body).status).toBe('active')
    expect(dataOf<ItemRecord>(uncompleted.body).actual_price).toBe('12500.00')

    // Deletion stays blocked while the Expense exists (either status).
    const blocked = await owner.deleteJson(`/api/lists/${list.id}/items/${itemId}`)
    expect(blocked.status).toBe(409)
    expect(nestedErrorCode(blocked.body)).toBe('LIST_ITEM_HAS_EXPENSE')

    // Grouped read still shows the item after uncomplete.
    const items = await owner.getJson<ApiEnvelope<ItemsResponse>>(`/api/lists/${list.id}/items`)
    expect(items.status).toBe(200)
    expect(dataOf<ItemsResponse>(items.body).counts.active).toBe(1)
    expect(dataOf<ItemsResponse>(items.body).counts.completed).toBe(0)
  })

  it('item without Expense can be deleted after completion round-trip', async () => {
    const { clients } = env
    const owner = clients.ownerA

    const created = await owner.postJson<ApiEnvelope<ListRecord>>('/api/lists', {
      name: `E2E Deletable ${env.fixtures.run_id}`,
      type: 'custom'
    })
    expect(created.status).toBe(200)
    const list = dataOf<ListRecord>(created.body)

    const item = await owner.postJson<ApiEnvelope<ItemRecord>>(`/api/lists/${list.id}/items`, {
      title: 'Tanpa expense'
    })
    expect(item.status).toBe(200)
    const itemId = dataOf<ItemRecord>(item.body).id

    await owner.postJson(`/api/lists/${list.id}/items/${itemId}/complete`)
    await owner.postJson(`/api/lists/${list.id}/items/${itemId}/uncomplete`)

    const removed = await owner.deleteJson<ApiEnvelope<{ id: string }>>(
      `/api/lists/${list.id}/items/${itemId}`
    )
    expect(removed.status).toBe(200)
    expect(dataOf<{ id: string }>(removed.body).id).toBe(itemId)

    const items = await owner.getJson<ApiEnvelope<ItemsResponse>>(`/api/lists/${list.id}/items`)
    expect(dataOf<ItemsResponse>(items.body).counts).toEqual({ active: 0, completed: 0 })
  })

  it('member may create lists and manage items, but not create Expenses', async () => {
    const { fixtures, clients } = env
    const member = clients.memberA

    // Backend contract: every household member can create and manage lists.
    const created = await member.postJson<ApiEnvelope<ListRecord>>('/api/lists', {
      name: `E2E Member List ${fixtures.run_id}`,
      type: 'shopping'
    })
    expect(created.status).toBe(200)
    const list = dataOf<ListRecord>(created.body)

    const item = await member.postJson<ApiEnvelope<ItemRecord>>(`/api/lists/${list.id}/items`, {
      title: 'Item anggota'
    })
    expect(item.status).toBe(200)
    const itemId = dataOf<ItemRecord>(item.body).id

    const updated = await member.patchJson<ApiEnvelope<ItemRecord>>(
      `/api/lists/${list.id}/items/${itemId}`,
      { title: 'Item anggota revisi' }
    )
    expect(updated.status).toBe(200)

    const completed = await member.postJson<ApiEnvelope<ItemRecord>>(
      `/api/lists/${list.id}/items/${itemId}/complete`
    )
    expect(completed.status).toBe(200)

    // Expense creation is owner-only; the member surfaces FORBIDDEN. The
    // owner gate runs before wallet validation, so a syntactically valid
    // (nonexistent) ULID is enough to reach it — and WalletPolicy forbids
    // members from creating a wallet anyway.
    const denied = await member.postJson<ApiEnvelope<unknown>>(
      `/api/lists/${list.id}/items/${itemId}/expense`,
      { wallet_id: list.id }
    )
    expect(denied.status).toBe(403)
    expect(nestedErrorCode(denied.body)).toBe('FORBIDDEN')

    // Member can still delete its own completed item without Expense.
    const removed = await member.deleteJson(`/api/lists/${list.id}/items/${itemId}`)
    expect(removed.status).toBe(200)
  })

  it('archived list is read-only through the proxy while reads stay open', async () => {
    const { fixtures, clients } = env
    const owner = clients.ownerA

    const created = await owner.postJson<ApiEnvelope<ListRecord>>('/api/lists', {
      name: `E2E Archived ${fixtures.run_id}`,
      type: 'custom'
    })
    expect(created.status).toBe(200)
    const list = dataOf<ListRecord>(created.body)

    const item = await owner.postJson<ApiEnvelope<ItemRecord>>(`/api/lists/${list.id}/items`, {
      title: 'Sebelum arsip'
    })
    expect(item.status).toBe(200)
    const itemId = dataOf<ItemRecord>(item.body).id

    const archived = await owner.postJson<ApiEnvelope<ListRecord>>(
      `/api/lists/${list.id}/archive`
    )
    expect(archived.status).toBe(200)
    expect(dataOf<ListRecord>(archived.body).archived_at).not.toBeNull()

    const itemCreate = await owner.postJson<ApiEnvelope<unknown>>(
      `/api/lists/${list.id}/items`,
      { title: 'Sesudah arsip' }
    )
    expect(itemCreate.status).toBe(409)
    expect(nestedErrorCode(itemCreate.body)).toBe('LIST_ARCHIVED')

    const itemUpdate = await owner.patchJson<ApiEnvelope<unknown>>(
      `/api/lists/${list.id}/items/${itemId}`,
      { title: 'Ditahan arsip' }
    )
    expect(itemUpdate.status).toBe(409)
    expect(nestedErrorCode(itemUpdate.body)).toBe('LIST_ARCHIVED')

    const itemDelete = await owner.deleteJson(`/api/lists/${list.id}/items/${itemId}`)
    expect(itemDelete.status).toBe(409)
    expect(nestedErrorCode(itemDelete.body)).toBe('LIST_ARCHIVED')

    // Reads remain open for archived lists.
    const read = await owner.getJson<ApiEnvelope<ItemsResponse>>(`/api/lists/${list.id}/items`)
    expect(read.status).toBe(200)
    expect(dataOf<ItemsResponse>(read.body).counts.active).toBe(1)

    // Restore reopens writes.
    const restored = await owner.postJson<ApiEnvelope<ListRecord>>(`/api/lists/${list.id}/restore`)
    expect(restored.status).toBe(200)
    expect(dataOf<ListRecord>(restored.body).archived_at).toBeNull()

    const reopened = await owner.patchJson<ApiEnvelope<ItemRecord>>(
      `/api/lists/${list.id}/items/${itemId}`,
      { title: 'Pulih' }
    )
    expect(reopened.status).toBe(200)
  })

  it('cross-household access is masked as 404', async () => {
    const { fixtures, clients } = env
    const owner = clients.ownerA

    const created = await owner.postJson<ApiEnvelope<ListRecord>>('/api/lists', {
      name: `E2E Isolation ${fixtures.run_id}`,
      type: 'custom'
    })
    expect(created.status).toBe(200)
    const list = dataOf<ListRecord>(created.body)

    const item = await owner.postJson<ApiEnvelope<ItemRecord>>(`/api/lists/${list.id}/items`, {
      title: 'Rahasia A'
    })
    const itemId = dataOf<ItemRecord>(item.body).id

    const foreignRead = await clients.ownerB.getJson(`/api/lists/${list.id}`)
    expect(foreignRead.status).toBe(404)

    const foreignItems = await clients.ownerB.getJson(`/api/lists/${list.id}/items`)
    expect(foreignItems.status).toBe(404)

    const foreignUpdate = await clients.ownerB.patchJson<ApiEnvelope<unknown>>(
      `/api/lists/${list.id}/items/${itemId}`,
      { title: 'X' }
    )
    expect(foreignUpdate.status).toBe(404)

    const foreignDelete = await clients.ownerB.deleteJson(`/api/lists/${list.id}/items/${itemId}`)
    expect(foreignDelete.status).toBe(404)

    // Confirm the untouched payload stays intact for the true owner.
    const ownRead = await owner.getJson<ApiEnvelope<ItemsResponse>>(`/api/lists/${list.id}/items`)
    expect(dataOf<ItemsResponse>(ownRead.body).active[0]?.title).toBe('Rahasia A')
  })
})
