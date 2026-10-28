export type HouseholdMemberRole = 'owner' | 'member'

export interface HouseholdMemberItem {
  id: string
  user_id: string
  username: string
  name: string
  email: string
  role: HouseholdMemberRole
  created_at: string
  updated_at: string
}
