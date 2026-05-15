import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '../../lib/utils.js'
import { buttonVariants } from './button-variants.js'

/**
 * @typedef {{ variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link', size?: 'default' | 'sm' | 'lg' | 'icon', asChild?: boolean }} ButtonExtraProps
 */

/** @type {React.ForwardRefRenderFunction<HTMLButtonElement, import('react').ButtonHTMLAttributes<HTMLButtonElement> & ButtonExtraProps>} */
const ButtonInner = ({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
}

export const Button = React.forwardRef(ButtonInner)
Button.displayName = 'Button'

export default Button
