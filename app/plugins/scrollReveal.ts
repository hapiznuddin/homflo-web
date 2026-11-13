import type { DirectiveBinding } from 'vue'

const observers = new WeakMap<HTMLElement, IntersectionObserver>()

const scrollReveal = {
  mounted(el: HTMLElement, binding: DirectiveBinding<Record<string, unknown> | undefined>) {
    const value = binding.value ?? {}
    const {
      root = null,
      once = true,
      rootMargin = '0px 0px -10% 0px',
      threshold = 0.1
    } = value as {
      root?: Element | null
      once?: boolean
      rootMargin?: string
      threshold?: number
      delay?: unknown
    }

    if (
      typeof window === 'undefined' ||
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      el.classList.add('lp-is-visible')
      el.style.transitionDelay = '0ms'
      return
    }

    const delay = Number(value.delay)
    if (!Number.isNaN(delay)) {
      el.style.transitionDelay = `${delay}ms`
    }

    let fired = false
    try {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !fired) {
              fired = true
              el.classList.add('lp-is-visible')
              if (once) observer.unobserve(el)
            }
          })
        },
        { root, rootMargin, threshold }
      )
      observer.observe(el)
      observers.set(el, observer)
    } catch {
      // If observation cannot start, never leave content hidden.
      el.classList.add('lp-is-visible')
    }
  },

  beforeUnmount(el: HTMLElement) {
    observers.get(el)?.disconnect()
    observers.delete(el)
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  // Signals the inline fallback that reveal initialization succeeded.
  if (typeof window !== 'undefined') {
    ;(window as Window & { __lpRevealReady?: boolean }).__lpRevealReady = true
  }
  nuxtApp.vueApp.directive('scroll-reveal', scrollReveal)
})
