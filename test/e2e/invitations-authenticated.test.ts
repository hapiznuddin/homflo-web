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

interface MeRecord {
  user: { email: string }
  household: { id: string, name?: string } | null
  households?: Array<{ id: string, name?: string }>
}

interface InvitationRecord {
  id: string
  email: string
  status: string
  household?: { id: string, name?: string }
}

interface MembershipRecord {
  id: string
  household_id: string
  user_id: string
  role: string
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

// Error bodies arrive nested by the proxy; walk up to 5 levels for error.code.
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

describe.skipIf(!E2E_AUTH_ENABLED)('authenticated invitation acceptance E2E', () => {
  let env: Environment

  beforeAll(async () => {
    env = await startAuthenticatedEnvironment()
  }, 120_000)

  afterAll(async () => {
    await env?.stop()
  })

  it('guest accept request is proxied as 401', async () => {
    const response = await env.clients.guest.postJson('/api/invitations/01H0000000000000000000000/accept', {
      token: 'not-a-real-token'
    })

    expect(response.status).toBe(401)
  })

  it('owner of another household accepts an invitation and becomes a member of two households', async () => {
    const { fixtures, clients } = env

    // owner B already belongs to household B (seeded membership).
    const before = await clients.ownerB.getJson<ApiEnvelope<MeRecord>>('/api/auth/me')
    expect(before.status).toBe(200)
    expect(dataOf<MeRecord>(before.body).household?.id).toBe(fixtures.households.b.id)

    // Owner A invites owner B's seeded email. The Nuxt proxy surfaces
    // Laravel's body verbatim with Nitro's default 200 success status.
    const invitation = await clients.ownerA.postJson<ApiEnvelope<{ invitation: InvitationRecord, token: string }>>(
      `/api/households/${fixtures.households.a.id}/invitations`,
      { email: fixtures.users.owner_b.email }
    )
    expect(invitation.status).toBe(200)
    const invitationId = dataOf<{ invitation: InvitationRecord, token: string }>(invitation.body).invitation.id
    const token = dataOf<{ invitation: InvitationRecord, token: string }>(invitation.body).token

    // Pending invitations for owner B's email include this one.
    const list = await clients.ownerB.getJson<ApiEnvelope<InvitationRecord[]>>('/api/invitations')
    expect(list.status).toBe(200)
    expect(dataOf<InvitationRecord[]>(list.body).map(item => item.id)).toContain(invitationId)

    // Accept via the Nuxt proxy: token-only body, session-owned identity.
    // The success payload is the plain membership record (no household_id),
    // so the joined household is verified via /api/auth/me below.
    const accepted = await clients.ownerB.postJson<ApiEnvelope<MembershipRecord>>(
      `/api/invitations/${invitationId}/accept`,
      { token }
    )
    expect(accepted.status).toBe(200)
    expect(dataOf<MembershipRecord>(accepted.body).id.length).toBeGreaterThan(0)
    expect(dataOf<MembershipRecord>(accepted.body).role).toBe('member')
    expect(dataOf<MembershipRecord>(accepted.body).user_id).toBe(fixtures.users.owner_b.id)

    // D8: the invited household is now the active household...
    const after = await clients.ownerB.getJson<ApiEnvelope<MeRecord>>('/api/auth/me')
    expect(after.status).toBe(200)
    expect(dataOf<MeRecord>(after.body).household?.id).toBe(fixtures.households.a.id)
    // ...while the previous membership survives.
    const householdIds = dataOf<MeRecord>(after.body).households?.map(item => item.id) ?? []
    expect(householdIds).toContain(fixtures.households.a.id)
    expect(householdIds).toContain(fixtures.households.b.id)

    // Retry must fail with the existing contract code, no duplicate side effect.
    const retry = await clients.ownerB.postJson<ApiEnvelope<unknown>>(
      `/api/invitations/${invitationId}/accept`,
      { token }
    )
    expect(retry.status).toBe(422)
    expect(nestedErrorCode(retry.body)).toBe('INVITATION_ALREADY_ACCEPTED')

    // A wrong token (or an email that is not the invitee's identity) is
    // masked as INVITATION_NOT_FOUND, never as a household/invitation leak.
    const second = await clients.ownerA.postJson<ApiEnvelope<{ invitation: InvitationRecord, token: string }>>(
      `/api/households/${fixtures.households.a.id}/invitations`,
      { email: `e2e-no-account-${fixtures.run_id}@homflo.test` }
    )
    expect(second.status).toBe(200)
    const secondId = dataOf<{ invitation: InvitationRecord, token: string }>(second.body).invitation.id

    const wrongToken = await clients.ownerB.postJson<ApiEnvelope<unknown>>(
      `/api/invitations/${secondId}/accept`,
      { token: 'definitely-not-the-token' }
    )
    expect(wrongToken.status).toBe(404)
    expect(nestedErrorCode(wrongToken.body)).toBe('INVITATION_NOT_FOUND')

    // Unrelated session user on the same invitation gets the same mask.
    const foreignToken = await clients.memberA.postJson<ApiEnvelope<unknown>>(
      `/api/invitations/${secondId}/accept`,
      { token: 'definitely-not-the-token' }
    )
    expect(foreignToken.status).toBe(404)
    expect(nestedErrorCode(foreignToken.body)).toBe('INVITATION_NOT_FOUND')

    // Isolation check stays intact for a different user segment untouched by this flow.
    const unverifiedMe = await clients.unverifiedA.getJson<ApiEnvelope<MeRecord>>('/api/auth/me')
    expect(unverifiedMe.status).toBe(200)
    expect(dataOf<MeRecord>(unverifiedMe.body).user.email).toBe(fixtures.users.unverified_a.email)
  })

  it('cannot invite a user who is already a member of the target household', async () => {
    const { fixtures, clients } = env

    // unverified_a is a seeded member of household A: the member dedupe
    // contract applies through the proxy regardless of verification.
    const response = await clients.ownerA.postJson<ApiEnvelope<unknown>>(
      `/api/households/${fixtures.households.a.id}/invitations`,
      { email: fixtures.users.unverified_a.email }
    )

    expect(response.status).toBe(422)
    expect(nestedErrorCode(response.body)).toBe('ALREADY_HOUSEHOLD_MEMBER')
  })
})
