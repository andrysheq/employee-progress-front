import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, developmentPlansApi, employeesApi } from '../api/index.js'
import { useAuth } from '../auth/useAuth.js'
import { hasTeamLeadRole } from '../auth/roleChecks.js'
import { resolveCompanyId } from '../config/companyContext.js'
import './pages.css'
import './EntityZone.css'

const PLAN_STATUS_LABEL = {
  DRAFT: 'Черновик',
  ACTIVE: 'Активен',
  ARCHIVED: 'Архив',
}

/**
 * @param {string | null | undefined} isoDate
 */
function formatDate(isoDate) {
  if (!isoDate) {
    return '—'
  }
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) {
    return String(isoDate)
  }
  return d.toLocaleDateString('ru-RU')
}

/**
 * @param {import('../api/developmentPlans.js').DevelopmentPlanTaskView[]} tasks
 */
function taskStatusCounts(tasks) {
  let planned = 0
  let inProgress = 0
  let done = 0
  for (const t of tasks) {
    const s = typeof t.status === 'string' ? t.status.toUpperCase() : ''
    if (s === 'DONE') {
      done += 1
    } else if (s === 'IN_PROGRESS') {
      inProgress += 1
    } else {
      planned += 1
    }
  }
  return { planned, inProgress, done }
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

export function DevelopmentPlansPage() {
  const { companyId } = resolveCompanyId()
  const { roles } = useAuth()
  const navigate = useNavigate()
  const canCreatePlan = hasTeamLeadRole(roles)

  const [employeeNameLike, setEmployeeNameLike] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [periodStartFrom, setPeriodStartFrom] = useState('')
  const [periodEndTo, setPeriodEndTo] = useState('')

  const [employees, setEmployees] = useState(
    /** @type {import('../api/employees.js').EmployeeView[] | null} */ (null),
  )
  const [lookupError, setLookupError] = useState(/** @type {string | null} */ (null))

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [plans, setPlans] = useState(
    /** @type {import('../api/developmentPlans.js').DevelopmentPlanView[] | null} */ (null),
  )
  const loadLookups = useCallback(async () => {
    if (companyId == null) {
      setEmployees(null)
      setLookupError(null)
      return
    }
    setLookupError(null)
    try {
      const employeesPage = await employeesApi.fetchEmployeesRegistry(
        { company_id: companyId, is_active: true },
        { size: 300, sort: 'fullName,asc' },
      )

      const roster = Array.isArray(employeesPage.content) ? employeesPage.content : []
      setEmployees(roster)
    } catch (e) {
      setEmployees(null)
      if (e instanceof ApiError) {
        setLookupError(e.message)
      } else if (e instanceof Error) {
        setLookupError(e.message)
      } else {
        setLookupError('Не удалось загрузить справочник сотрудников')
      }
    }
  }, [companyId])

  useEffect(() => {
    void loadLookups()
  }, [loadLookups])

  const loadPlans = useCallback(async () => {
    if (companyId == null) {
      setPlans(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const page = await developmentPlansApi.fetchDevelopmentPlansRegistry(
        {
          company_id: companyId,
          status: statusFilter || null,
          period_start_from: periodStartFrom || null,
          period_end_to: periodEndTo || null,
          employee_title_like: employeeNameLike.trim() || null,
        },
        { size: 100, sort: 'createdAt,desc' },
      )
      setPlans(page.content)
    } catch (e) {
      setPlans(null)
      if (e instanceof ApiError) {
        setError(e.message)
      } else if (e instanceof Error) {
        setError(e.message)
      } else {
        setError('Не удалось загрузить ИПР')
      }
    } finally {
      setLoading(false)
    }
  }, [companyId, employeeNameLike, periodEndTo, periodStartFrom, statusFilter])

  useEffect(() => {
    void loadPlans()
  }, [loadPlans])

  const employeeNameMap = useMemo(() => buildEmployeeNameMap(employees), [employees])

  return (
    <article className="page">
      <ol className="page__breadcrumbs">
        <li>
          <Link to="/">Главная</Link>
        </li>
        <li>ИПР</li>
      </ol>

      <h1 className="page__title">Индивидуальные планы развития</h1>
      <p className="page__lead">Планы развития сотрудников с поиском по значениям, статусу и периоду.</p>

      {companyId == null ? (
        <p className="entity-zone__hint">Компания не определена.</p>
      ) : (
        <form
          className="entity-zone__filters"
          onSubmit={(ev) => {
            ev.preventDefault()
            void loadPlans()
          }}
        >
          <label className="entity-zone__field entity-zone__field--grow">
            <span className="entity-zone__field-label">Сотрудник (поиск по ФИО)</span>
            <input
              className="entity-zone__input"
              value={employeeNameLike}
              onChange={(ev) => setEmployeeNameLike(ev.target.value)}
              placeholder="Например: Иванов"
            />
          </label>
          <label className="entity-zone__field">
            <span className="entity-zone__field-label">Статус</span>
            <select className="entity-zone__select" value={statusFilter} onChange={(ev) => setStatusFilter(ev.target.value)}>
              <option value="">Все</option>
              <option value="DRAFT">Черновик</option>
              <option value="ACTIVE">Активен</option>
              <option value="ARCHIVED">Архив</option>
            </select>
          </label>
          <label className="entity-zone__field">
            <span className="entity-zone__field-label">Период с</span>
            <input
              className="entity-zone__input"
              type="date"
              value={periodStartFrom}
              onChange={(ev) => setPeriodStartFrom(ev.target.value)}
            />
          </label>
          <label className="entity-zone__field">
            <span className="entity-zone__field-label">Период по</span>
            <input
              className="entity-zone__input"
              type="date"
              value={periodEndTo}
              onChange={(ev) => setPeriodEndTo(ev.target.value)}
            />
          </label>
        </form>
      )}

      <div className="entity-zone__actions">
        <button className="entity-zone__button entity-zone__button--primary" type="button" onClick={() => void loadPlans()}>
          Применить фильтры
        </button>
        {canCreatePlan ? (
          <Link className="entity-zone__button entity-zone__button--primary" to="/development-plans/new">
            Создать ИПР
          </Link>
        ) : null}
      </div>

      {lookupError ? (
        <div className="entity-zone__error" role="alert">
          {lookupError}
        </div>
      ) : null}

      {error ? (
        <div className="entity-zone__error" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? <p className="entity-zone__loading">Загрузка…</p> : null}

      {!loading && plans && plans.length === 0 && !error ? (
        <p className="entity-zone__empty">ИПР по текущим фильтрам не найдены.</p>
      ) : null}

            {!loading && plans && plans.length > 0 ? (
        <div className="entity-zone__grid entity-zone__grid--idp">
          {plans.map((plan) => {
            const tasks = Array.isArray(plan.tasks) ? plan.tasks : []
            const counts = taskStatusCounts(tasks)
            const competencyItems = Array.isArray(plan.competency_items) ? plan.competency_items : []
            const competencyCount = competencyItems.length
            const statusKey = typeof plan.status === 'string' ? plan.status.toUpperCase() : plan.status
            const statusLabel = PLAN_STATUS_LABEL[/** @type {keyof typeof PLAN_STATUS_LABEL} */ (statusKey)] ?? plan.status
            const employeeName = employeeNameMap.get(plan.employee_id) ?? 'Сотрудник'
            const planUrl = `/development-plans/${plan.id}`

            return (
              <article
                key={plan.id}
                className="entity-zone__card entity-zone__card--panel entity-zone__card--clickable"
                role="link"
                tabIndex={0}
                aria-label={`Открыть ИПР: ${employeeName}`}
                onClick={() => navigate(planUrl)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault()
                    navigate(planUrl)
                  }
                }}
              >
                <div className="entity-zone__card-name">{employeeName}</div>
                <div className="entity-zone__card-code entity-zone__card-code--status-lg">{statusLabel}</div>
                <div className="entity-zone__card-desc">
                  Период: {formatDate(plan.period_start)} — {formatDate(plan.period_end)}
                </div>
                <div className="entity-zone__card-meta">
                  <span className="entity-zone__badge">Задач: {tasks.length}</span>
                  <span className="entity-zone__badge">Компетенций: {competencyCount}</span>
                  {plan.team_lead_plan_score_hundredths != null ? (
                    <span className="entity-zone__badge">
                      Оценка тимлида (сред.): {(plan.team_lead_plan_score_hundredths / 100).toFixed(2)}
                    </span>
                  ) : null}
                </div>
                <p className="entity-zone__card-desc entity-zone__task-stats">
                  Выполнено {counts.done}
                </p>
                <p className="entity-zone__card-desc entity-zone__task-stats">
                  В работе {counts.inProgress}
                </p>
                <p className="entity-zone__card-desc entity-zone__task-stats">
                  Запланировано {counts.planned}
                </p>
                {plan.approved_at ? <p className="entity-zone__card-desc">Согласовано: {formatDate(plan.approved_at)}</p> : null}
              </article>
            )
          })}
        </div>
      ) : null}
    </article>
  )
}

