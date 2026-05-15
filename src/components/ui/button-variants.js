import { cva } from 'class-variance-authority'

export const buttonVariants = cva('ui-btn', {
  variants: {
    variant: {
      default: 'ui-btn--default',
      destructive: 'ui-btn--destructive',
      outline: 'ui-btn--outline',
      secondary: 'ui-btn--secondary',
      ghost: 'ui-btn--ghost',
      link: 'ui-btn--link',
    },
    size: {
      default: '',
      sm: 'ui-btn--sm',
      lg: 'ui-btn--lg',
      icon: 'ui-btn--icon',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
})
