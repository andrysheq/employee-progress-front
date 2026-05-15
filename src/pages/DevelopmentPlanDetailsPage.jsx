import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, developmentPlansApi, employeesApi } from '../api/index.js'
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

function formatDate(v) {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v)
  return d.toLocaleDateString('ru-RU')
}

/**
 * @param {string} status
 */
function taskStatusChipClass(status) {
  const s = String(status ?? '').toUpperCase()
  if (s === 'DONE') return 'entity-zone__idp-chip entity-zone__idp-chip--status-done'
  if (s === 'IN_PROGRESS') return 'entity-zone__idp-chip entity-zone__idp-chip--status-progress'
  return 'entity-zone__idp-chip entity-zone__idp-chip--status-planned'
}

/**
 * @param {string} status
 */
function planStatusChipClass(status) {
  const s = String(status ?? '').toUpperCase()
  if (s === 'ACTIVE') return 'entity-zone__idp-chip entity-zone__idp-chip--status-progress'
  if (s === 'ARCHIVED') return 'entity-zone__idp-chip entity-zone__idp-chip--status-done'
  return 'entity-zone__idp-chip entity-zone__idp-chip--status-planned'
}

export function DevelopmentPlanDetailsPage() {
  const { planId } = useParams()
  const { companyId } = resolveCompanyId()
  const [plan, setPlan] = useState(null)
  const [competencies, setCompetencies] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!planId) return
      setLoading(true)
      setError(null)
      try {
        const id = Number(planId)
        const [planData, competencyItems, employeesPage] = await Promise.all([
          developmentPlansApi.fetchDevelopmentPlanById(id),
          developmentPlansApi.fetchPlanCompetencyItems(id),
          companyId == null
            ? Promise.resolve({ content: [] })
            : employeesApi.fetchEmployeesRegistry({ company_id: companyId }, { size: 300, sort: 'fullName,asc' }),
        ])
        if (cancelled) return
        setPlan(planData)
        setCompetencies(Array.isArray(competencyItems) ? competencyItems : [])
        setEmployees(Array.isArray(employeesPage?.content) ? employeesPage.content : [])
      } catch (e) {
        if (cancelled) return
        if (e instanceof ApiError) setError(e.message)
        else if (e instanceof Error) setError(e.message)
        else setError('Не удалось загрузить ИПР')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [planId, companyId])

  const employeeNameById = useMemo(() => {
    const m = new Map()
    for (const e of employees) m.set(e.id, e.full_name)
    return m
  }, [employees])

  const planStatusKey = plan ? String(plan.status ?? '').toUpperCase() : ''
  const planStatusLabel = PLAN_STATUS_LABEL[/** @type {keyof typeof PLAN_STATUS_LABEL} */ (planStatusKey)] ?? plan?.status

  return (
    <article className="page">
      <ol className="page__breadcrumbs">
        <li><Link to="/">Главная</Link></li>
        <li><Link to="/development-plans">ИПР</Link></li>
        <li>План #{planId}</li>
      </ol>
      <h1 className="page__title">Детали ИПР</h1>

      {error ? <div className="entity-zone__error" role="alert">{error}</div> : null}
      {loading ? <p className="entity-zone__loading">Загрузка…</p> : null}
      {!loading && plan ? (
        <section className="entity-zone__summary">
          <header className="entity-zone__idp-hero">
            <div className="entity-zone__idp-hero-main">
              <p className="entity-zone__idp-hero-name">
                {employeeNameById.get(plan.employee_id) ?? `Сотрудник #${plan.employee_id}`}
              </p>
              <div className="entity-zone__idp-hero-meta">
                <span>Период: {formatDate(plan.period_start)} — {formatDate(plan.period_end)}</span>
                <span>Задач: {Array.isArray(plan.tasks) ? plan.tasks.length : 0}</span>
                <span>Компетенций: {competencies.length}</span>
              </div>
            </div>
            <span className={planStatusChipClass(plan.status)}>{planStatusLabel}</span>
          </header>

          <section className="entity-zone__idp-section" aria-labelledby="idp-tasks-heading">
            <h2 id="idp-tasks-heading" className="entity-zone__idp-section-title">Задачи</h2>
            <div className="entity-zone__idp-cards">
              {(plan.tasks ?? []).length === 0 ? (
                <p className="entity-zone__idp-muted">В этом плане пока нет задач.</p>
              ) : (
                (plan.tasks ?? []).map((task) => {
                  const st = String(task.status ?? '').toUpperCase()
                  const taskStLabel = TASK_STATUS_LABEL[/** @type {keyof typeof TASK_STATUS_LABEL} */ (st)] ?? task.status
                  const tt = String(task.task_type ?? '').toUpperCase()
                  const typeLabel =
                    TASK_TYPE_LABEL[/** @type {keyof typeof TASK_TYPE_LABEL} */ (tt)] ?? (task.task_type ?? '—')
                  const pr = String(task.priority ?? '').toUpperCase()
                  const priorityLabel =
                    TASK_PRIORITY_LABEL[/** @type {keyof typeof TASK_PRIORITY_LABEL} */ (pr)] ?? task.priority ?? '—'
                  return (
                    <article key={task.id} className="entity-zone__idp-card">
                      <div className="entity-zone__idp-card-head">
                        <Link className="entity-zone__idp-link" to={`/development-plans/${plan.id}/tasks/${task.id}`}>
                          {task.title}
                        </Link>
                        <div className="entity-zone__idp-chip-row">
                          <span className={taskStatusChipClass(st)}>{taskStLabel}</span>
                          <span className="entity-zone__idp-chip">{typeLabel}</span>
                          <span className="entity-zone__idp-chip">Приоритет: {priorityLabel}</span>
                        </div>
                      </div>
                      {task.description ? (
                        <p className="entity-zone__idp-task-desc">{task.description}</p>
                      ) : null}
                      <p className="entity-zone__idp-muted" style={{ marginTop: '0.5rem' }}>
                        Срок: {formatDate(task.due_date)}
                        {task.team_lead_task_score != null ? ` · Оценка тимлида: ${task.team_lead_task_score}` : ''}
                      </p>
                    </article>
                  )
                })
              )}
            </div>
          </section>

          <section className="entity-zone__idp-section" aria-labelledby="idp-comp-heading">
            <h2 id="idp-comp-heading" className="entity-zone__idp-section-title">Компетенции</h2>
            <div className="entity-zone__idp-cards">
              {competencies.length === 0 ? (
                <p className="entity-zone__idp-muted">Компетенции не привязаны к этому плану.</p>
              ) : (
                competencies.map((c) => (
                  <article key={c.id} className="entity-zone__idp-card">
                    <div className="entity-zone__idp-card-head">
                      <h3 className="entity-zone__idp-card-title">
                        {c.competency_name ?? c.competency_code ?? `Компетенция #${c.id}`}
                      </h3>
                      <span
                        className={
                          c.approved
                            ? 'entity-zone__idp-chip entity-zone__idp-chip--ok'
                            : 'entity-zone__idp-chip entity-zone__idp-chip--pending'
                        }
                      >
                        {c.approved ? 'Подтверждена' : 'Не подтверждена'}
                      </span>
                    </div>
                    <p className="entity-zone__idp-muted">
                      Комментарий тимлида: {c.team_lead_comment?.trim() ? c.team_lead_comment : '—'}
                    </p>
                    <p className="entity-zone__idp-muted" style={{ marginTop: '0.35rem' }}>
                      Связанные задачи:{' '}
                      {c.related_task_ids?.length ? c.related_task_ids.join(', ') : 'не найдены'}
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>
        </section>
      ) : null}
    </article>
  )
}
