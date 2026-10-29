export function pickInvitationToken(body: unknown): string {
  if (typeof body !== 'object' || body === null) {
    return ''
  }

  const token = (body as { token?: unknown }).token

  return typeof token === 'string' ? token : ''
}

// Email undangan adalah satu-satunya field yang boleh diteruskan saat
// membuat undangan. Identitas pengundang dan household selalu berasal dari
// sesi serta route Laravel, bukan dari body browser.
export function pickInvitationEmail(body: unknown): string {
  if (typeof body !== 'object' || body === null) {
    return ''
  }

  const email = (body as { email?: unknown }).email

  return typeof email === 'string' ? email.trim() : ''
}
