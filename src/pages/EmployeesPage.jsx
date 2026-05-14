import { Link } from 'react-router-dom'
import { getEffectiveEmployeeId, resolveCompanyId } from '../config/companyContext.js'
import './pages.css'
import './EntityZone.css'

export function EmployeesPage() {
  const { companyId } = resolveCompanyId()
  const employeeId = getEffectiveEmployeeId()

  return (
    <article className="page">
      <ol className="page__breadcrumbs">
        <li>
          <Link to="/">Главная</Link>
        </li>
        <li>Сотрудники</li>
      </ol>

      <h1 className="page__title">Сотрудники</h1>
      <p className="page__lead">Раздел для работы с профилями сотрудников и их карьерным треком.</p>

      <div className="entity-zone__toolbar">
        <span className="entity-zone__hint">
          {companyId != null ? 'Контекст компании определён' : 'Контекст компании не определён'}
        </span>
        <span className="entity-zone__hint">
          {employeeId != null ? 'Пользователь определён' : 'Пользователь не определён'}
        </span>
      </div>

      <p className="entity-zone__muted">
        Здесь скоро появятся список сотрудников, карточка профиля и кадровые действия.
      </p>
    </article>
  )
}
