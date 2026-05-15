import { useEffect, useRef } from 'react'
import './SpotlightCard.css'

/** @typedef {'blue' | 'purple' | 'green' | 'red' | 'orange'} SpotlightGlowColor */

const glowColorMap = {
  blue: { base: 220, spread: 200 },
  purple: { base: 280, spread: 300 },
  green: { base: 120, spread: 200 },
  red: { base: 0, spread: 200 },
  orange: { base: 30, spread: 200 },
}

/**
 * Карточка в стиле spotlight-card (порт GlowCard без Tailwind).
 * При `neutral` — тот же каркас (скругление, матовость, тень), без цветной подсветки и без курсора.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.children
 * @param {string} [props.className]
 * @param {SpotlightGlowColor} [props.glowColor]
 * @param {boolean} [props.neutral]
 * @param {import('react').CSSProperties} [props.style]
 */
export function SpotlightCard({
  children,
  className = '',
  glowColor = 'purple',
  neutral = false,
  style,
  ...rest
}) {
  const cardRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const palette = glowColorMap[glowColor] ?? glowColorMap.purple

  useEffect(() => {
    if (neutral) {
      return
    }
    const el = cardRef.current
    if (!el) {
      return
    }
    const cx = window.innerWidth / 2
    const cy = window.innerHeight / 2
    el.style.setProperty('--sc-x', cx.toFixed(2))
    el.style.setProperty('--sc-y', cy.toFixed(2))
    el.style.setProperty('--sc-xp', (cx / window.innerWidth).toFixed(2))
    el.style.setProperty('--sc-yp', (cy / window.innerHeight).toFixed(2))
  }, [neutral])

  useEffect(() => {
    if (neutral) {
      return
    }
    const syncPointer = (/** @type {PointerEvent} */ e) => {
      const el = cardRef.current
      if (!el) {
        return
      }
      const { clientX: x, clientY: y } = e
      el.style.setProperty('--sc-x', x.toFixed(2))
      el.style.setProperty('--sc-xp', (x / window.innerWidth).toFixed(2))
      el.style.setProperty('--sc-y', y.toFixed(2))
      el.style.setProperty('--sc-yp', (y / window.innerHeight).toFixed(2))
    }

    document.addEventListener('pointermove', syncPointer)
    return () => document.removeEventListener('pointermove', syncPointer)
  }, [neutral])

  const cssVars = neutral
    ? { '--sc-radius': 14 }
    : {
        '--sc-base': palette.base,
        '--sc-spread': palette.spread,
        '--sc-radius': 14,
        '--sc-border': 3,
        '--sc-backdrop': 'color-mix(in srgb, var(--card) 88%, transparent)',
        '--sc-backup-border': 'color-mix(in srgb, var(--border) 55%, transparent)',
        '--sc-size': 220,
        '--sc-outer': 1,
        '--sc-hue': `calc(var(--sc-base) + (var(--sc-xp, 0) * var(--sc-spread)))`,
      }

  return (
    <div
      ref={cardRef}
      className={['spotlight-card', neutral ? 'spotlight-card--neutral' : '', className].filter(Boolean).join(' ')}
      style={{ ...cssVars, ...style }}
      {...rest}
    >
      {neutral ? null : <div className="spotlight-card__halo" aria-hidden />}
      {children}
    </div>
  )
}

export default SpotlightCard
