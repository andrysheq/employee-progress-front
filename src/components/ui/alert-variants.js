import { cva } from 'class-variance-authority'

export const alertVariants = cva('ui-alert', {
  variants: {
    variant: {
      default: 'ui-alert--default',
      error: 'ui-alert--error',
      info: 'ui-alert--info',
      success: 'ui-alert--success',
      warning: 'ui-alert--warning',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})
