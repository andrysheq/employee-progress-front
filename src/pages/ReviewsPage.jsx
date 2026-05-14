import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, employeesApi, reviewCyclesApi } from '../api/index.js'
import { resolveCompanyId } from '../config/companyContext.js'
import './pages.css'
import './EntityZone.css'

const REVIEW_TYPE_LABEL = {
  INTERIM_PROGRESS: 'Промежуточное',
  FINAL_PROMOTION: 'Итоговое',
}

const STATUS_LABEL = {
  SCHEDULED: 'Запланирован',
  COMPLETED: 'Завершён',
  CANCELLED: 'Отменён',
}

/**
 * @param {string | null | undefined} iso
 * @returns {string}
 */
function formatDateTime(iso) {
  if (!iso) {
    return '—'
  }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return iso
  }
  return d.toLocaleString('ru-RU')
}

/**
 * @param {import('../api/employees.js').EmployeeView[] | null} employees
 */
function buildEmployeeNameMap(employees) {
  const map = new Map()
  if (!Array.isArray(employees)) {
    return map
  }
  for (const employee of employees) {
    if (employee && typeof employee.id === 'number' && typeof employee.full_name === 'string') {
      map.set(employee.id, employee.full_name)
    }
  }
  return map
}

export function ReviewsPage() {
  const { companyId } = resolveCompanyId()

  const [employeeNameLike, setEmployeeNameLike] = useState('')
  const [reviewType, setReviewType] = useState('')
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [items, setItems] = useState(
    /** @type {import('../api/reviewCycles.js').ReviewCycleView[] | null} */ (null),
  )
  const [employees, setEmployees] = useState(
    /** @type {import('../api/employees.js').EmployeeView[] | null} */ (null),
  )

  const loadEmployees = useCallback(async () => {
    if (companyId == null) {
      setEmployees(null)
      return
    }
    try {
      const page = await employeesApi.fetchEmployeesRegistry(
        { company_id: companyId, is_active: true },
        { size: 300, sort: 'fullName,asc' },
      )
      setEmployees(page.content)
    } catch {
      setEmployees(null)
    }
  }, [companyId])

  useEffect(() => {
    void loadEmployees()
  }, [loadEmployees])

  const employeeNameMap = useMemo(() => buildEmployeeNameMap(employees), [employees])

  const load = useCallback(async () => {
    if (companyId == null) {
      setItems(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const page = await reviewCyclesApi.fetchReviewCyclesRegistry(
        {
          company_id: companyId,
          review_type: reviewType || null,
          status: status || null,
          date_from: dateFrom || null,
          date_to: dateTo || null,
          employee_title_like: employeeNameLike.trim() || null,
        },
        { size: 100, sort: 'scheduledAt,desc' },
      )
      setItems(page.content)
    } catch (e) {
      setItems(null)
      if (e instanceof ApiError) {
        setError(e.message)
      } else if (e instanceof Error) {
        setError(e.message)
      } else {
        setError('Не удалось загрузить циклы ревью')
      }
    } finally {
      setLoading(false)
    }
  }, [companyId, dateFrom, dateTo, employeeNameLike, reviewType, status])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <article className="page">
      <ol className="page__breadcrumbs">
        <li>
          <Link to="/">Главная</Link>
        </li>
        <li>Ревью</li>
      </ol>

      <h1 className="page__title">Циклы ревью</h1>
      <p className="page__lead">Плановые и завершённые ревью по сотрудникам.</p>

      {companyId == null ? (
        <div className="entity-zone__error" role="status">
          Не удалось определить компанию.
        </div>
      ) : null}

      <form
        className="entity-zone__filters"
        onSubmit={(ev) => {
          ev.preventDefault()
          void load()
        }}
      >
        <label className="entity-zone__field entity-zone__field--grow">
          <span className="entity-zone__field-label">Сотрудник (поиск по ФИО)</span>
          <input
            className="entity-zone__input"
            value={employeeNameLike}
            onChange={(ev) => setEmployeeNameLike(ev.target.value)}
            placeholder="Например: Петров"
          />
        </label>
        <label className="entity-zone__field">
          <span className="entity-zone__field-label">Тип ревью</span>
          <select className="entity-zone__select" value={reviewType} onChange={(ev) => setReviewType(ev.target.value)}>
            <option value="">Все</option>
            <option value="INTERIM_PROGRESS">Промежуточное</option>
            <option value="FINAL_PROMOTION">Итоговое</option>
          </select>
        </label>
        <label className="entity-zone__field">
          <span className="entity-zone__field-label">Статус</span>
          <select className="entity-zone__select" value={status} onChange={(ev) => setStatus(ev.target.value)}>
            <option value="">Все</option>
            <option value="SCHEDULED">Запланирован</option>
            <option value="COMPLETED">Завершён</option>
            <option value="CANCELLED">Отменён</option>
          </select>
        </label>
        <label className="entity-zone__field">
          <span className="entity-zone__field-label">Период: с</span>
          <input className="entity-zone__input" type="date" value={dateFrom} onChange={(ev) => setDateFrom(ev.target.value)} />
        </label>
        <label className="entity-zone__field">
          <span className="entity-zone__field-label">Период: по</span>
          <input className="entity-zone__input" type="date" value={dateTo} onChange={(ev) => setDateTo(ev.target.value)} />
        </label>
      </form>

      <div className="entity-zone__actions">
        <button className="entity-zone__button entity-zone__button--primary" type="button" onClick={() => void load()}>
          Применить фильтры
        </button>
      </div>

      {error ? (
        <div className="entity-zone__error" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? <p className="entity-zone__loading">Загрузка…</p> : null}

      {!loading && items && items.length === 0 && !error ? (
        <p className="entity-zone__empty">Циклы ревью не найдены.</p>
      ) : null}

      {!loading && items && items.length > 0 ? (
        <div className="entity-zone__grid">
          {items.map((item) => (
            <article key={item.review_cycle_id} className="entity-zone__card">
              <div className="entity-zone__card-name">{REVIEW_TYPE_LABEL[item.review_type] ?? item.review_type}</div>
              <div className="entity-zone__card-code">
                {employeeNameMap.get(item.employee_id) ?? 'Сотрудник'}
              </div>
              <div className="entity-zone__card-meta">
                <span className="entity-zone__badge">{STATUS_LABEL[item.status] ?? item.status}</span>
                <span className="entity-zone__badge">Планов учтено: {item.considered_development_plan_ids.length}</span>
              </div>
              <p className="entity-zone__card-desc">
                Плановая дата: {formatDateTime(item.scheduled_at)}
                <br />
                Начато: {formatDateTime(item.started_at)}
                <br />
                Завершено: {formatDateTime(item.completed_at)}
              </p>
            </article>
          ))}
        </div>
      ) : null}
    </article>
  )
}
