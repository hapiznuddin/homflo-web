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
  ASSET_NOT_FOUND: 'Aset tidak ditemukan.',
  PROPERTY_NOT_FOUND: 'Properti tidak ditemukan.',
  PROPERTY_ARCHIVED: 'Properti sudah diarsipkan. Pulihkan terlebih dahulu sebelum mengubahnya.',
  VEHICLE_NOT_FOUND: 'Kendaraan tidak ditemukan.',
  VEHICLE_PLATE_ALREADY_EXISTS: 'Plat nomor tersebut sudah dipakai kendaraan lain di rumah tangga ini.',
  VEHICLE_ODOMETER_BELOW_RECORDED: 'Odometer tidak boleh lebih rendah dari catatan servis terakhir.',
  VEHICLE_HAS_MAINTENANCE_HISTORY: 'Kendaraan tidak dapat dihapus karena masih memiliki riwayat servis.',
  VEHICLE_MAINTENANCE_NOT_FOUND: 'Catatan servis kendaraan tidak ditemukan.',
  VEHICLE_MAINTENANCE_ALREADY_COMPLETED: 'Servis kendaraan ini sudah ditandai selesai.',
  VEHICLE_OBLIGATION_NOT_FOUND: 'Kewajiban kendaraan tidak ditemukan.',
  OBLIGATION_TYPE_NOT_FOUND: 'Jenis kewajiban tidak ditemukan.',
  OBLIGATION_TYPE_IMMUTABLE: 'Jenis bawaan tidak dapat diubah atau dihapus.',
  OBLIGATION_TYPE_ALREADY_EXISTS: 'Nama jenis tersebut sudah dipakai di rumah tangga ini.',
  OBLIGATION_TYPE_IN_USE: 'Jenis ini masih dipakai kewajiban sehingga tidak dapat dihapus.',
  MAINTENANCE_NOT_FOUND: 'Catatan perawatan tidak ditemukan.',
  MAINTENANCE_ALREADY_COMPLETED: 'Perawatan ini sudah ditandai selesai.',
  MAINTENANCE_ALREADY_CANCELLED: 'Perawatan ini sudah dibatalkan.',
  BILL_ALREADY_PAID: 'Tagihan ini sudah dibayar.',
  BILL_NOT_PAID: 'Hanya tagihan lunas yang bisa diarsipkan.',
  BILL_ARCHIVED: 'Tagihan sudah diarsipkan.',
  BILL_PAYMENT_LOCKED: 'Pembayaran tagihan tidak dapat diubah atau dihapus.',
  INSUFFICIENT_FUNDS: 'Saldo dompet tidak cukup.',
  WALLET_NOT_FOUND: 'Dompet tidak ditemukan atau tidak aktif.',
  TRANSACTION_INVALID: 'Transaksi tidak valid. Periksa jenis, kategori, dan dompet.',
  CATEGORY_TYPE_MISMATCH: 'Kategori harus berjenis pengeluaran.'
}

// Exact English backend messages mapped to Indonesian.
const MESSAGE_MAP: Record<string, string> = {
  'These credentials do not match our records.': 'Email atau kata sandi salah.',
  'The provided password is incorrect.': 'Kata sandi yang dimasukkan salah.',
  'Unauthenticated.': 'Sesi berakhir. Silakan login kembali.',
  'CSRF token mismatch.': 'Sesi kedaluwarsa. Muat ulang halaman lalu coba lagi.',
  'This password reset token is invalid.': 'Tautan tidak valid atau sudah kedaluwarsa.',
  'Please verify your email address before continuing.': 'Silakan verifikasi email Anda terlebih dahulu.',
  'The service odometer must not be greater than the vehicle odometer.':
    'Odometer servis tidak boleh melebihi odometer kendaraan saat ini.'
}

const FIELD_LABELS: Record<string, string> = {
  email: 'Email',
  password: 'kata sandi',
  name: 'nama',
  username: 'nama pengguna',
  address: 'alamat',
  ownership_status: 'status kepemilikan',
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
  destination_wallet_id: 'dompet tujuan',
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
  issued_date: 'tanggal terbit',
  obligation_type_id: 'jenis kewajiban',
  status: 'status',
  frequency: 'frekuensi',
  recurrence: 'pengulangan',
  location: 'lokasi',
  acquired_on: 'tanggal perolehan',
  acquisition_cost: 'biaya perolehan',
  property_id: 'properti',
  asset_id: 'aset',
  brand: 'merek',
  model: 'model',
  plate_number: 'plat nomor',
  license_plate: 'plat nomor',
  odometer: 'odometer',
  scheduled_date: 'tanggal jadwal',
  priority: 'prioritas'
}

function fieldLabel(field: string): string {
  // Laravel menyusun pesan dengan ":attribute" yang bisa berupa nama field
  // apa adanya (asset_id) maupun versi spasi (asset id); dukung keduanya.
  return FIELD_LABELS[field] ?? FIELD_LABELS[field.replace(/ /g, '_')] ?? field.replace(/_/g, ' ')
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

// Error code dari envelope Laravel (mis. VEHICLE_HAS_MAINTENANCE_HISTORY),
// menelusuri bentuk bersarang yang sama seperti readError. Dipakai UI untuk
// menangani konflik domain secara eksplisit tanpa mencocokkan teks pesan.
export function readErrorCode(error: unknown): string | null {
  for (const body of errorBodies(error)) {
    const code = (body as ApiErrorBody).error?.code

    if (typeof code === 'string' && code !== '') {
      return code
    }
  }

  return null
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
