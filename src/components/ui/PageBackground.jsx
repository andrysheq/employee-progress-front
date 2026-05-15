import './PageBackground.css'

/**
 * Full-viewport soft gradient glow background (purple top-left + yellow center).
 * Adapted for this Vite + React (JS) stack — no Tailwind/shadcn required.
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.children]
 * @param {string} [props.className] — optional class on the content wrapper
 */
export function PageBackground({ children, className }) {
  const contentClass = ['page-background-root__content', className].filter(Boolean).join(' ')

  return (
    <div className="page-background-root">
      <div className="page-background-root__backdrop" aria-hidden>
        <div className="page-background-root__layer page-background-root__layer--purple" />
        <div className="page-background-root__layer page-background-root__layer--yellow" />
      </div>
      <div className={contentClass}>{children}</div>
    </div>
  )
}

export default PageBackground
