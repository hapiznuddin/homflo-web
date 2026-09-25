interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: string }>
}

const DISMISS_KEY = 'homflo-pwa-install-dismissed'

export function usePwaInstall() {
  const deferred = useState<BeforeInstallPromptEvent | null>('pwa-install-event', () => null)
  const dismissed = useState<boolean>('pwa-install-dismissed', () => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1'
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
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // Storage unavailable: banner simply reappears next visit.
    }
  }

  async function install(): Promise<void> {
    const event = deferred.value

    if (!event) {
      return
    }

    await event.prompt()
    await event.userChoice
    deferred.value = null
    dismiss()
  }

  return { shouldShow, isIos, capture, markInstalled, dismiss, install }
}
