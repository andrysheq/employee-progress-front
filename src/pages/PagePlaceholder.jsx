import { Link } from 'react-router-dom'
import './pages.css'

/**
 * Заглушка раздела до подключения API.
 * @param {{ title: string, description?: string, breadcrumbs?: { label: string, to?: string }[] }} props
 */
export function PagePlaceholder({ title, description, breadcrumbs }) {
  return (
    <article className="page">
      {breadcrumbs?.length ? (
        <ol className="page__breadcrumbs">
          {breadcrumbs.map((crumb, i) => (
            <li key={`${crumb.label}-${i}`}>
              {crumb.to ? <Link to={crumb.to}>{crumb.label}</Link> : crumb.label}
            </li>
          ))}
        </ol>
      ) : null}

      <h1 className="page__title">{title}</h1>
      {description ? <p className="page__lead">{description}</p> : null}

      <div className="page__stub">
        <p>Раздел в разработке: здесь будут списки, формы и вызовы API.</p>
      </div>
    </article>
  )
}
