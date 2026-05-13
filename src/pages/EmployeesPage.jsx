import { Link } from 'react-router-dom'
import {
  getEffectiveEmployeeId,
  resolveCompanyId,
} from '../config/companyContext.js'
import './pages.css'
import './EntityZone.css'

export function EmployeesPage() {
  const { companyId, source } = resolveCompanyId()
  const employeeId = getEffectiveEmployeeId()

  const companyHint =
    source === 'jwt'
      ? 'JWT'
      : source === 'env'
        ? 'VITE_DEV_COMPANY_ID'
        : 'не задана'

  return (
    <article className="page">
      <ol className="page__breadcrumbs">
        <li>
          <Link to="/">Главная</Link>
        </li>
        <li>Сотрудники</li>
      </ol>

      <h1 className="page__title">Сотрудники</h1>
      <p className="page__lead">
        Учёт сотрудников, отдел, грейд. В текущем API employee-progress нет отдельного GET «все сотрудники компании» для
        произвольной таблицы: создание — <code>POST /companies/&#123;company_id&#125;/employees</code>, смена отдела —{' '}
        <code>PATCH .../department</code>. Списки по ролям строятся на стороне backend (см. OpenAPI и{' '}
        <code>docs/ui-roles.md</code>).
      </p>

      <div className="entity-zone__toolbar">
        <span className="entity-zone__hint">
          Компания:{' '}
          {companyId != null ? (
            <>
              <strong>{companyId}</strong> ({companyHint})
            </>
          ) : (
            <span>не задана — задайте JWT или VITE_DEV_COMPANY_ID</span>
          )}
        </span>
        <span className="entity-zone__hint">
          Текущий сотрудник (JWT):{' '}
          {employeeId != null ? <strong>#{employeeId}</strong> : 'нет claim employee_id'}
        </span>
      </div>

      <p className="entity-zone__muted">
        Следующий шаг для этой зоны — либо договорённость с backend о read-эндпоинте списка под ваши роли, либо
        интеграция с существующим BFF/поиском. Пока используйте страницы «Отделы», «Матрица грейдов» и ИПР для
        проверки контекста <code>company_id</code> / <code>employee_id</code> из токена.
      </p>
    </article>
  )
}
