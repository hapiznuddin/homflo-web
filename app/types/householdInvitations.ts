// Kontrak undangan rumah tangga (mirror presenter
// HouseholdInvitationService::presentInvitation). Token mentah hanya
// dikembalikan sekali saat undangan dibuat dan tidak pernah disimpan
// backend, jadi UI wajib menampilkannya kepada pengundang saat itu juga.

export interface HouseholdInvitationSummary {
  id: string
  household: {
    id: string
    name: string
  }
  email: string
  status: string
  expires_at: string
  created_at: string
}

export interface CreatedHouseholdInvitation {
  invitation: HouseholdInvitationSummary
  token: string
}

// Owner-side invitation row. The token hash is never part of this response.
export type HouseholdInvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired'

export interface HouseholdInvitationItem {
  id: string
  email: string
  status: HouseholdInvitationStatus
  expires_at: string
  created_at: string
  accepted_at: string | null
  revoked_at: string | null
  invited_by: {
    id: string
    name: string
  } | null
}

export interface RevokedHouseholdInvitation {
  id: string
  status: 'revoked'
  revoked_at: string | null
}
