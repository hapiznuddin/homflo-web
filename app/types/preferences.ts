export type ThemePreference = 'system' | 'light' | 'dark'

export const THEME_OPTIONS: Array<{ value: ThemePreference, label: string, description: string }> = [
  { value: 'system', label: 'Ikuti sistem', description: 'Mengikuti pengaturan tema perangkat.' },
  { value: 'light', label: 'Terang', description: 'Selalu menggunakan tema terang.' },
  { value: 'dark', label: 'Gelap', description: 'Selalu menggunakan tema gelap.' }
]

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}
