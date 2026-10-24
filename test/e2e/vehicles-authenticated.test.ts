import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  E2E_AUTH_ENABLED,
  createTestClient,
  startAuthenticatedEnvironment,
  type E2ETestClient,
  type FixtureData
} from './auth/harness'

interface ApiEnvelope<T> {
  success: boolean
  data: T
}

interface VehicleRecord {
  id: string
  name: string
  odometer: number | null
}

interface MaintenanceRecord {
  id: string
  title: string
  status: string
  odometer: number | null
}

interface ObligationTypeRecord {
  id: string
  name: string
  code: string | null
  is_system: boolean
}

interface ObligationRecord {
  id: string
  title: string
  status: string
}

interface Environment {
  fixtures: FixtureData
  password: string
  clients: {
    guest: E2ETestClient
    ownerA: E2ETestClient
    memberA: E2ETestClient
    unverifiedA: E2ETestClient
    ownerB: E2ETestClient
  }
  stop: () => Promise<void>
}

const state = {
  ownerVehicleId: '',
  ownerMaintenanceId: '',
  customTypeId: '',
  customObligationId: ''
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

function nestedFieldError(body: unknown, field: string): string | undefined {
  let node = body

  for (let depth = 0; depth < 5; depth += 1) {
    if (typeof node !== 'object' || node === null) {
      return undefined
    }

    const candidate = node as {
      errors?: Record<string, unknown>
      data?: unknown
    }
    const errors = candidate.errors

    if (errors && typeof errors === 'object') {
      const values = errors[field]

      if (Array.isArray(values) && typeof values[0] === 'string') {
        return values[0]
      }
    }

    node = candidate.data
  }

  return undefined
}

function futureDate(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)
}

async function expectAuthenticated(client: E2ETestClient, email: string): Promise<void> {
  const me = await client.getJson<{
    success: boolean
    data: { user: { email: string }, household: { id: string, role: string } | null }
  }>('/api/auth/me')

  expect(me.status).toBe(200)
  expect(me.body?.data?.user?.email).toBe(email)
}

function expectLoginRedirect(status: number, location: string | null, body: string): void {
  if (status >= 300 && status < 400) {
    expect(location ?? '').toContain('/login')

    return
  }

  expect(status).toBe(200)
  expect(body).toContain('Selamat Datang Kembali')
}

describe.skipIf(!E2E_AUTH_ENABLED)('authenticated vehicles E2E', () => {
  let env: Environment

  beforeAll(async () => {
    env = await startAuthenticatedEnvironment()
  }, 120_000)

  afterAll(async () => {
    await env?.stop()
  })

  describe('owner Household A', () => {
    it('reads seeded vehicles, service history, obligations, and types', async () => {
      const { fixtures, clients } = env

      const list = await clients.ownerA.getJson<ApiEnvelope<VehicleRecord[]>>('/api/vehicles')
      expect(list.status).toBe(200)
      expect(dataOf<VehicleRecord[]>(list.body).map(item => item.name)).toContain(fixtures.vehicles.a.name)

      const detail = await clients.ownerA.getJson<ApiEnvelope<VehicleRecord>>(
        `/api/vehicles/${fixtures.vehicles.a.id}`
      )
      expect(detail.status).toBe(200)
      expect(dataOf<VehicleRecord>(detail.body).id).toBe(fixtures.vehicles.a.id)

      const maintenance = await clients.ownerA.getJson<ApiEnvelope<MaintenanceRecord[]>>(
        `/api/vehicles/${fixtures.vehicles.a.id}/maintenance`
      )
      expect(maintenance.status).toBe(200)
      expect(dataOf<MaintenanceRecord[]>(maintenance.body).map(item => item.id)).toContain(
        fixtures.maintenance.scheduled.id
      )

      const obligations = await clients.ownerA.getJson<ApiEnvelope<ObligationRecord[]>>(
        `/api/vehicles/${fixtures.vehicles.a.id}/obligations`
      )
      expect(obligations.status).toBe(200)
      expect(dataOf<ObligationRecord[]>(obligations.body).map(item => item.title)).toContain(
        fixtures.obligations.custom.title
      )

      const types = await clients.ownerA.getJson<ApiEnvelope<ObligationTypeRecord[]>>(
        '/api/obligation-types'
      )
      expect(types.status).toBe(200)

      const typeIds = dataOf<ObligationTypeRecord[]>(types.body).map(item => item.id)
      expect(typeIds).toContain(fixtures.obligation_types.system_tax.id)
      expect(typeIds).toContain(fixtures.obligation_types.custom.id)

      const page = await clients.ownerA.getPage('/vehicles')
      expect(page.status).toBe(200)
      expect(page.body).toContain(fixtures.vehicles.a.name)
      expect(page.body).toContain('Tambah Kendaraan')
    })

    it('creates, reads, edits, and renders a vehicle', async () => {
      const { fixtures, clients } = env
      const name = `E2E Owner Vehicle ${fixtures.run_id}`
      const editedName = `${name} Edited`

      const created = await clients.ownerA.postJson<ApiEnvelope<VehicleRecord>>('/api/vehicles', {
        name,
        brand: 'E2E',
        model: 'Owner Flow',
        year: 2025,
        type: 'car',
        plate_number: `E2E-OWN-${fixtures.run_id.slice(-8)}`,
        odometer: 20000
      })

      expect(created.status).toBe(200)
      state.ownerVehicleId = dataOf<VehicleRecord>(created.body).id

      const detail = await clients.ownerA.getJson<ApiEnvelope<VehicleRecord>>(
        `/api/vehicles/${state.ownerVehicleId}`
      )
      expect(detail.status).toBe(200)
      expect(dataOf<VehicleRecord>(detail.body).name).toBe(name)

      const edited = await clients.ownerA.patchJson<ApiEnvelope<VehicleRecord>>(
        `/api/vehicles/${state.ownerVehicleId}`,
        { name: editedName, model: 'Owner Flow Edited' }
      )
      expect(edited.status).toBe(200)
      expect(dataOf<VehicleRecord>(edited.body).name).toBe(editedName)

      const listPage = await clients.ownerA.getPage('/vehicles')
      expect(listPage.status).toBe(200)
      expect(listPage.body).toContain(editedName)
      expect(listPage.body).toContain('Tambah Kendaraan')
      expect(listPage.body).not.toContain(fixtures.vehicles.b.name)

      const detailPage = await clients.ownerA.getPage(`/vehicles/${state.ownerVehicleId}`)
      expect(detailPage.status).toBe(200)
      expect(detailPage.body).toContain(editedName)
      expect(detailPage.body).toContain('Tambah Servis')
      expect(detailPage.body).toContain('Tambah Kewajiban')
    })

    it('enforces odometer invariants and completes a scheduled service once', async () => {
      const { clients } = env

      const aboveVehicle = await clients.ownerA.postJson<unknown>(
        `/api/vehicles/${state.ownerVehicleId}/maintenance`,
        {
          title: 'E2E Above Vehicle Odometer',
          scheduled_date: futureDate(7),
          odometer: 20001
        }
      )
      expect(aboveVehicle.status).toBe(422)
      expect(nestedFieldError(aboveVehicle.body, 'odometer')).toBeTruthy()

      const created = await clients.ownerA.postJson<ApiEnvelope<MaintenanceRecord>>(
        `/api/vehicles/${state.ownerVehicleId}/maintenance`,
        {
          title: 'E2E Scheduled Service',
          description: 'Created through Nuxt proxy.',
          scheduled_date: futureDate(7),
          odometer: 19000
        }
      )
      expect(created.status).toBe(200)
      expect(dataOf<MaintenanceRecord>(created.body).status).toBe('scheduled')
      state.ownerMaintenanceId = dataOf<MaintenanceRecord>(created.body).id

      const completed = await clients.ownerA.postJson<ApiEnvelope<MaintenanceRecord>>(
        `/api/vehicles/${state.ownerVehicleId}/maintenance/${state.ownerMaintenanceId}/complete`
      )
      expect(completed.status).toBe(200)
      expect(dataOf<MaintenanceRecord>(completed.body).status).toBe('completed')

      const repeated = await clients.ownerA.postJson<unknown>(
        `/api/vehicles/${state.ownerVehicleId}/maintenance/${state.ownerMaintenanceId}/complete`
      )
      expect(repeated.status).toBe(422)
      expect(nestedErrorCode(repeated.body)).toBe('VEHICLE_MAINTENANCE_ALREADY_COMPLETED')

      const belowRecorded = await clients.ownerA.patchJson<unknown>(
        `/api/vehicles/${state.ownerVehicleId}`,
        { odometer: 18000 }
      )
      expect(belowRecorded.status).toBe(422)
      expect(nestedErrorCode(belowRecorded.body)).toBe('VEHICLE_ODOMETER_BELOW_RECORDED')

      const raised = await clients.ownerA.patchJson<ApiEnvelope<VehicleRecord>>(
        `/api/vehicles/${state.ownerVehicleId}`,
        { odometer: 21000 }
      )
      expect(raised.status).toBe(200)
      expect(dataOf<VehicleRecord>(raised.body).odometer).toBe(21000)
    })

    it('handles built-in and custom obligation type CRUD with in-use protection', async () => {
      const { fixtures, clients } = env
      const customName = `E2E Owner Custom ${fixtures.run_id}`
      const renamed = `${customName} Renamed`

      const createdType = await clients.ownerA.postJson<ApiEnvelope<ObligationTypeRecord>>(
        '/api/obligation-types',
        { name: customName }
      )
      expect(createdType.status).toBe(200)
      state.customTypeId = dataOf<ObligationTypeRecord>(createdType.body).id

      const renamedType = await clients.ownerA.patchJson<ApiEnvelope<ObligationTypeRecord>>(
        `/api/obligation-types/${state.customTypeId}`,
        { name: renamed }
      )
      expect(renamedType.status).toBe(200)
      expect(dataOf<ObligationTypeRecord>(renamedType.body).name).toBe(renamed)

      const createdObligation = await clients.ownerA.postJson<ApiEnvelope<ObligationRecord>>(
        `/api/vehicles/${state.ownerVehicleId}/obligations`,
        {
          obligation_type_id: state.customTypeId,
          title: 'E2E Custom Obligation Flow',
          description: 'Created through Nuxt proxy.',
          issued_date: futureDate(-5),
          due_date: futureDate(30),
          amount: 150000
        }
      )
      expect(createdObligation.status).toBe(200)
      state.customObligationId = dataOf<ObligationRecord>(createdObligation.body).id

      const readObligation = await clients.ownerA.getJson<ApiEnvelope<ObligationRecord>>(
        `/api/vehicles/${state.ownerVehicleId}/obligations/${state.customObligationId}`
      )
      expect(readObligation.status).toBe(200)
      expect(dataOf<ObligationRecord>(readObligation.body).title).toBe('E2E Custom Obligation Flow')

      const updatedObligation = await clients.ownerA.patchJson<ApiEnvelope<ObligationRecord>>(
        `/api/vehicles/${state.ownerVehicleId}/obligations/${state.customObligationId}`,
        { title: 'E2E Custom Obligation Updated', status: 'inactive' }
      )
      expect(updatedObligation.status).toBe(200)
      expect(dataOf<ObligationRecord>(updatedObligation.body).status).toBe('inactive')

      const inUse = await clients.ownerA.deleteJson<unknown>(
        `/api/obligation-types/${state.customTypeId}`
      )
      expect(inUse.status).toBe(422)
      expect(nestedErrorCode(inUse.body)).toBe('OBLIGATION_TYPE_IN_USE')

      const deletedObligation = await clients.ownerA.deleteJson<unknown>(
        `/api/vehicles/${state.ownerVehicleId}/obligations/${state.customObligationId}`
      )
      expect(deletedObligation.status).toBe(200)

      const deletedType = await clients.ownerA.deleteJson<unknown>(
        `/api/obligation-types/${state.customTypeId}`
      )
      expect(deletedType.status).toBe(200)

      const immutableUpdate = await clients.ownerA.patchJson<unknown>(
        `/api/obligation-types/${fixtures.obligation_types.system_tax.id}`,
        { name: 'Should Not Change' }
      )
      expect(immutableUpdate.status).toBe(422)
      expect(nestedErrorCode(immutableUpdate.body)).toBe('OBLIGATION_TYPE_IMMUTABLE')

      const immutableDelete = await clients.ownerA.deleteJson<unknown>(
        `/api/obligation-types/${fixtures.obligation_types.system_tax.id}`
      )
      expect(immutableDelete.status).toBe(422)
      expect(nestedErrorCode(immutableDelete.body)).toBe('OBLIGATION_TYPE_IMMUTABLE')

      const builtInObligation = await clients.ownerA.postJson<ApiEnvelope<ObligationRecord>>(
        `/api/vehicles/${state.ownerVehicleId}/obligations`,
        {
          obligation_type_id: fixtures.obligation_types.system_tax.id,
          title: 'E2E Built-in Obligation Flow',
          due_date: futureDate(45),
          amount: 250000
        }
      )
      expect(builtInObligation.status).toBe(200)

      const builtInId = dataOf<ObligationRecord>(builtInObligation.body).id
      const builtInRead = await clients.ownerA.getJson<ApiEnvelope<ObligationRecord>>(
        `/api/vehicles/${state.ownerVehicleId}/obligations/${builtInId}`
      )
      expect(builtInRead.status).toBe(200)

      const builtInUpdate = await clients.ownerA.patchJson<ApiEnvelope<ObligationRecord>>(
        `/api/vehicles/${state.ownerVehicleId}/obligations/${builtInId}`,
        { title: 'E2E Built-in Obligation Updated' }
      )
      expect(builtInUpdate.status).toBe(200)
      expect(dataOf<ObligationRecord>(builtInUpdate.body).title).toBe('E2E Built-in Obligation Updated')

      const builtInDelete = await clients.ownerA.deleteJson<unknown>(
        `/api/vehicles/${state.ownerVehicleId}/obligations/${builtInId}`
      )
      expect(builtInDelete.status).toBe(200)
    })
  })

  describe('member Household A', () => {
    it('can read vehicles, service history, obligations, and types', async () => {
      const { fixtures, clients } = env

      const list = await clients.memberA.getJson<ApiEnvelope<VehicleRecord[]>>('/api/vehicles')
      expect(list.status).toBe(200)
      expect(dataOf<VehicleRecord[]>(list.body).map(item => item.id)).toContain(fixtures.vehicles.a.id)

      const detail = await clients.memberA.getJson<ApiEnvelope<VehicleRecord>>(
        `/api/vehicles/${fixtures.vehicles.a.id}`
      )
      expect(detail.status).toBe(200)

      const maintenance = await clients.memberA.getJson<ApiEnvelope<MaintenanceRecord[]>>(
        `/api/vehicles/${fixtures.vehicles.a.id}/maintenance`
      )
      expect(maintenance.status).toBe(200)

      const obligations = await clients.memberA.getJson<ApiEnvelope<ObligationRecord[]>>(
        `/api/vehicles/${fixtures.vehicles.a.id}/obligations`
      )
      expect(obligations.status).toBe(200)

      const types = await clients.memberA.getJson<ApiEnvelope<ObligationTypeRecord[]>>(
        '/api/obligation-types'
      )
      expect(types.status).toBe(200)
      expect(dataOf<ObligationTypeRecord[]>(types.body).map(item => item.id)).toContain(
        fixtures.obligation_types.custom.id
      )
    })

    it('does not render owner-only controls in SSR', async () => {
      const { fixtures, clients } = env

      const listPage = await clients.memberA.getPage('/vehicles')
      expect(listPage.status).toBe(200)
      expect(listPage.body).toContain(fixtures.vehicles.a.name)
      expect(listPage.body).not.toContain('Tambah Kendaraan')

      const detailPage = await clients.memberA.getPage(`/vehicles/${fixtures.vehicles.a.id}`)
      expect(detailPage.status).toBe(200)
      expect(detailPage.body).toContain(fixtures.vehicles.a.name)
      expect(detailPage.body).not.toContain('Tambah Servis')
      expect(detailPage.body).not.toContain('Tambah Kewajiban')
      expect(detailPage.body).not.toContain('Kelola Jenis')
    })

    it('is denied every owner-only mutation with the existing 404 mask', async () => {
      const { fixtures, clients } = env
      const vehicleId = fixtures.vehicles.a.id
      const maintenanceId = fixtures.maintenance.scheduled.id
      const obligationId = fixtures.obligations.custom.id
      const typeId = fixtures.obligation_types.custom.id

      const attempts = [
        clients.memberA.postJson('/api/vehicles', {
          name: 'Member Should Not Create',
          plate_number: `E2E-MEM-${fixtures.run_id.slice(-8)}`,
          odometer: 1000
        }),
        clients.memberA.patchJson(`/api/vehicles/${vehicleId}`, { name: 'Member Should Not Edit' }),
        clients.memberA.deleteJson(`/api/vehicles/${vehicleId}`),
        clients.memberA.postJson(`/api/vehicles/${vehicleId}/maintenance`, {
          title: 'Member Should Not Create Service',
          scheduled_date: futureDate(10),
          odometer: 1000
        }),
        clients.memberA.patchJson(`/api/vehicles/${vehicleId}/maintenance/${maintenanceId}`, {
          title: 'Member Should Not Edit Service'
        }),
        clients.memberA.deleteJson(`/api/vehicles/${vehicleId}/maintenance/${maintenanceId}`),
        clients.memberA.postJson(
          `/api/vehicles/${vehicleId}/maintenance/${maintenanceId}/complete`
        ),
        clients.memberA.postJson(`/api/vehicles/${vehicleId}/obligations`, {
          obligation_type_id: fixtures.obligation_types.system_tax.id,
          title: 'Member Should Not Create Obligation',
          due_date: futureDate(20)
        }),
        clients.memberA.patchJson(`/api/vehicles/${vehicleId}/obligations/${obligationId}`, {
          title: 'Member Should Not Edit Obligation'
        }),
        clients.memberA.deleteJson(`/api/vehicles/${vehicleId}/obligations/${obligationId}`),
        clients.memberA.postJson('/api/obligation-types', { name: 'Member Should Not Create Type' }),
        clients.memberA.patchJson(`/api/obligation-types/${typeId}`, { name: 'Member Should Not Edit Type' }),
        clients.memberA.deleteJson(`/api/obligation-types/${typeId}`)
      ]

      for (const attempt of attempts) {
        const response = await attempt

        expect(response.status).toBe(404)
      }

      await expectAuthenticated(clients.memberA, fixtures.users.member_a.email)
    })
  })

  describe('owner Household B', () => {
    it('masks Household A resources as 404 and keeps the B session alive', async () => {
      const { fixtures, clients } = env
      const vehicleId = fixtures.vehicles.a.id

      const maintenanceId = fixtures.maintenance.scheduled.id
      const obligationId = fixtures.obligations.custom.id
      const customTypeId = fixtures.obligation_types.custom.id

      const attempts = [
        clients.ownerB.getJson(`/api/vehicles/${vehicleId}`),
        clients.ownerB.getJson(`/api/vehicles/${vehicleId}/maintenance`),
        clients.ownerB.getJson(`/api/vehicles/${vehicleId}/maintenance/${maintenanceId}`),
        clients.ownerB.getJson(`/api/vehicles/${vehicleId}/obligations`),
        clients.ownerB.getJson(`/api/vehicles/${vehicleId}/obligations/${obligationId}`),
        clients.ownerB.patchJson(`/api/vehicles/${vehicleId}`, { name: 'B Should Not Edit' }),
        clients.ownerB.deleteJson(`/api/vehicles/${vehicleId}`),
        clients.ownerB.postJson(`/api/vehicles/${vehicleId}/maintenance`, {
          title: 'B Should Not Create Service',
          scheduled_date: futureDate(10),
          odometer: 1000
        }),
        clients.ownerB.patchJson(`/api/vehicles/${vehicleId}/maintenance/${maintenanceId}`, {
          title: 'B Should Not Edit Service'
        }),
        clients.ownerB.deleteJson(`/api/vehicles/${vehicleId}/maintenance/${maintenanceId}`),
        clients.ownerB.postJson(
          `/api/vehicles/${vehicleId}/maintenance/${maintenanceId}/complete`
        ),
        clients.ownerB.postJson(`/api/vehicles/${vehicleId}/obligations`, {
          obligation_type_id: fixtures.obligation_types.system_tax.id,
          title: 'B Should Not Create Obligation',
          due_date: futureDate(20)
        }),
        clients.ownerB.patchJson(`/api/vehicles/${vehicleId}/obligations/${obligationId}`, {
          title: 'B Should Not Edit Obligation'
        }),
        clients.ownerB.deleteJson(`/api/vehicles/${vehicleId}/obligations/${obligationId}`),
        clients.ownerB.patchJson(`/api/obligation-types/${customTypeId}`, {
          name: 'B Should Not Edit Type'
        }),
        clients.ownerB.deleteJson(`/api/obligation-types/${customTypeId}`)
      ]

      for (const attempt of attempts) {
        const response = await attempt

        expect(response.status).toBe(404)
        await expectAuthenticated(clients.ownerB, fixtures.users.owner_b.email)
      }
    })

    it('does not leak Household A data into B reads or SSR', async () => {
      const { fixtures, clients } = env

      const types = await clients.ownerB.getJson<ApiEnvelope<ObligationTypeRecord[]>>(
        '/api/obligation-types'
      )
      expect(types.status).toBe(200)
      expect(dataOf<ObligationTypeRecord[]>(types.body).map(item => item.id)).not.toContain(
        fixtures.obligation_types.custom.id
      )

      const listPage = await clients.ownerB.getPage('/vehicles')
      expect(listPage.status).toBe(200)
      expect(listPage.body).toContain(fixtures.vehicles.b.name)
      expect(listPage.body).not.toContain(fixtures.vehicles.a.name)

      const foreignDetailPage = await clients.ownerB.getPage(`/vehicles/${fixtures.vehicles.a.id}`)
      expect(foreignDetailPage.status).toBe(200)
      expect(foreignDetailPage.body).toContain('Kendaraan tidak ditemukan.')
      expect(foreignDetailPage.body).not.toContain('Selamat Datang Kembali')

      await expectAuthenticated(clients.ownerB, fixtures.users.owner_b.email)
    })
  })

  describe('authentication boundaries', () => {
    it('keeps guests unauthenticated and redirects protected pages', async () => {
      const { clients } = env

      const me = await clients.guest.getJson('/api/auth/me')
      expect(me.status).toBe(401)

      const api = await clients.guest.getJson('/api/vehicles')
      expect(api.status).toBe(401)

      const page = await clients.guest.getPage('/vehicles')
      expectLoginRedirect(page.status, page.headers.get('location'), page.body)
    })

    it('rejects a failed login without creating a session', async () => {
      const { fixtures } = env
      const client = createTestClient()

      const attempt = await client.attemptLogin(fixtures.users.owner_a.email, 'wrong-password')
      expect(attempt.status).toBe(422)

      const me = await client.getJson('/api/auth/me')
      expect(me.status).toBe(401)
    })

    it('allows unverified reads but rejects verified-only writes', async () => {
      const { fixtures, clients } = env

      const list = await clients.unverifiedA.getJson<ApiEnvelope<VehicleRecord[]>>('/api/vehicles')
      expect(list.status).toBe(200)

      const detail = await clients.unverifiedA.getJson<ApiEnvelope<VehicleRecord>>(
        `/api/vehicles/${fixtures.vehicles.a.id}`
      )
      expect(detail.status).toBe(200)

      const createVehicle = await clients.unverifiedA.postJson<unknown>('/api/vehicles', {
        name: 'Unverified Should Not Create',
        plate_number: `E2E-UNV-${fixtures.run_id.slice(-8)}`,
        odometer: 1000
      })
      expect(createVehicle.status).toBe(403)
      expect(nestedErrorCode(createVehicle.body)).toBe('EMAIL_NOT_VERIFIED')

      const createService = await clients.unverifiedA.postJson<unknown>(
        `/api/vehicles/${fixtures.vehicles.a.id}/maintenance`,
        {
          title: 'Unverified Should Not Create Service',
          scheduled_date: futureDate(10),
          odometer: 1000
        }
      )
      expect(createService.status).toBe(403)
      expect(nestedErrorCode(createService.body)).toBe('EMAIL_NOT_VERIFIED')

      const createObligation = await clients.unverifiedA.postJson<unknown>(
        `/api/vehicles/${fixtures.vehicles.a.id}/obligations`,
        {
          obligation_type_id: fixtures.obligation_types.system_tax.id,
          title: 'Unverified Should Not Create Obligation',
          due_date: futureDate(20)
        }
      )
      expect(createObligation.status).toBe(403)
      expect(nestedErrorCode(createObligation.body)).toBe('EMAIL_NOT_VERIFIED')

      const createType = await clients.unverifiedA.postJson<unknown>('/api/obligation-types', {
        name: 'Unverified Should Not Create Type'
      })
      expect(createType.status).toBe(403)
      expect(nestedErrorCode(createType.body)).toBe('EMAIL_NOT_VERIFIED')
    })

    it('logs out through Nuxt and removes the session', async () => {
      const { fixtures, password } = env
      const client = createTestClient()

      await client.login(fixtures.users.member_a.email, password)
      await client.logout()

      const me = await client.getJson('/api/auth/me')
      expect(me.status).toBe(401)

      const page = await client.getPage('/vehicles')
      expectLoginRedirect(page.status, page.headers.get('location'), page.body)
    })

    it('keeps identity cookie jars isolated', async () => {
      const { fixtures, clients } = env
      const isolated = createTestClient()

      const me = await isolated.getJson('/api/auth/me')
      expect(me.status).toBe(401)

      await expectAuthenticated(clients.ownerA, fixtures.users.owner_a.email)
      await expectAuthenticated(clients.memberA, fixtures.users.member_a.email)
      await expectAuthenticated(clients.ownerB, fixtures.users.owner_b.email)
    })
  })
})
