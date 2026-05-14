import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, developmentPlansApi, employeesApi } from '../api/index.js'
import { getEffectiveEmployeeId, resolveCompanyId } from '../config/companyContext.js'
import './pages.css'
import './EntityZone.css'

const PLAN_STATUS_LABEL = {
  DRAFT: 'Черновик',
  ACTIVE: 'Активен',
  ARCHIVED: 'Архив',
}

const TASK_STATUS_LABEL = {
  PLANNED: 'Запланирована',
  IN_PROGRESS: 'В работе',
  DONE: 'Выполнена',
}

const TASK_TYPE_LABEL = {
  LEARNING: 'Обучение',
  MINI_PROJECT: 'Мини-проект',
  MEETING: 'Встреча',
  OTHER: 'Другое',
  PROJECT: 'Проект',
  SOFT_SKILL: 'Soft skills',
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

export function DevelopmentPlansPage() {
  const { companyId } = resolveCompanyId()
  const jwtEmployeeId = getEffectiveEmployeeId()

  const [employees, setEmployees] = useState(
    /** @type {import('../api/employees.js').EmployeeView[] | null} */ (null),
  )
  const [employeesError, setEmployeesError] = useState(/** @type {string | null} */ (null))
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(/** @type {number | null} */ () =>
    getEffectiveEmployeeId(),
  )
  const [expandedPlanId, setExpandedPlanId] = useState(/** @type {number | null} */ (null))

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [plans, setPlans] = useState(
    /** @type {import('../api/developmentPlans.js').DevelopmentPlanView[] | null} */ (null),
  )

  const loadEmployees = useCallback(async () => {
    if (companyId == null) {
      setEmployees(null)
      setEmployeesError(null)
      return
    }
    setEmployeesError(null)
    try {
      const list = await employeesApi.fetchEmployeesByCompany(companyId)
      setEmployees(Array.isArray(list) ? list : [])
    } catch (e) {
      setEmployees(null)
      if (e instanceof ApiError) {
        setEmployeesError(e.message)
      } else if (e instanceof Error) {
        setEmployeesError(e.message)
      } else {
        setEmployeesError('Не удалось загрузить список сотрудников')
      }
    }
  }, [companyId])

  useEffect(() => {
    void loadEmployees()
  }, [loadEmployees])

  const sortedEmployees = useMemo(() => {
    if (!employees) {
      return []
    }
    return [...employees].sort((a, b) =>
      String(a.full_name ?? '').localeCompare(String(b.full_name ?? ''), 'ru', { sensitivity: 'base' }),
    )
  }, [employees])

  const selectedInRoster = useMemo(() => {
    if (selectedEmployeeId == null || !sortedEmployees.length) {
      return false
    }
    return sortedEmployees.some((e) => e.id === selectedEmployeeId)
  }, [selectedEmployeeId, sortedEmployees])

  const loadPlans = useCallback(async () => {
    if (selectedEmployeeId == null) {
      setPlans(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const list = await developmentPlansApi.fetchEmployeePlans(selectedEmployeeId)
      setPlans(Array.isArray(list) ? list : [])
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
  }, [selectedEmployeeId])

  useEffect(() => {
    void loadPlans()
  }, [loadPlans])

  useEffect(() => {
    setExpandedPlanId(null)
  }, [selectedEmployeeId])

  return (
    <article className="page">
      <ol className="page__breadcrumbs">
        <li>
          <Link to="/">Главная</Link>
        </li>
        <li>ИПР</li>
      </ol>

      <h1 className="page__title">Индивидуальные планы развития</h1>
      <p className="page__lead">
        Планы развития, сроки и статусы задач. Для просмотра планов другого сотрудника выберите его в списке (если
        доступен по правам API).
      </p>

      {companyId == null ? (
        <p className="entity-zone__hint">Компания не определена.</p>
      ) : null}

      {employeesError ? (
        <div className="entity-zone__error" role="status">
          {employeesError}
        </div>
      ) : null}

      {companyId != null && employees && employees.length > 0 ? (
        <div className="entity-zone__filters entity-zone__filters--row">
          <label className="entity-zone__field entity-zone__field--grow">
            <span className="entity-zone__field-label">Сотрудник</span>
            <select
              className="entity-zone__select"
              value={selectedEmployeeId ?? ''}
              onChange={(ev) => {
                const v = ev.target.value
                if (v === '') {
                  setSelectedEmployeeId(null)
                  return
                }
                const n = Number(v)
                if (Number.isFinite(n) && n > 0) {
                  setSelectedEmployeeId(Math.trunc(n))
                }
              }}
            >
              {jwtEmployeeId == null ? <option value="">Выберите сотрудника</option> : null}
              {selectedEmployeeId != null && !selectedInRoster ? (
                <option value={selectedEmployeeId}>Сотрудник #{selectedEmployeeId}</option>
              ) : null}
              {sortedEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name}
                  {emp.id === jwtEmployeeId ? ' (я)' : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {companyId != null && jwtEmployeeId == null && (!employees || employees.length === 0) && !employeesError ? (
        <div className="entity-zone__error" role="status">
          Нет списка сотрудников и не удалось определить сотрудника из токена. Укажите учётную запись с claim{' '}
          <code>employee_id</code> или откройте раздел под ролью с доступом к списку сотрудников.
        </div>
      ) : null}

      {error ? (
        <div className="entity-zone__error" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? <p className="entity-zone__loading">Загрузка…</p> : null}

      {!loading && selectedEmployeeId != null && plans && plans.length === 0 && !error ? (
        <p className="entity-zone__empty">ИПР для выбранного сотрудника не найдены.</p>
      ) : null}

      {!loading && plans && plans.length > 0 ? (
        <div className="entity-zone__grid">
          {plans.map((plan) => {
            const tasks = Array.isArray(plan.tasks) ? plan.tasks : []
            const counts = taskStatusCounts(tasks)
            const competencyCount = Array.isArray(plan.competency_items) ? plan.competency_items.length : 0
            const statusKey = typeof plan.status === 'string' ? plan.status.toUpperCase() : plan.status
            const statusLabel = PLAN_STATUS_LABEL[/** @type {keyof typeof PLAN_STATUS_LABEL} */ (statusKey)] ?? plan.status
            const expanded = expandedPlanId === plan.id
            return (
              <article key={plan.id} className="entity-zone__card entity-zone__card--panel">
                <div className="entity-zone__card-name">{statusLabel}</div>
                <div className="entity-zone__card-code">
                  Период: {formatDate(plan.period_start)} — {formatDate(plan.period_end)}
                </div>
                <div className="entity-zone__card-meta">
                  <span className="entity-zone__badge">Задач: {tasks.length}</span>
                  <span className="entity-zone__badge">
                    Выполнено {counts.done} · в работе {counts.inProgress} · запланировано {counts.planned}
                  </span>
                  {competencyCount > 0 ? (
                    <span className="entity-zone__badge">Компетенции: {competencyCount}</span>
                  ) : null}
                  {plan.team_lead_plan_score_hundredths != null ? (
                    <span className="entity-zone__badge">
                      Оценка тимлида (сред.): {(plan.team_lead_plan_score_hundredths / 100).toFixed(2)}
                    </span>
                  ) : null}
                </div>
                {plan.approved_at ? (
                  <p className="entity-zone__card-desc">Согласовано: {formatDate(plan.approved_at)}</p>
                ) : null}
                <div className="entity-zone__actions entity-zone__actions--tight">
                  <button
                    type="button"
                    className="entity-zone__button"
                    onClick={() => setExpandedPlanId(expanded ? null : plan.id)}
                    aria-expanded={expanded}
                  >
                    {expanded ? 'Свернуть задачи' : 'Задачи'}
                  </button>
                </div>
                {expanded ? (
                  <ul className="entity-zone__task-list">
                    {tasks.length === 0 ? (
                      <li className="entity-zone__muted">Задачи не добавлены.</li>
                    ) : (
                      tasks.map((task) => {
                        const st = typeof task.status === 'string' ? task.status.toUpperCase() : ''
                        const taskStLabel =
                          TASK_STATUS_LABEL[/** @type {keyof typeof TASK_STATUS_LABEL} */ (st)] ?? task.status
                        const tt = typeof task.task_type === 'string' ? task.task_type.toUpperCase() : ''
                        const typeLabel =
                          TASK_TYPE_LABEL[/** @type {keyof typeof TASK_TYPE_LABEL} */ (tt)] ?? (task.task_type ?? '—')
                        return (
                          <li key={task.id} className="entity-zone__task-list-item">
                            <div className="entity-zone__task-list-title">{task.title}</div>
                            <div className="entity-zone__task-list-meta">
                              <span>{typeLabel}</span>
                              <span>{taskStLabel}</span>
                              <span>до {formatDate(task.due_date)}</span>
                              {task.team_lead_task_score != null ? (
                                <span>оценка: {task.team_lead_task_score}</span>
                              ) : null}
                            </div>
                          </li>
                        )
                      })
                    )}
                  </ul>
                ) : null}
              </article>
            )
          })}
        </div>
      ) : null}
    </article>
  )
}
