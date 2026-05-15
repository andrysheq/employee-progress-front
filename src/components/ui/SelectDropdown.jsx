import { CheckIcon, ChevronDownIcon } from '@radix-ui/react-icons'
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/utils.js'
import './SelectDropdown.css'

/**
 * @typedef {object} SelectDropdownOption
 * @property {string} value
 * @property {string} label
 * @property {string} [description]
 * @property {boolean} [disabled]
 */

/**
 * @param {object} props
 * @param {string} props.value
 * @param {(next: string) => void} props.onChange
 * @param {SelectDropdownOption[]} props.options
 * @param {string} [props.placeholder]
 * @param {boolean} [props.disabled]
 * @param {string} [props.id]
 * @param {string} [props.className]
 * @param {string} [props.ariaLabel] — если нет видимого label
 */
export function SelectDropdown({
  value,
  onChange,
  options = [],
  placeholder = 'Выберите…',
  disabled = false,
  id: idProp,
  className,
  ariaLabel,
}) {
  const reactId = useId()
  const id = idProp ?? `ui-select-${reactId.replace(/:/g, '')}`
  const [open, setOpen] = useState(false)
  const [menuRect, setMenuRect] = useState(
    /** @type {{ top: number; left: number; width: number; maxH: number } | null} */ (null),
  )
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const triggerRef = useRef(/** @type {HTMLButtonElement | null} */ (null))

  const selected = options.find((o) => o.value === value)
  const showPlaceholder = selected == null

  const updateMenuRect = useCallback(() => {
    const el = triggerRef.current
    if (!el) {
      return
    }
    const r = el.getBoundingClientRect()
    const gap = 6
    const maxH = Math.max(140, window.innerHeight - r.bottom - gap - 12)
    setMenuRect({
      top: r.bottom + gap,
      left: r.left,
      width: r.width,
      maxH,
    })
  }, [])

  useLayoutEffect(() => {
    if (!open) {
      return
    }
    updateMenuRect()
    const onScroll = () => updateMenuRect()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open, updateMenuRect])

  useEffect(() => {
    if (!open) {
      return
    }
    const onDoc = (/** @type {MouseEvent} */ e) => {
      const t = /** @type {Node} */ (e.target)
      if (rootRef.current?.contains(t)) {
        return
      }
      const portal = document.getElementById(`${id}-menu`)
      if (portal?.contains(t)) {
        return
      }
      setOpen(false)
    }
    const onKey = (/** @type {KeyboardEvent} */ e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, id])

  function pick(next) {
    onChange(next)
    setOpen(false)
    triggerRef.current?.focus()
  }

  const menu =
    open && menuRect != null
      ? createPortal(
          <ul
            id={`${id}-menu`}
            className="ui-select-dropdown__menu-portal"
            role="listbox"
            style={{
              position: 'fixed',
              top: menuRect.top,
              left: menuRect.left,
              width: menuRect.width,
              maxHeight: menuRect.maxH,
              zIndex: 5000,
            }}
          >
            {options.map((opt) => {
              const isSelected = opt.value === value
              return (
                <li key={opt.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={opt.disabled === true}
                    className={cn('ui-select-dropdown__option', isSelected && 'ui-select-dropdown__option--selected')}
                    onClick={() => {
                      if (!opt.disabled) {
                        pick(opt.value)
                      }
                    }}
                  >
                    <span className="ui-select-dropdown__option-main">
                      <span className="ui-select-dropdown__option-label">{opt.label}</span>
                      {opt.description ? (
                        <span className="ui-select-dropdown__option-desc">{opt.description}</span>
                      ) : null}
                    </span>
                    {isSelected ? <CheckIcon className="ui-select-dropdown__check" aria-hidden /> : null}
                  </button>
                </li>
              )
            })}
          </ul>,
          document.body,
        )
      : null

  return (
    <div
      ref={rootRef}
      className={cn('ui-select-dropdown', open && 'ui-select-dropdown--open', disabled && 'ui-select-dropdown--disabled', className)}
    >
      <button
        ref={triggerRef}
        type="button"
        id={id}
        className="ui-select-dropdown__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-menu` : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen((v) => !v)
          }
        }}
      >
        <span className={cn('ui-select-dropdown__value', showPlaceholder && 'ui-select-dropdown__value--placeholder')}>
          {showPlaceholder ? placeholder : selected.label}
        </span>
        <ChevronDownIcon className="ui-select-dropdown__chevron" aria-hidden />
      </button>
      {menu}
    </div>
  )
}

export default SelectDropdown
