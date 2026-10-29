import { pickInvitationEmail } from '../../../utils/invitationBody'

// Hanya email yang boleh diteruskan dari browser. Household dan pengundang
// ditentukan Laravel dari route binding dan sesi.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<Record<string, unknown>>(event)

  return laravelFetch(event, `/households/${encodeURIComponent(String(id))}/invitations`, {
    method: 'POST',
    body: { email: pickInvitationEmail(body) }
  })
})
