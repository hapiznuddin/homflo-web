import { describe, expect, it } from 'vitest'
import { pickInvitationEmail, pickInvitationToken } from '../../server/utils/invitationBody'

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

describe('pickInvitationEmail', () => {
  it('hanya meneruskan email string dan menjatuhkan field lain', () => {
    expect(pickInvitationEmail({
      email: ' baru@example.com ',
      role: 'owner',
      household_id: 'h-lain',
      token: 'token-lain'
    })).toBe('baru@example.com')
  })

  it('menghasilkan string kosong untuk body atau email yang tidak valid', () => {
    expect(pickInvitationEmail(null)).toBe('')
    expect(pickInvitationEmail(undefined)).toBe('')
    expect(pickInvitationEmail({})).toBe('')
    expect(pickInvitationEmail({ email: 123 })).toBe('')
    expect(pickInvitationEmail({ email: { address: 'baru@example.com' } })).toBe('')
    expect(pickInvitationEmail({ email: '' })).toBe('')
  })
})
