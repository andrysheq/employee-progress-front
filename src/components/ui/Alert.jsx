import {
  CheckCircledIcon,
  CrossCircledIcon,
  ExclamationTriangleIcon,
  InfoCircledIcon,
} from '@radix-ui/react-icons'
import { cn } from '../../lib/utils.js'
import { alertVariants } from './alert-variants.js'
import './Alert.css'

const VARIANT_ICONS = {
  default: InfoCircledIcon,
  error: CrossCircledIcon,
  info: InfoCircledIcon,
  success: CheckCircledIcon,
  warning: ExclamationTriangleIcon,
}

/**
 * @param {{ variant?: 'default' | 'error' | 'info' | 'success' | 'warning', className?: string } & import('react').SVGAttributes<SVGSVGElement>} props
 */
export function AlertVariantIcon({ variant = 'default', className, ...props }) {
  const Icon = VARIANT_ICONS[variant] ?? InfoCircledIcon
  return <Icon className={cn('ui-alert__icon', className)} aria-hidden {...props} />
}

/**
 * @param {{ variant?: 'default' | 'error' | 'info' | 'success' | 'warning', className?: string, role?: string } & import('react').HTMLAttributes<HTMLDivElement>} props
 */
export function Alert({ className, variant, role, ...props }) {
  return (
    <div
      className={cn(alertVariants({ variant }), className)}
      data-slot="alert"
      role={role ?? 'alert'}
      {...props}
    />
  )
}

/**
 * @param {import('react').HTMLAttributes<HTMLDivElement>} props
 */
export function AlertTitle({ className, ...props }) {
  return <div className={cn('ui-alert__title', className)} data-slot="alert-title" {...props} />
}

/**
 * @param {import('react').HTMLAttributes<HTMLDivElement>} props
 */
export function AlertDescription({ className, ...props }) {
  return <div className={cn('ui-alert__description', className)} data-slot="alert-description" {...props} />
}

/**
 * @param {import('react').HTMLAttributes<HTMLDivElement>} props
 */
export function AlertAction({ className, ...props }) {
  return <div className={cn('ui-alert__action', className)} data-slot="alert-action" {...props} />
}

/**
 * Типовое сообщение: иконка по варианту + текст.
 * @param {{
 *   variant?: 'default' | 'error' | 'info' | 'success' | 'warning'
 *   role?: string
 *   showIcon?: boolean
 *   className?: string
 *   children?: import('react').ReactNode
 * } & import('react').HTMLAttributes<HTMLDivElement>} props
 */
export function InlineAlert({ variant = 'error', role, showIcon = true, className, children, ...props }) {
  const resolvedRole = role ?? (variant === 'error' ? 'alert' : 'status')
  return (
    <Alert variant={variant} role={resolvedRole} className={className} {...props}>
      {showIcon ? <AlertVariantIcon variant={variant} /> : null}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}
