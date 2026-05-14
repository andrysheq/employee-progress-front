import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, developmentPlansApi, employeesApi, gradeModelApi } from '../api/index.js'
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

const TASK_STATUS_LABEL = {
  PLANNED: 'Запланирована',
  IN_PROGRESS: 'В работе',
  DONE: 'Выполнена',
}

const TASK_TYPE_LABEL = {
  LEARNING: 'Обучение',
  PROJECT: 'Проект',
  SOFT_SKILL: 'Soft skills',
}

const TASK_PRIORITY_LABEL = {
  HIGH: 'Высокий',
  MIDDLE: 'Средний',
  LOW: 'Низкий',
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
  const { roles, employeeIdFromJwt } = useAuth()
  const canCreatePlan = hasTeamLeadRole(roles)

  const [employeeNameLike, setEmployeeNameLike] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [periodStartFrom, setPeriodStartFrom] = useState('')
  const [periodEndTo, setPeriodEndTo] = useState('')

  const [employees, setEmployees] = useState(
    /** @type {import('../api/employees.js').EmployeeView[] | null} */ (null),
  )
  const [grades, setGrades] = useState(/** @type {{ id: number, label: string }[]} */ ([]))
  const [lookupError, setLookupError] = useState(/** @type {string | null} */ (null))

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [plans, setPlans] = useState(
    /** @type {import('../api/developmentPlans.js').DevelopmentPlanView[] | null} */ (null),
  )
  const [expandedPlanId, setExpandedPlanId] = useState(/** @type {number | null} */ (null))

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(/** @type {string | null} */ (null))
  const [createForm, setCreateForm] = useState({
    employeeId: '',
    managerId: '',
    teamLeadId: employeeIdFromJwt != null ? String(employeeIdFromJwt) : '',
    targetGradeId: '',
    periodStart: '',
    periodEnd: '',
    taskType: 'LEARNING',
    taskTitle: '',
    taskDescription: '',
    taskSuccessCriteria: '',
    taskPriority: 'MIDDLE',
    taskPlannedStartDate: '',
    taskDurationDays: '14',
    taskEffortHoursPlanned: '8',
  })

  useEffect(() => {
    if (employeeIdFromJwt == null) {
      return
    }
    setCreateForm((prev) => ({ ...prev, teamLeadId: String(employeeIdFromJwt) }))
  }, [employeeIdFromJwt])

  const loadLookups = useCallback(async () => {
    if (companyId == null) {
      setEmployees(null)
      setGrades([])
      setLookupError(null)
      return
    }
    setLookupError(null)
    try {
      const [employeesPage, matrix] = await Promise.all([
        employeesApi.fetchEmployeesRegistry(
          { company_id: companyId, is_active: true },
          { size: 300, sort: 'fullName,asc' },
        ),
        gradeModelApi.fetchGradeMatrix(companyId, true),
      ])

      const roster = Array.isArray(employeesPage.content) ? employeesPage.content : []
      setEmployees(roster)

      const nextGrades = []
      if (Array.isArray(matrix?.positions)) {
        for (const row of matrix.positions) {
          const positionName = String(row?.position?.name ?? '').trim()
          const rowGrades = Array.isArray(row?.grades) ? row.grades : []
          for (const grade of rowGrades) {
            if (typeof grade?.id !== 'number') {
              continue
            }
            const gradeName = String(grade?.name ?? '').trim()
            const label = positionName && gradeName ? `${positionName}: ${gradeName}` : gradeName || positionName
            if (!label) {
              continue
            }
            nextGrades.push({ id: grade.id, label })
          }
        }
      }
      nextGrades.sort((a, b) => a.label.localeCompare(b.label, 'ru', { sensitivity: 'base' }))
      setGrades(nextGrades)
    } catch (e) {
      setEmployees(null)
      setGrades([])
      if (e instanceof ApiError) {
        setLookupError(e.message)
      } else if (e instanceof Error) {
        setLookupError(e.message)
      } else {
        setLookupError('Не удалось загрузить справочники сотрудников и грейдов')
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
  const sortedEmployees = useMemo(() => {
    if (!Array.isArray(employees)) {
      return []
    }
    return [...employees].sort((a, b) =>
      String(a.full_name ?? '').localeCompare(String(b.full_name ?? ''), 'ru', { sensitivity: 'base' }),
    )
  }, [employees])

  const submitCreate = useCallback(async () => {
    if (!canCreatePlan || submitting) {
      return
    }

    const employeeId = Number(createForm.employeeId)
    const managerId = Number(createForm.managerId)
    const teamLeadId = Number(createForm.teamLeadId)
    const targetGradeId = Number(createForm.targetGradeId)
    const taskDurationDays = Number(createForm.taskDurationDays)
    const taskEffortHoursPlanned =
      createForm.taskEffortHoursPlanned.trim() === '' ? null : Number(createForm.taskEffortHoursPlanned)

    if (
      !Number.isFinite(employeeId) ||
      !Number.isFinite(managerId) ||
      !Number.isFinite(teamLeadId) ||
      !Number.isFinite(targetGradeId)
    ) {
      setSubmitError('Выберите сотрудника, менеджера, тимлида и целевой грейд')
      return
    }
    if (createForm.periodStart === '' || createForm.periodEnd === '') {
      setSubmitError('Укажите период ИПР')
      return
    }
    if (createForm.taskTitle.trim() === '' || createForm.taskDescription.trim() === '' || createForm.taskSuccessCriteria.trim() === '') {
      setSubmitError('Заполните название, описание и критерии задачи')
      return
    }
    if (!Number.isFinite(taskDurationDays) || taskDurationDays <= 0) {
      setSubmitError('Длительность задачи должна быть положительным числом')
      return
    }
    if (taskEffortHoursPlanned != null && (!Number.isFinite(taskEffortHoursPlanned) || taskEffortHoursPlanned < 0)) {
      setSubmitError('Плановая трудоёмкость должна быть неотрицательным числом')
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      await developmentPlansApi.createDevelopmentPlan(Math.trunc(employeeId), {
        manager_id: Math.trunc(managerId),
        team_lead_id: Math.trunc(teamLeadId),
        period_start: createForm.periodStart,
        period_end: createForm.periodEnd,
        target_grade_id: Math.trunc(targetGradeId),
        tasks: [
          {
            task_type: createForm.taskType,
            title: createForm.taskTitle.trim(),
            description: createForm.taskDescription.trim(),
            success_criteria: createForm.taskSuccessCriteria.trim(),
            priority: createForm.taskPriority,
            planned_start_date: createForm.taskPlannedStartDate || null,
            duration_days: Math.trunc(taskDurationDays),
            effort_hours_planned: taskEffortHoursPlanned == null ? null : Math.trunc(taskEffortHoursPlanned),
          },
        ],
      })
      await loadPlans()
      setCreateForm((prev) => ({
        ...prev,
        taskTitle: '',
        taskDescription: '',
        taskSuccessCriteria: '',
      }))
    } catch (e) {
      if (e instanceof ApiError) {
        setSubmitError(e.message)
      } else if (e instanceof Error) {
        setSubmitError(e.message)
      } else {
        setSubmitError('Не удалось создать ИПР')
      }
    } finally {
      setSubmitting(false)
    }
  }, [canCreatePlan, createForm, loadPlans, submitting])

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
      </div>

      {canCreatePlan ? (
        <section className="entity-zone__summary">
          <h2 className="entity-zone__summary-title">Создать ИПР</h2>
          <div className="entity-zone__filters">
            <label className="entity-zone__field">
              <span className="entity-zone__field-label">Сотрудник</span>
              <select
                className="entity-zone__select"
                value={createForm.employeeId}
                onChange={(ev) => setCreateForm((prev) => ({ ...prev, employeeId: ev.target.value }))}
              >
                <option value="">Выберите сотрудника</option>
                {sortedEmployees.map((employee) => (
                  <option key={employee.id} value={String(employee.id)}>
                    {employee.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="entity-zone__field">
              <span className="entity-zone__field-label">Менеджер (PM)</span>
              <select
                className="entity-zone__select"
                value={createForm.managerId}
                onChange={(ev) => setCreateForm((prev) => ({ ...prev, managerId: ev.target.value }))}
              >
                <option value="">Выберите менеджера</option>
                {sortedEmployees.map((employee) => (
                  <option key={employee.id} value={String(employee.id)}>
                    {employee.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="entity-zone__field">
              <span className="entity-zone__field-label">Тимлид</span>
              <select
                className="entity-zone__select"
                value={createForm.teamLeadId}
                onChange={(ev) => setCreateForm((prev) => ({ ...prev, teamLeadId: ev.target.value }))}
              >
                <option value="">Выберите тимлида</option>
                {sortedEmployees.map((employee) => (
                  <option key={employee.id} value={String(employee.id)}>
                    {employee.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="entity-zone__field">
              <span className="entity-zone__field-label">Целевой грейд</span>
              <select
                className="entity-zone__select"
                value={createForm.targetGradeId}
                onChange={(ev) => setCreateForm((prev) => ({ ...prev, targetGradeId: ev.target.value }))}
              >
                <option value="">Выберите грейд</option>
                {grades.map((grade) => (
                  <option key={grade.id} value={String(grade.id)}>
                    {grade.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="entity-zone__field">
              <span className="entity-zone__field-label">Период с</span>
              <input
                className="entity-zone__input"
                type="date"
                value={createForm.periodStart}
                onChange={(ev) => setCreateForm((prev) => ({ ...prev, periodStart: ev.target.value }))}
              />
            </label>
            <label className="entity-zone__field">
              <span className="entity-zone__field-label">Период по</span>
              <input
                className="entity-zone__input"
                type="date"
                value={createForm.periodEnd}
                onChange={(ev) => setCreateForm((prev) => ({ ...prev, periodEnd: ev.target.value }))}
              />
            </label>
          </div>

          <h3 className="entity-zone__summary-title">Первая задача ИПР</h3>
          <div className="entity-zone__filters">
            <label className="entity-zone__field">
              <span className="entity-zone__field-label">Тип</span>
              <select
                className="entity-zone__select"
                value={createForm.taskType}
                onChange={(ev) => setCreateForm((prev) => ({ ...prev, taskType: ev.target.value }))}
              >
                <option value="LEARNING">Обучение</option>
                <option value="PROJECT">Проект</option>
                <option value="SOFT_SKILL">Soft skills</option>
              </select>
            </label>
            <label className="entity-zone__field">
              <span className="entity-zone__field-label">Приоритет</span>
              <select
                className="entity-zone__select"
                value={createForm.taskPriority}
                onChange={(ev) => setCreateForm((prev) => ({ ...prev, taskPriority: ev.target.value }))}
              >
                <option value="HIGH">Высокий</option>
                <option value="MIDDLE">Средний</option>
                <option value="LOW">Низкий</option>
              </select>
            </label>
            <label className="entity-zone__field entity-zone__field--grow">
              <span className="entity-zone__field-label">Название задачи</span>
              <input
                className="entity-zone__input"
                value={createForm.taskTitle}
                onChange={(ev) => setCreateForm((prev) => ({ ...prev, taskTitle: ev.target.value }))}
              />
            </label>
            <label className="entity-zone__field entity-zone__field--grow">
              <span className="entity-zone__field-label">Описание</span>
              <input
                className="entity-zone__input"
                value={createForm.taskDescription}
                onChange={(ev) => setCreateForm((prev) => ({ ...prev, taskDescription: ev.target.value }))}
              />
            </label>
            <label className="entity-zone__field entity-zone__field--grow">
              <span className="entity-zone__field-label">Критерии успеха</span>
              <input
                className="entity-zone__input"
                value={createForm.taskSuccessCriteria}
                onChange={(ev) => setCreateForm((prev) => ({ ...prev, taskSuccessCriteria: ev.target.value }))}
              />
            </label>
            <label className="entity-zone__field">
              <span className="entity-zone__field-label">Плановая дата старта</span>
              <input
                className="entity-zone__input"
                type="date"
                value={createForm.taskPlannedStartDate}
                onChange={(ev) => setCreateForm((prev) => ({ ...prev, taskPlannedStartDate: ev.target.value }))}
              />
            </label>
            <label className="entity-zone__field">
              <span className="entity-zone__field-label">Длительность (дней)</span>
              <input
                className="entity-zone__input"
                type="number"
                min={1}
                value={createForm.taskDurationDays}
                onChange={(ev) => setCreateForm((prev) => ({ ...prev, taskDurationDays: ev.target.value }))}
              />
            </label>
            <label className="entity-zone__field">
              <span className="entity-zone__field-label">Трудоёмкость (час.)</span>
              <input
                className="entity-zone__input"
                type="number"
                min={0}
                value={createForm.taskEffortHoursPlanned}
                onChange={(ev) => setCreateForm((prev) => ({ ...prev, taskEffortHoursPlanned: ev.target.value }))}
              />
            </label>
          </div>
          <div className="entity-zone__actions">
            <button
              type="button"
              className="entity-zone__button entity-zone__button--primary"
              disabled={submitting}
              onClick={() => void submitCreate()}
            >
              Создать ИПР
            </button>
          </div>
        </section>
      ) : null}

      {lookupError ? (
        <div className="entity-zone__error" role="alert">
          {lookupError}
        </div>
      ) : null}

      {submitError ? (
        <div className="entity-zone__error" role="alert">
          {submitError}
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
        <div className="entity-zone__grid">
          {plans.map((plan) => {
            const tasks = Array.isArray(plan.tasks) ? plan.tasks : []
            const counts = taskStatusCounts(tasks)
            const competencyCount = Array.isArray(plan.competency_items) ? plan.competency_items.length : 0
            const statusKey = typeof plan.status === 'string' ? plan.status.toUpperCase() : plan.status
            const statusLabel = PLAN_STATUS_LABEL[/** @type {keyof typeof PLAN_STATUS_LABEL} */ (statusKey)] ?? plan.status
            const expanded = expandedPlanId === plan.id
            const employeeName = employeeNameMap.get(plan.employee_id) ?? 'Сотрудник'

            return (
              <article key={plan.id} className="entity-zone__card entity-zone__card--panel">
                <div className="entity-zone__card-name">{employeeName}</div>
                <div className="entity-zone__card-code">{statusLabel}</div>
                <div className="entity-zone__card-desc">
                  Период: {formatDate(plan.period_start)} — {formatDate(plan.period_end)}
                </div>
                <div className="entity-zone__card-meta">
                  <span className="entity-zone__badge">Задач: {tasks.length}</span>
                  <span className="entity-zone__badge">
                    Выполнено {counts.done} · в работе {counts.inProgress} · запланировано {counts.planned}
                  </span>
                  {competencyCount > 0 ? <span className="entity-zone__badge">Компетенций: {competencyCount}</span> : null}
                  {plan.team_lead_plan_score_hundredths != null ? (
                    <span className="entity-zone__badge">
                      Оценка тимлида (сред.): {(plan.team_lead_plan_score_hundredths / 100).toFixed(2)}
                    </span>
                  ) : null}
                </div>
                {plan.approved_at ? <p className="entity-zone__card-desc">Согласовано: {formatDate(plan.approved_at)}</p> : null}
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
                        const taskStLabel = TASK_STATUS_LABEL[/** @type {keyof typeof TASK_STATUS_LABEL} */ (st)] ?? task.status
                        const tt = typeof task.task_type === 'string' ? task.task_type.toUpperCase() : ''
                        const typeLabel = TASK_TYPE_LABEL[/** @type {keyof typeof TASK_TYPE_LABEL} */ (tt)] ?? (task.task_type ?? '—')
                        const pr = typeof task.priority === 'string' ? task.priority.toUpperCase() : ''
                        const priorityLabel =
                          TASK_PRIORITY_LABEL[/** @type {keyof typeof TASK_PRIORITY_LABEL} */ (pr)] ?? task.priority ?? '—'
                        return (
                          <li key={task.id} className="entity-zone__task-list-item">
                            <div className="entity-zone__task-list-title">{task.title}</div>
                            <div className="entity-zone__task-list-meta">
                              <span>{typeLabel}</span>
                              <span>{taskStLabel}</span>
                              <span>приоритет: {priorityLabel}</span>
                              <span>до {formatDate(task.due_date)}</span>
                              {task.team_lead_task_score != null ? <span>оценка: {task.team_lead_task_score}</span> : null}
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
