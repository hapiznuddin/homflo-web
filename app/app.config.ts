export default defineAppConfig({
  ui: {
    colors: {
      primary: 'homflo-primary',
      neutral: 'stone'
    },

    button: {
      slots: {
        base: [
          'rounded-full w-full font-medium text-center inline-flex justify-center items-center disabled:cursor-not-allowed aria-disabled:cursor-not-allowed disabled:opacity-75 aria-disabled:opacity-75',
          'transition-colors'
        ],
        label: 'truncate',
        leadingIcon: 'shrink-0',
        leadingAvatar: 'shrink-0',
        leadingAvatarSize: '',
        trailingIcon: 'shrink-0'
      },
      variants: {
        fieldGroup: {
          horizontal:
            'not-only:first:rounded-e-none not-only:last:rounded-s-none not-last:not-first:rounded-none focus-visible:z-[1]',
          vertical:
            'not-only:first:rounded-b-none not-only:last:rounded-t-none not-last:not-first:rounded-none focus-visible:z-[1]'
        },
        color: {
          primary: '',
          secondary: '',
          success: '',
          info: '',
          warning: '',
          error: '',
          neutral: ''
        },
        variant: {
          solid: '',
          outline: '',
          soft: '',
          subtle: '',
          ghost: '',
          link: ''
        },
        size: {
          xs: {
            base: 'px-2 py-1 text-xs gap-1',
            leadingIcon: 'size-4',
            leadingAvatarSize: '3xs',
            trailingIcon: 'size-4'
          },
          sm: {
            base: 'px-2.5 py-1.5 text-xs gap-1.5',
            leadingIcon: 'size-4',
            leadingAvatarSize: '3xs',
            trailingIcon: 'size-4'
          },
          md: {
            base: 'px-2.5 py-1.5 text-sm gap-1.5',
            leadingIcon: 'size-5',
            leadingAvatarSize: '2xs',
            trailingIcon: 'size-5'
          },
          lg: {
            base: 'px-4 py-2 text-sm gap-2',
            leadingIcon: 'size-5',
            leadingAvatarSize: '2xs',
            trailingIcon: 'size-5'
          },
          xl: {
            base: 'px-4 py-2 text-base gap-2',
            leadingIcon: 'size-6',
            leadingAvatarSize: 'xs',
            trailingIcon: 'size-6'
          }
        },
        block: {
          true: {
            base: 'w-full justify-center',
            trailingIcon: 'ms-auto'
          }
        },
        square: {
          true: ''
        },
        leading: {
          true: ''
        },
        trailing: {
          true: ''
        },
        loading: {
          true: ''
        },
        active: {
          true: {
            base: ''
          },
          false: {
            base: ''
          }
        }
      },
      compoundVariants: [
        {
          color: 'primary',
          variant: 'solid',
          class:
            'text-primary-foreground bg-primary hover:bg-primary/75 active:bg-primary/75 disabled:bg-primary aria-disabled:bg-primary outline-primary/25 focus-visible:outline-3'
        },
        {
          color: 'primary',
          variant: 'outline',
          class:
            'dark:text-primary-dark ring-2 ring-inset ring-ring text-primary hover:bg-primary/10 active:bg-primary/10 disabled:bg-transparent aria-disabled:bg-transparent dark:disabled:bg-transparent dark:aria-disabled:bg-transparent outline-primary/25 focus-visible:outline-3 focus-visible:ring-primary'
        },
        {
          color: 'primary',
          variant: 'soft',
          class:
            'text-primary dark:text-primary-dark bg-primary/10 hover:bg-primary/15 active:bg-primary/15 outline-primary/25 focus-visible:outline-3 disabled:bg-primary/10 aria-disabled:bg-primary/10'
        },
        {
          color: 'primary',
          variant: 'subtle',
          class:
            'text-primary dark:text-primary-dark ring ring-inset ring-primary/50 bg-primary/10 hover:bg-primary/15 active:bg-primary/15 disabled:bg-primary/10 aria-disabled:bg-primary/10 outline-primary/25 focus-visible:outline-3 focus-visible:ring-primary'
        },
        {
          color: 'primary',
          variant: 'ghost',
          class:
            'text-primary dark:text-primary-dark hover:bg-primary/10 active:bg-primary/10 outline-primary/25 focus-visible:outline-3 disabled:bg-transparent aria-disabled:bg-transparent dark:disabled:bg-transparent dark:aria-disabled:bg-transparent'
        },
        {
          color: 'primary',
          variant: 'link',
          class:
            'w-fit p-0 text-primary dark:text-primary-dark hover:underline hover:text-primary/75 active:text-primary/75 disabled:text-primary aria-disabled:text-primary outline-primary/25 focus-visible:outline-3'
        },
        {
          size: 'xs',
          square: true,
          class: 'p-1'
        },
        {
          size: 'sm',
          square: true,
          class: 'p-1.5'
        },
        {
          size: 'md',
          square: true,
          class: 'p-1.5'
        },
        {
          size: 'lg',
          square: true,
          class: 'p-2'
        },
        {
          size: 'xl',
          square: true,
          class: 'p-2'
        },
        {
          loading: true,
          leading: true,
          class: {
            leadingIcon: 'animate-spin'
          }
        },
        {
          loading: true,
          leading: false,
          trailing: true,
          class: {
            trailingIcon: 'animate-spin'
          }
        }
      ],
      defaultVariants: {
        color: 'primary',
        variant: 'solid',
        size: 'lg'
      }
    },

    input: {
      slots: {
        root: 'relative inline-flex items-center w-full',
        base: [
          'w-full rounded-xl border-0 appearance-none placeholder:text-dimmed disabled:cursor-not-allowed disabled:opacity-75',
          'transition-colors'
        ],
        leading: 'absolute inset-y-0 start-0 flex items-center',
        leadingIcon: 'shrink-0 text-dimmed',
        leadingAvatar: 'shrink-0',
        leadingAvatarSize: '',
        trailing: 'absolute inset-y-0 end-0 flex items-center',
        trailingIcon: 'shrink-0 text-dimmed'
      },
      variants: {
        fieldGroup: {
          horizontal: {
            root: 'group has-focus-visible:z-[1]',
            base: 'group-not-only:group-first:rounded-e-none group-not-only:group-last:rounded-s-none group-not-last:group-not-first:rounded-none'
          },
          vertical: {
            root: 'group has-focus-visible:z-[1]',
            base: 'group-not-only:group-first:rounded-b-none group-not-only:group-last:rounded-t-none group-not-last:group-not-first:rounded-none'
          }
        },
        size: {
          xs: {
            base: 'px-2 py-1 text-sm/4 gap-1',
            leading: 'ps-2',
            trailing: 'pe-2',
            leadingIcon: 'size-4',
            leadingAvatarSize: '3xs',
            trailingIcon: 'size-4'
          },
          sm: {
            base: 'px-2.5 py-1.5 text-sm/4 gap-1.5',
            leading: 'ps-2.5',
            trailing: 'pe-2.5',
            leadingIcon: 'size-4',
            leadingAvatarSize: '3xs',
            trailingIcon: 'size-4'
          },
          md: {
            base: 'px-2.5 py-1.5 text-base/5 gap-1.5',
            leading: 'ps-2.5',
            trailing: 'pe-2.5',
            leadingIcon: 'size-5',
            leadingAvatarSize: '2xs',
            trailingIcon: 'size-5'
          },
          lg: {
            base: 'px-3 py-2.5 text-base gap-2',
            leading: 'ps-3',
            trailing: 'pe-3',
            leadingIcon: 'size-5',
            leadingAvatarSize: '2xs',
            trailingIcon: 'size-5'
          },
          xl: {
            base: 'px-3 py-2.5 text-base gap-2',
            leading: 'ps-3',
            trailing: 'pe-3',
            leadingIcon: 'size-6',
            leadingAvatarSize: 'xs',
            trailingIcon: 'size-6'
          }
        },
        variant: {
          outline: 'text-highlighted bg-default ring ring-inset ring-accented',
          soft: 'text-highlighted bg-elevated/50 hover:bg-elevated focus:bg-elevated disabled:bg-elevated/50',
          subtle: 'text-highlighted bg-elevated ring ring-inset ring-accented',
          ghost:
            'text-highlighted bg-transparent hover:bg-elevated focus:bg-elevated disabled:bg-transparent dark:disabled:bg-transparent',
          none: 'text-highlighted bg-transparent focus:outline-none'
        },
        color: {
          primary: '',
          secondary: '',
          success: '',
          info: '',
          warning: '',
          error: '',
          neutral: ''
        },
        leading: {
          true: ''
        },
        trailing: {
          true: ''
        },
        loading: {
          true: ''
        },
        highlight: {
          true: ''
        },
        fixed: {
          false: ''
        },
        type: {
          file: 'file:me-1.5 file:font-medium file:text-muted file:outline-none'
        }
      },
      compoundVariants: [
        {
          color: 'primary',
          variant: ['outline', 'subtle'],
          class: 'outline-primary/25 focus-visible:outline-3 focus-visible:ring-primary'
        },
        {
          color: 'primary',
          variant: ['soft', 'ghost'],
          class: 'outline-primary/25 focus-visible:outline-3'
        },
        {
          color: 'primary',
          highlight: true,
          class: 'ring ring-inset ring-primary'
        },
        {
          leading: true,
          size: 'xs',
          class: 'ps-7'
        },
        {
          leading: true,
          size: 'sm',
          class: 'ps-8'
        },
        {
          leading: true,
          size: 'md',
          class: 'ps-9'
        },
        {
          leading: true,
          size: 'lg',
          class: 'ps-10'
        },
        {
          leading: true,
          size: 'xl',
          class: 'ps-11'
        },
        {
          trailing: true,
          size: 'xs',
          class: 'pe-7'
        },
        {
          trailing: true,
          size: 'sm',
          class: 'pe-8'
        },
        {
          trailing: true,
          size: 'md',
          class: 'pe-9'
        },
        {
          trailing: true,
          size: 'lg',
          class: 'pe-10'
        },
        {
          trailing: true,
          size: 'xl',
          class: 'pe-11'
        },
        {
          loading: true,
          leading: true,
          class: {
            leadingIcon: 'animate-spin'
          }
        },
        {
          loading: true,
          leading: false,
          trailing: true,
          class: {
            trailingIcon: 'animate-spin'
          }
        },
        {
          fixed: false,
          size: 'xs',
          class: 'md:text-xs'
        },
        {
          fixed: false,
          size: 'sm',
          class: 'md:text-xs'
        },
        {
          fixed: false,
          size: 'md',
          class: 'md:text-sm'
        },
        {
          fixed: false,
          size: 'lg',
          class: 'md:text-sm'
        }
      ],
      defaultVariants: {
        size: 'lg',
        color: 'primary',
        variant: 'outline'
      }
    },

    toast: {
      slots: {
        root: 'relative group overflow-hidden bg-background shadow-lg rounded-lg ring ring-default p-4 flex gap-2.5'
      }
    },

    dashboardNavbar: {
      slots: {
        root: 'h-(--ui-header-height) shrink-0 flex items-center justify-between border-b border-stone-300 dark:border-stone-600 px-4 sm:px-6 gap-1.5',
        left: 'flex items-center gap-1.5 min-w-0',
        icon: 'shrink-0 size-5 self-center me-1.5',
        title: 'flex items-center gap-1.5 font-semibold text-highlighted truncate',
        center: 'hidden lg:flex',
        right: 'flex items-center shrink-0 gap-1.5',
        toggle: ''
      },
      variants: {
        toggleSide: {
          left: {
            toggle: ''
          },
          right: {
            toggle: ''
          }
        }
      }
    },

    dashboardSidebar: {
      slots: {
        root: 'relative hidden lg:flex flex-col min-h-svh min-w-16 w-(--width) shrink-0 border-r border-stone-400 dark:border-stone-600 bg-background',
        header: 'h-(--ui-header-height) shrink-0 flex items-center gap-1.5 px-4',
        body: 'flex flex-col gap-4 flex-1 overflow-y-auto px-4 py-2',
        footer:
          'shrink-0 flex items-center gap-1.5 px-4 py-2 border-t border-stone-300 dark:border-stone-600',
        toggle: '',
        handle: '',
        content: 'lg:hidden',
        overlay: 'lg:hidden'
      },
      variants: {
        menu: {
          true: {
            header: 'sm:px-6',
            body: 'sm:px-6',
            footer: 'sm:px-6'
          }
        },
        side: {
          left: {
            root: 'border-e border-stone-300 dark:border-stone-600'
          },
          right: {
            root: 'border-s border-stone-300 dark:border-stone-600'
          }
        },
        toggleSide: {
          left: {
            toggle: ''
          },
          right: {
            toggle: 'ms-auto'
          }
        }
      }
    },

    separator: {
      slots: {
        root: 'flex items-center text-center',
        border: 'border-stone-600 dark:border-stone-700',
        container: 'font-medium text-default flex',
        icon: 'shrink-0 size-5',
        avatar: 'shrink-0',
        avatarSize: '2xs',
        label: 'text-sm text-stone-500 dark:text-stone-400'
      }
    }
  }
})
