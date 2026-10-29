export function pickInvitationToken(body: unknown): string {
  if (typeof body !== 'object' || body === null) {
    return ''
  }

  const token = (body as { token?: unknown }).token

  return typeof token === 'string' ? token : ''
}
