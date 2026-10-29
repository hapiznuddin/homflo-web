import { pickInvitationToken } from '../../../utils/invitationBody'

// Token undangan adalah satu-satunya field yang boleh diteruskan dari
// browser. Identitas penerima selalu berasal dari sesi Laravel.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<Record<string, unknown>>(event)

  return laravelFetch(event, `/invitations/${encodeURIComponent(String(id))}/accept`, {
    method: 'POST',
    body: { token: pickInvitationToken(body) }
  })
})
