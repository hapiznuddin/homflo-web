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
  INVITED_USER_NOT_FOUND: 'Email tersebut belum terdaftar.',
  TRANSACTION_NOT_FOUND: 'Transaksi tidak ditemukan.',
  CATEGORY_NOT_FOUND: 'Kategori tidak ditemukan.',
  CATEGORY_ALREADY_EXISTS: 'Nama kategori tersebut sudah dipakai di rumah tangga ini.',
  CATEGORY_IN_USE: 'Kategori masih dipakai oleh anggaran sehingga tidak dapat dihapus.',
  BUDGET_NOT_FOUND: 'Anggaran tidak ditemukan.',
  BUDGET_ALREADY_EXISTS: 'Anggaran untuk kategori dan periode tersebut sudah ada.',
  BILL_NOT_FOUND: 'Tagihan tidak ditemukan.',
  BILL_ALREADY_PAID: 'Tagihan ini sudah dibayar.',
  BILL_NOT_PAID: 'Hanya tagihan lunas yang bisa diarsipkan.',
  BILL_ARCHIVED: 'Tagihan sudah diarsipkan.',
  BILL_PAYMENT_LOCKED: 'Pembayaran tagihan tidak dapat diubah atau dihapus.',
  INSUFFICIENT_FUNDS: 'Saldo dompet tidak cukup.',
  WALLET_NOT_FOUND: 'Dompet tidak ditemukan atau tidak aktif.',
  CATEGORY_TYPE_MISMATCH: 'Kategori harus berjenis pengeluaran.'
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
  token: 'token',
  type: 'jenis',
  amount: 'nominal',
  year: 'tahun',
  month: 'bulan',
  occurred_on: 'tanggal',
  description: 'deskripsi',
  wallet: 'dompet',
  wallet_id: 'dompet',
  category_id: 'kategori',
  date_from: 'tanggal mulai',
  date_to: 'tanggal akhir',
  sort_by: 'urutan',
  sort_dir: 'arah urutan',
  per_page: 'jumlah per halaman',
  page: 'halaman',
  title: 'judul',
  notes: 'catatan',
  due_date: 'tanggal jatuh tempo',
  due_day: 'tanggal jatuh tempo',
  frequency: 'frekuensi',
  recurrence: 'pengulangan'
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
  [/^The (.+) must be a number\.$/, field => `Kolom ${fieldLabel(field)} harus berupa angka.`],
  [/^The (.+) must be an integer\.$/, field => `Kolom ${fieldLabel(field)} harus berupa bilangan bulat.`],
  [/^The (.+) must be at least ([\d.]+)\.$/, (field, extra) => `Kolom ${fieldLabel(field)} minimal ${extra}.`],
  [/^The (.+) may not be greater than ([\d.]+)\.$/, (field, extra) => `Kolom ${fieldLabel(field)} maksimal ${extra}.`],
  [/^The (.+) must not be greater than (\d+) characters\.$/, (field, extra) => `Kolom ${fieldLabel(field)} maksimal ${extra} karakter.`],
  [/^The (.+) does not match the format (.+)\.$/, (field, extra) => `Kolom ${fieldLabel(field)} harus berformat ${extra}.`],
  [/^The (.+) must be a valid ULID\.$/, field => `Kolom ${fieldLabel(field)} harus berupa ID yang valid.`],
  [/^The (.+) must be a date after or equal to (.+)\.$/, (field, extra) => `Kolom ${fieldLabel(field)} tidak boleh mendahului ${fieldLabel(extra ?? '')}.`],
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

// Field errors Laravel (satu pesan pertama per field, diterjemahkan)
// untuk ditampilkan di bawah input terkait.
export function readFieldErrors(error: unknown): Record<string, string> {
  for (const body of errorBodies(error)) {
    const errors = (body as ApiErrorBody).errors

    if (typeof errors !== 'object' || errors === null) {
      continue
    }

    const mapped: Record<string, string> = {}

    for (const [field, messages] of Object.entries(errors)) {
      if (Array.isArray(messages) && typeof messages[0] === 'string') {
        mapped[field] = translateMessage(messages[0])
      }
    }

    if (Object.keys(mapped).length > 0) {
      return mapped
    }
  }

  return {}
}

function errorBodies(error: unknown): Array<Record<string, unknown>> {
  if (typeof error !== 'object' || error === null) {
    return []
  }

  const body = (error as { data?: unknown }).data ?? error

  if (typeof body !== 'object' || body === null) {
    return []
  }

  const nested = (body as { data?: unknown }).data
  const bodies: Array<Record<string, unknown>> = []

  if (typeof nested === 'object' && nested !== null) {
    bodies.push(nested as Record<string, unknown>)
  }

  bodies.push(body as Record<string, unknown>)

  return bodies
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
