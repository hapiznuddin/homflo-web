const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0
})

const monthFormatter = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' })
const shortDateFormatter = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' })
const fullDateFormatter = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

export function formatRupiah(value: number, signed = false): string {
  const formatted = rupiahFormatter.format(Math.abs(value))

  if (!signed || value === 0) {
    return formatted
  }

  return value > 0 ? `+${formatted}` : `-${formatted}`
}

export function formatMonthLabel(year: number, month: number): string {
  return monthFormatter.format(new Date(year, month - 1, 1))
}

export function formatShortDate(date: Date): string {
  return shortDateFormatter.format(date)
}

export function formatFullDate(date: Date): string {
  return fullDateFormatter.format(date)
}

export function greetingForHour(hour: number): string {
  if (hour < 11) {
    return 'Selamat pagi'
  }

  if (hour < 15) {
    return 'Selamat siang'
  }

  if (hour < 19) {
    return 'Selamat sore'
  }

  return 'Selamat malam'
}
