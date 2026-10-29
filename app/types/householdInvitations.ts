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
