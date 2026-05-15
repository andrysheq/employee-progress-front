import * as React from 'react'
import { cn } from '../../lib/utils.js'

const Label = React.forwardRef(
  /** @param {import('react').LabelHTMLAttributes<HTMLLabelElement>} props */
  ({ className, ...props }, ref) => (
    <label ref={ref} className={cn('ui-label', className)} {...props} />
  ),
)
Label.displayName = 'Label'

export { Label }
export default Label
