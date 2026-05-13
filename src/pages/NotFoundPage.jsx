import { Link } from 'react-router-dom'
import './pages.css'

export function NotFoundPage() {
  return (
    <article className="page">
      <h1 className="page__title">Страница не найдена</h1>
      <p className="page__lead">
        Адрес не существует.{' '}
        <Link to="/">На главную</Link>
      </p>
    </article>
  )
}
