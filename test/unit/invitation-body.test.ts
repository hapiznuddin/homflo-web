import { describe, expect, it } from 'vitest'
import { pickInvitationToken } from '../../server/utils/invitationBody'

describe('pickInvitationToken', () => {
  it('hanya meneruskan token string dan menjatuhkan field lain', () => {
    expect(pickInvitationToken({
      token: 'token-rahasia',
      user_id: 'user-lain',
      role: 'owner',
      household_id: 'h-lain'
    })).toBe('token-rahasia')
  })

  it('menghasilkan string kosong untuk body atau token yang tidak valid', () => {
    expect(pickInvitationToken(null)).toBe('')
    expect(pickInvitationToken(undefined)).toBe('')
    expect(pickInvitationToken({})).toBe('')
    expect(pickInvitationToken({ token: 123 })).toBe('')
    expect(pickInvitationToken({ token: null })).toBe('')
  })
})
