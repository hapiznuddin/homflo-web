export default defineAppConfig({
  ui: {
    colors: {
      primary: 'homflo-primary',
      neutral: 'stone'
    },

    button: {
      defaultVariants: {
        color: 'primary',
        variant: 'solid',
        size: 'lg'
      }
    },

    input: {
      defaultVariants: {
        size: 'lg'
      }
    },

    toast: {
      slots: {
        root: 'relative group overflow-hidden bg-background shadow-lg rounded-lg ring ring-default p-4 flex gap-2.5'
      }
    }
  }
})
