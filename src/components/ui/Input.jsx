import * as React from 'react'
import { cn } from '../../lib/utils.js'

const Input = React.forwardRef(
  /** @param {import('react').InputHTMLAttributes<HTMLInputElement>} props */
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn('ui-input', className)}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
export default Input
