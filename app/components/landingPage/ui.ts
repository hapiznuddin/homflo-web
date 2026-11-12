// Shared Tailwind class compositions for the landing page.
// Tailwind scans this file, so every class below is generated.

export const container = 'mx-auto w-full max-w-landing px-[clamp(20px,4.5vw,48px)]'

export const section = 'scroll-mt-24 py-[clamp(56px,8vw,104px)]'

export const sectionHead = 'mx-auto flex max-w-[720px] flex-col items-center gap-3.5 text-center'

export const heading2 = 'm-0 min-w-0 max-w-[20ch] text-h2 font-semibold break-words text-balance'

export const ledeText = 'm-0 max-w-[60ch] text-lede text-muted-foreground text-pretty'

export const panel = 'rounded-3xl border border-border bg-card'

export const panelSoft = 'rounded-3xl border border-rule bg-soft'

export const iconTile =
  'inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-soft text-primary'

export const iconTileStrong =
  'inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-soft-strong text-primary'

export const pointRow = 'grid grid-cols-[20px_minmax(0,1fr)] gap-3 border-b border-rule py-3.5'

const buttonBase =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border font-semibold leading-[1.2] no-underline transition-[background-color,border-color,color,transform] duration-[180ms] ease-out focus-ring'

const button = `${buttonBase} min-h-11 px-5.5 py-3 text-[0.9375rem]`
const buttonSmall = `${buttonBase} min-h-10 px-4 py-2.25 text-sm`

const primaryTone =
  'border-transparent bg-primary text-primary-foreground hover:bg-primary-hover active:translate-y-px active:bg-primary-active'
const outlineTone =
  'border-border bg-transparent text-foreground hover:border-primary hover:text-primary'
const onPrimaryTone =
  'border-transparent bg-primary-foreground text-primary hover:bg-on-primary-hover'
const ghostOnPrimaryTone =
  'border-on-primary-rule text-primary-foreground hover:border-primary-foreground'

export const btnPrimary = `${button} ${primaryTone}`
export const btnPrimarySmall = `${buttonSmall} ${primaryTone}`
export const btnOutline = `${button} ${outlineTone}`
export const btnOnPrimary = `${button} ${onPrimaryTone}`
export const btnGhostOnPrimary = `${button} ${ghostOnPrimaryTone}`

export const linkAction =
  'inline-flex min-h-11 items-center px-1 text-[0.9375rem] font-medium text-foreground no-underline transition-colors duration-[160ms] hover:text-primary focus-ring'

// Hero and final CTA actions are full-width below 480px, intrinsic above it.
export const actionButton = 'flex-1 basis-full min-[480px]:flex-none min-[480px]:basis-auto'
