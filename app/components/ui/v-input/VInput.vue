<script setup lang="ts">
export type HomfloInputColor = 'primary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
export type HomfloInputVariant = 'outline' | 'soft' | 'subtle' | 'ghost' | 'none'

interface Props {
  color?: HomfloInputColor
  variant?: HomfloInputVariant
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  highlight?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  color: 'primary',
  variant: 'outline',
  size: 'lg'
})

const model = defineModel<string | number>()

// Focus-ring colors bound to the flat Homflo palette in
// assets/css/main.css. `neutral` is left to the default theme.
const focusRingClasses: Record<Exclude<HomfloInputColor, 'neutral'>, string> = {
  primary: 'outline-primary/25 rounded-full focus-visible:outline-3 focus-visible:ring-primary)',
  success: 'outline-success/25 rounded-full focus-visible:outline-3 focus-visible:ring-success)',
  info: 'outline-info/25 rounded-full focus-visible:outline-3 focus-visible:ring-info)',
  warning: 'outline-warning/25 rounded-full focus-visible:outline-3 focus-visible:ring-warning)',
  error: 'outline-error/25 rounded-full focus-visible:outline-3 focus-visible:ring-danger)'
}

const highlightClasses: Record<Exclude<HomfloInputColor, 'neutral'>, string> = {
  primary: 'ring ring-inset ring-primary rounded-full',
  success: 'ring ring-inset ring-success rounded-full',
  info: 'ring ring-inset ring-info rounded-full',
  warning: 'ring ring-inset ring-warning rounded-full',
  error: 'ring ring-inset ring-danger rounded-full'
}

const variantClasses = computed(() => {
  if (props.color === 'neutral') {
    return ''
  }

  const focus = focusRingClasses[props.color]

  if (props.highlight) {
    return `${focus} ${highlightClasses[props.color]}`
  }

  return focus
})
</script>

<template>
  <UInput
    v-model="model"
    :variant="variant"
    :size="size"
    :highlight="highlight"
    color="neutral"
    :class="variantClasses"
  >
    <template v-for="(_, name) in $slots" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </UInput>
</template>
