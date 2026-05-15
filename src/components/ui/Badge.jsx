import { cn } from '../../lib/utils.js'

/** @typedef {'gray' | 'gray-subtle' | 'blue-subtle' | 'purple-subtle' | 'green-subtle' | 'amber-subtle' | 'red-subtle'} BadgeVariant */

const VARIANT_CLASS = {
  gray: 'ui-badge ui-badge--gray',
  'gray-subtle': 'ui-badge ui-badge--gray-subtle',
  'blue-subtle': 'ui-badge ui-badge--blue-subtle',
  'purple-subtle': 'ui-badge ui-badge--purple-subtle',
  'green-subtle': 'ui-badge ui-badge--green-subtle',
  'amber-subtle': 'ui-badge ui-badge--amber-subtle',
  'red-subtle': 'ui-badge ui-badge--red-subtle',
}

/**
 * @param {object} props
 * @param {React.ReactNode} [props.children]
 * @param {BadgeVariant} [props.variant]
 * @param {'sm' | 'md' | 'lg'} [props.size]
 * @param {boolean} [props.capitalize]
 * @param {React.ReactNode} [props.icon]
 * @param {string} [props.className]
 */
export function Badge({
  children,
  variant = 'gray-subtle',
  size = 'md',
  capitalize = false,
  icon,
  className,
  ...rest
}) {
  const variantCls = VARIANT_CLASS[variant] ?? VARIANT_CLASS['gray-subtle']

  return (
    <span
      className={cn(
        variantCls,
        size === 'sm' && 'ui-badge--sm',
        size === 'md' && 'ui-badge--md',
        size === 'lg' && 'ui-badge--lg',
        capitalize && 'ui-badge--capitalize',
        className,
      )}
      {...rest}
    >
      {icon ? <span className="ui-badge__icon">{icon}</span> : null}
      {children}
    </span>
  )
}

export default Badge
