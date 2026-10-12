interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: string }>
}

const DISMISS_KEY = 'homflo-pwa-install-dismissed'

// Banner boleh muncul lagi sekian jam setelah pengguna menekan "Nanti".
const DISMISS_COOLDOWN_MS = 12 * 60 * 60 * 1000

// Cek murni (tanpa Nuxt/storage) agar mudah diuji: entri dianggap segar
// hanya bila timestamp-nya masih dalam masa cooldown.
export function isDismissalFresh(stored: string | null, now: number): boolean {
  if (stored === null) {
    return false
  }

  const dismissedAt = Number.parseInt(stored, 10)

  if (Number.isNaN(dismissedAt)) {
    return false
  }

  return now - dismissedAt < DISMISS_COOLDOWN_MS
}

export function usePwaInstall() {
  const deferred = useState<BeforeInstallPromptEvent | null>('pwa-install-event', () => null)
  const dismissed = useState<boolean>('pwa-install-dismissed', () => {
    // Di server tidak ada localStorage; klien memulihkan lewat
    // restoreDismissal() saat mount (lihat bawah).
    try {
      return isDismissalFresh(localStorage.getItem(DISMISS_KEY), Date.now())
    } catch {
      return false
    }
  })
  const installed = useState<boolean>('pwa-installed', () => false)

  const isIos = computed(() => {
    if (import.meta.server) {
      return false
    }

    return /iphone|ipad|ipod/i.test(navigator.userAgent)
  })

  const isStandalone = computed(() => {
    if (import.meta.server) {
      return false
    }

    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    )
  })

  // Shown at most once per user decision: native prompt available and not
  // dismissed, or iOS manual guidance when installable but no prompt event.
  const shouldShow = computed(() => {
    if (isStandalone.value || installed.value || dismissed.value) {
      return false
    }

    return deferred.value !== null || isIos.value
  })

  function capture(event: Event): void {
    event.preventDefault()
    deferred.value = event as BeforeInstallPromptEvent
  }

  function markInstalled(): void {
    installed.value = true
  }

  function dismiss(): void {
    dismissed.value = true

    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      // Storage unavailable: banner simply reappears next visit.
    }
  }

  // Dipanggil saat komponen mount di klien. Menutup lubang SSR: state
  // `dismissed` hasil render server selalu false (tanpa localStorage) dan
  // ikut ter-serialize ke payload, sehingga tanpa pemulihan di sini banner
  // selalu muncul lagi setiap refresh walau pengguna sudah menekan "Nanti".
  function restoreDismissal(): void {
    if (import.meta.server) {
      return
    }

    try {
      dismissed.value = isDismissalFresh(localStorage.getItem(DISMISS_KEY), Date.now())
    } catch {
      dismissed.value = false
    }
  }

  async function install(): Promise<void> {
    const event = deferred.value

    if (!event) {
      return
    }

    try {
      await event.prompt()
      await event.userChoice
    } finally {
      deferred.value = null
      dismiss()
    }
  }

  return { shouldShow, isIos, capture, markInstalled, dismiss, install, restoreDismissal }
}
