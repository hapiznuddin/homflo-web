<script setup lang="ts">
export type HomfloButtonColor = 'primary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
export type HomfloButtonVariant = 'solid' | 'outline' | 'soft' | 'ghost'
export type HomfloButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface Props {
  color?: HomfloButtonColor
  variant?: HomfloButtonVariant
  size?: HomfloButtonSize
  to?: string
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
  block?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  color: 'primary',
  variant: 'solid',
  size: 'lg',
  type: 'button'
})

// Classes bound to the flat Homflo palette in assets/css/main.css.
// They are merged last by UButton (tailwind-merge), so they win over the
// default theme. `neutral` is left to the default theme (stone scale).
const solidClasses: Record<Exclude<HomfloButtonColor, 'neutral'>, string> = {
  primary: 'text-white text-center w-full rounded-lg active:scale-98 transition-all bg-primary hover:bg-primary/85 active:bg-primary disabled:bg-primary/50 aria-disabled:bg-primary/50',
  success: 'text-white bg-success hover:bg-success/85 active:bg-success/85 disabled:bg-success/50 aria-disabled:bg-success/50',
  info: 'text-white bg-info hover:bg-info/85 active:bg-info/85 disabled:bg-info/50 aria-disabled:bg-info/50',
  warning: 'text-white bg-warning hover:bg-warning/85 active:bg-warning/85 disabled:bg-warning/50 aria-disabled:bg-warning/50',
  error: 'text-white bg-error hover:bg-error/85 active:bg-error/85 disabled:bg-error/50 aria-disabled:bg-error/50'
}

const outlineClasses: Record<Exclude<HomfloButtonColor, 'neutral'>, string> = {
  primary: 'ring ring-inset ring-primary/40 text-primary hover:bg-primary/10 active:bg-primary/10 disabled:bg-transparent aria-disabled:bg-transparent',
  success: 'ring ring-inset ring-success/40 text-success hover:bg-success/10 active:bg-success/10 disabled:bg-transparent aria-disabled:bg-transparent',
  info: 'ring ring-inset ring-info/40 text-info hover:bg-info/10 active:bg-info/10 disabled:bg-transparent aria-disabled:bg-transparent',
  warning: 'ring ring-inset ring-warning/40 text-warning hover:bg-warning/10 active:bg-warning/10 disabled:bg-transparent aria-disabled:bg-transparent',
  error: 'ring ring-inset ring-error/40 text-error hover:bg-error/10 active:bg-error/10 disabled:bg-transparent aria-disabled:bg-transparent'
}

const softClasses: Record<Exclude<HomfloButtonColor, 'neutral'>, string> = {
  primary: 'text-primary bg-primary/10 hover:bg-primary/15 active:bg-primary/15 disabled:bg-primary/10 aria-disabled:bg-primary/10',
  success: 'text-success bg-success/10 hover:bg-success/15 active:bg-success/15 disabled:bg-success/10 aria-disabled:bg-success/10',
  info: 'text-info bg-info/10 hover:bg-info/15 active:bg-info/15 disabled:bg-info/10 aria-disabled:bg-info/10',
  warning: 'text-warning bg-warning/10 hover:bg-warning/15 active:bg-warning/15 disabled:bg-warning/10 aria-disabled:bg-warning/10',
  error: 'text-error bg-error/10 hover:bg-error/15 active:bg-error/15 disabled:bg-error/10 aria-disabled:bg-error/10'
}

const ghostClasses: Record<Exclude<HomfloButtonColor, 'neutral'>, string> = {
  primary: 'text-primary hover:bg-primary/10 active:bg-primary/10 disabled:bg-transparent aria-disabled:bg-transparent',
  success: 'text-success hover:bg-success/10 active:bg-success/10 disabled:bg-transparent aria-disabled:bg-transparent',
  info: 'text-info hover:bg-info/10 active:bg-info/10 disabled:bg-transparent aria-disabled:bg-transparent',
  warning: 'text-warning hover:bg-warning/10 active:bg-warning/10 disabled:bg-transparent aria-disabled:bg-transparent',
  error: 'text-error hover:bg-error/10 active:bg-error/10 disabled:bg-transparent aria-disabled:bg-transparent'
}

const variantClasses = computed(() => {
  if (props.color === 'neutral') {
    return ''
  }

  switch (props.variant) {
    case 'outline':
      return outlineClasses[props.color]
    case 'soft':
      return softClasses[props.color]
    case 'ghost':
      return ghostClasses[props.color]
    case 'solid':
    default:
      return solidClasses[props.color]
  }
})
</script>

<template>
  <UButton
    :to="to"
    :type="type"
    :disabled="disabled"
    :loading="loading"
    :block="block"
    :size="size"
    :variant="variant"
    color="neutral"
    :class="variantClasses"
  >
    <slot />
  </UButton>
</template>
