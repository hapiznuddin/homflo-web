interface ApiErrorBody {
  message?: string
  errors?: Record<string, string[]>
  error?: { code?: string, message?: string }
}

// Envelope error codes from the Laravel API mapped to Indonesian.
const CODE_MESSAGES: Record<string, string> = {
  EMAIL_NOT_VERIFIED: 'Email Anda belum terverifikasi. Silakan verifikasi terlebih dahulu.',
  INVALID_RESET_TOKEN: 'Tautan tidak valid atau sudah kedaluwarsa. Minta tautan baru.',
  INVALID_CURRENT_PASSWORD: 'Kata sandi saat ini salah. Silakan coba lagi.',
  FORBIDDEN: 'Anda tidak memiliki akses untuk tindakan ini.',
  HOUSEHOLD_ALREADY_EXISTS: 'Anda sudah memiliki rumah tangga.',
  HOUSEHOLD_LAST_OWNER: 'Rumah tangga harus memiliki setidaknya satu pemilik.',
  HOUSEHOLD_NOT_FOUND: 'Data tidak ditemukan.',
  MEMBERSHIP_NOT_FOUND: 'Data anggota tidak ditemukan.',
  INVITATION_NOT_FOUND: 'Undangan tidak ditemukan.',
  INVITATION_ALREADY_PENDING: 'Undangan untuk email ini masih menunggu.',
  INVITATION_ALREADY_ACCEPTED: 'Undangan ini sudah diterima sebelumnya.',
  INVITATION_EXPIRED: 'Undangan sudah kedaluwarsa.',
  ALREADY_HOUSEHOLD_MEMBER: 'Pengguna sudah menjadi anggota rumah tangga ini.',
  INVITED_USER_NOT_FOUND: 'Email tersebut belum terdaftar.'
}

// Exact English backend messages mapped to Indonesian.
const MESSAGE_MAP: Record<string, string> = {
  'These credentials do not match our records.': 'Email atau kata sandi salah.',
  'The provided password is incorrect.': 'Kata sandi yang dimasukkan salah.',
  'Unauthenticated.': 'Sesi berakhir. Silakan login kembali.',
  'CSRF token mismatch.': 'Sesi kedaluwarsa. Muat ulang halaman lalu coba lagi.',
  'This password reset token is invalid.': 'Tautan tidak valid atau sudah kedaluwarsa.',
  'Please verify your email address before continuing.': 'Silakan verifikasi email Anda terlebih dahulu.'
}

const FIELD_LABELS: Record<string, string> = {
  email: 'Email',
  password: 'kata sandi',
  name: 'nama',
  username: 'nama pengguna',
  current_password: 'kata sandi saat ini',
  token: 'token'
}

function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/_/g, ' ')
}

// Laravel validation message templates mapped to Indonesian.
const MESSAGE_PATTERNS: Array<[RegExp, (field: string, extra?: string) => string]> = [
  [/^The (.+) field is required\.$/, field => `Kolom ${fieldLabel(field)} wajib diisi.`],
  [/^The (.+) must be a valid email address\.$/, field => `Kolom ${fieldLabel(field)} harus berupa email yang valid.`],
  [/^The (.+) confirmation does not match\.$/, field => `Konfirmasi ${fieldLabel(field)} tidak cocok.`],
  [/^The (.+) must be at least (\d+) characters\.$/, (field, extra) => `${fieldLabel(field)} minimal ${extra} karakter.`],
  [/^The selected (.+) is invalid\.$/, field => `${fieldLabel(field)} yang dipilih tidak valid.`],
  [/^The (.+) has already been taken\.$/, field => `${fieldLabel(field)} sudah digunakan.`]
]

export function translateMessage(message: string): string {
  const exact = MESSAGE_MAP[message]

  if (exact) {
    return exact
  }

  for (const [pattern, build] of MESSAGE_PATTERNS) {
    const match = message.match(pattern)

    if (match) {
      return build(match[1] ?? '', match[2])
    }
  }

  return message
}

function extractMessage(body: ApiErrorBody | null | undefined): string | undefined {
  if (!body || typeof body !== 'object') {
    return undefined
  }

  if (body.error?.code && CODE_MESSAGES[body.error.code]) {
    return CODE_MESSAGES[body.error.code]
  }

  const firstFieldError = body.errors ? Object.values(body.errors).flat()[0] : undefined
  const raw = firstFieldError ?? body.error?.message ?? body.message

  return raw ? translateMessage(raw) : undefined
}

// Map backend/validation failures to a single human-readable message.
// 401 here means the credential check itself failed, not a session state.
// Nitro-proxied Laravel bodies arrive nested one level deep under `data`.
export function readError(error: unknown, fallback: string): string {
  if (typeof error !== 'object' || error === null) {
    return fallback
  }

  const body = (error as { data?: ApiErrorBody }).data ?? (error as ApiErrorBody)

  const nested = (body as { data?: ApiErrorBody }).data

  return extractMessage(nested) ?? extractMessage(body) ?? fallback
}
