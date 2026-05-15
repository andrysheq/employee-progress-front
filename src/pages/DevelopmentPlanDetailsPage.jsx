import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, developmentPlansApi, employeesApi } from '../api/index.js'
import { useAuth } from '../auth/useAuth.js'
import { hasTeamLeadRole } from '../auth/roleChecks.js'
import { resolveCompanyId } from '../config/companyContext.js'
import { DevelopmentPlanAddTaskForm } from '../components/DevelopmentPlanAddTaskForm.jsx'
import { formatDateTimeRuNoSeconds } from '../utils/dateFormat.js'
import './pages.css'
import './EntityZone.css'

const PLAN_STATUS_LABEL = {
  DRAFT: 'Черновик',
  ACTIVE: 'Активен',
  COMPLETED: 'Завершён',
  CLOSED: 'Закрыт',
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

const REVIEW_ROLE_LABEL = {
  EMPLOYEE: 'Сотрудник',
  MANAGER: 'Менеджер',
  TEAM_LEAD: 'Тимлид',
}

const REVIEW_STATUS_LABEL = {
  PENDING: 'Ожидает',
  APPROVED: 'Согласовано',
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
  if (s === 'COMPLETED' || s === 'CLOSED') return 'entity-zone__idp-chip entity-zone__idp-chip--status-done'
  return 'entity-zone__idp-chip entity-zone__idp-chip--status-planned'
}

/**
 * @param {object} props
 * @param {number} props.planId
 * @param {import('../api/developmentPlans.js').DevelopmentPlanCompetencyItemView} props.item
 * @param {number} props.participantEmployeeId
 * @param {() => Promise<void>} props.onUpdated
 */
function CompetencyTeamLeadApproveForm({ planId, item, participantEmployeeId, onUpdated }) {
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState(null)

  if (item.approved) {
    return null
  }

  return (
    <div style={{ marginTop: '0.75rem' }}>
      <label className="entity-zone__field entity-zone__field--grow">
        <span className="entity-zone__field-label">Комментарий при подтверждении (необязательно)</span>
        <textarea
          className="entity-zone__input"
          rows={2}
          value={comment}
          onChange={(ev) => setComment(ev.target.value)}
        />
      </label>
      {localError ? (
        <p className="entity-zone__error" role="alert" style={{ marginTop: '0.35rem' }}>
          {localError}
        </p>
      ) : null}
      <div className="entity-zone__actions" style={{ marginTop: '0.5rem' }}>
        <button
          type="button"
          className="entity-zone__button entity-zone__button--primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            setLocalError(null)
            try {
              await developmentPlansApi.teamLeadApproveCompetencyItem(planId, item.id, {
                participant_employee_id: participantEmployeeId,
                comment: comment.trim() === '' ? null : comment.trim(),
              })
              setComment('')
              await onUpdated()
            } catch (e) {
              if (e instanceof ApiError) setLocalError(e.message)
              else if (e instanceof Error) setLocalError(e.message)
              else setLocalError('Не удалось подтвердить компетенцию')
            } finally {
              setBusy(false)
            }
          }}
        >
          Подтвердить компетенцию
        </button>
      </div>
    </div>
  )
}

export function DevelopmentPlanDetailsPage() {
  const { planId } = useParams()
  const { companyId } = resolveCompanyId()
  const { roles, employeeIdFromJwt } = useAuth()
  const [plan, setPlan] = useState(null)
  const [competencies, setCompetencies] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [completeBusy, setCompleteBusy] = useState(false)
  const [completeError, setCompleteError] = useState(null)
  const [closeBusy, setCloseBusy] = useState(false)
  const [closeError, setCloseError] = useState(null)
  const [approveBusy, setApproveBusy] = useState(false)
  const [approveError, setApproveError] = useState(null)

  const loadAll = useCallback(async () => {
    if (!planId) return
    const id = Number(planId)
    if (!Number.isFinite(id)) return
    const [planData, competencyItems, employeesPage] = await Promise.all([
      developmentPlansApi.fetchDevelopmentPlanById(id),
      developmentPlansApi.fetchPlanCompetencyItems(id),
      companyId == null
        ? Promise.resolve({ content: [] })
        : employeesApi.fetchEmployeesRegistry({ company_id: companyId }, { size: 300, sort: 'fullName,asc' }),
    ])
    setPlan(planData)
    setCompetencies(Array.isArray(competencyItems) ? competencyItems : [])
    setEmployees(Array.isArray(employeesPage?.content) ? employeesPage.content : [])
  }, [planId, companyId])

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!planId) return
      setLoading(true)
      setError(null)
      setCompleteError(null)
      setCloseError(null)
      try {
        await loadAll()
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
  }, [planId, loadAll])

  const employeeNameById = useMemo(() => {
    const m = new Map()
    for (const e of employees) m.set(e.id, e.full_name)
    return m
  }, [employees])

  const planStatusKey = plan ? String(plan.status ?? '').toUpperCase() : ''
  const planStatusLabel = PLAN_STATUS_LABEL[/** @type {keyof typeof PLAN_STATUS_LABEL} */ (planStatusKey)] ?? plan?.status

  const isTeamLeadForPlan =
    hasTeamLeadRole(roles) &&
    plan != null &&
    plan.team_lead_id != null &&
    employeeIdFromJwt != null &&
    Number(plan.team_lead_id) === Number(employeeIdFromJwt)

  const planIsActive = plan != null && planStatusKey === 'ACTIVE'
  const planIsDraft = plan != null && planStatusKey === 'DRAFT'
  const planIsTerminal =
    plan != null && (planStatusKey === 'COMPLETED' || planStatusKey === 'CLOSED')
  const canTeamLeadAddTasks = isTeamLeadForPlan && (planIsActive || planIsDraft)
  const canTeamLeadClosePlan = isTeamLeadForPlan && (planIsActive || planIsDraft)

  const reviews = useMemo(() => {
    return Array.isArray(plan?.reviews) ? plan.reviews : []
  }, [plan])

  const myPendingReview = useMemo(() => {
    if (employeeIdFromJwt == null) {
      return null
    }
    return (
      reviews.find(
        (r) =>
          Number(r.reviewer_employee_id) === Number(employeeIdFromJwt) &&
          String(r.status ?? '').toUpperCase() === 'PENDING',
      ) ?? null
    )
  }, [reviews, employeeIdFromJwt])

  const showApprovalSection = plan != null && !planIsActive && !planIsTerminal

  const planReadyForComplete = useMemo(() => {
    if (!planIsActive || plan == null) {
      return false
    }
    const tasks = Array.isArray(plan.tasks) ? plan.tasks : []
    if (tasks.length === 0) {
      return false
    }
    const allTasksDoneWithScore = tasks.every((task) => {
      const st = String(task.status ?? '').toUpperCase()
      if (st !== 'DONE') {
        return false
      }
      const score = task.team_lead_task_score
      if (score == null || !Number.isFinite(Number(score))) {
        return false
      }
      const n = Number(score)
      return n >= 1 && n <= 10
    })
    if (!allTasksDoneWithScore) {
      return false
    }
    if (competencies.length === 0) {
      return true
    }
    return competencies.every((c) => c.approved === true)
  }, [plan, planIsActive, competencies])

  const reloadCompetenciesOnly = useCallback(async () => {
    if (!planId) return
    const id = Number(planId)
    const items = await developmentPlansApi.fetchPlanCompetencyItems(id)
    setCompetencies(Array.isArray(items) ? items : [])
  }, [planId])

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

          {planIsActive ? (
            <p className="entity-zone__idp-muted" style={{ marginTop: '0.75rem' }}>
              ИПР активен{plan.approved_at ? ` (согласован: ${formatDate(plan.approved_at)})` : ''}. Работа с задачами и
              прогрессом доступна участникам.
            </p>
          ) : null}

          {showApprovalSection ? (
            <section className="entity-zone__idp-section" aria-labelledby="idp-approval-heading">
              <h2 id="idp-approval-heading" className="entity-zone__idp-section-title">
                Согласование ИПР
              </h2>
              <p className="entity-zone__idp-muted">
                Для активации плана необходимо подтверждение сотрудника, менеджера и тимлида. После всех
                согласований ИПР станет активным, и откроется работа с задачами.
              </p>
              <div className="entity-zone__idp-cards" style={{ marginTop: '0.75rem' }}>
                {reviews.length === 0 ? (
                  <p className="entity-zone__idp-muted">Данные о согласованиях пока недоступны.</p>
                ) : (
                  reviews.map((review) => {
                    const roleKey = String(review.reviewer_role ?? '').toUpperCase()
                    const roleLabel =
                      REVIEW_ROLE_LABEL[/** @type {keyof typeof REVIEW_ROLE_LABEL} */ (roleKey)] ??
                      review.reviewer_role ??
                      '—'
                    const stKey = String(review.status ?? '').toUpperCase()
                    const stLabel =
                      REVIEW_STATUS_LABEL[/** @type {keyof typeof REVIEW_STATUS_LABEL} */ (stKey)] ??
                      review.status ??
                      '—'
                    const reviewerName =
                      employeeNameById.get(review.reviewer_employee_id) ??
                      `Сотрудник #${review.reviewer_employee_id}`
                    const isApproved = stKey === 'APPROVED'
                    return (
                      <article key={review.id} className="entity-zone__idp-card">
                        <div className="entity-zone__idp-card-head">
                          <h3 className="entity-zone__idp-card-title">{roleLabel}</h3>
                          <span
                            className={
                              isApproved
                                ? 'entity-zone__idp-chip entity-zone__idp-chip--ok'
                                : 'entity-zone__idp-chip entity-zone__idp-chip--pending'
                            }
                          >
                            {stLabel}
                          </span>
                        </div>
                        <p className="entity-zone__idp-muted" style={{ marginTop: '0.35rem' }}>
                          {reviewerName}
                        </p>
                        {review.approved_at ? (
                          <p className="entity-zone__idp-muted" style={{ marginTop: '0.25rem' }}>
                            {formatDateTimeRuNoSeconds(review.approved_at)}
                          </p>
                        ) : null}
                      </article>
                    )
                  })
                )}
              </div>
              {myPendingReview != null && employeeIdFromJwt != null ? (
                <div style={{ marginTop: '1rem' }}>
                  <p className="entity-zone__idp-muted" style={{ marginBottom: '0.5rem' }}>
                    Вы — участник согласования. Подтвердите ИПР, чтобы зафиксировать своё согласие.
                  </p>
                  {approveError ? (
                    <div className="entity-zone__error" role="alert" style={{ marginBottom: '0.5rem' }}>
                      {approveError}
                    </div>
                  ) : null}
                  <div className="entity-zone__actions">
                    <button
                      type="button"
                      className="entity-zone__button entity-zone__button--primary"
                      disabled={approveBusy}
                      onClick={async () => {
                        if (!plan?.id) return
                        setApproveBusy(true)
                        setApproveError(null)
                        try {
                          const updated = await developmentPlansApi.changeDevelopmentPlanStatus(plan.id, {
                            status: 'ACTIVE',
                            participant_employee_id: employeeIdFromJwt,
                          })
                          setPlan(updated)
                          await loadAll()
                        } catch (e) {
                          if (e instanceof ApiError) setApproveError(e.message)
                          else if (e instanceof Error) setApproveError(e.message)
                          else setApproveError('Не удалось согласовать ИПР')
                        } finally {
                          setApproveBusy(false)
                        }
                      }}
                    >
                      Согласовать ИПР
                    </button>
                  </div>
                </div>
              ) : null}
              {myPendingReview == null && !planIsActive && reviews.length > 0 ? (
                <p className="entity-zone__idp-muted" style={{ marginTop: '1rem' }}>
                  {reviews.every((r) => String(r.status ?? '').toUpperCase() === 'APPROVED') ? (
                    <>
                      Все участники согласовали ИПР. Обновите страницу — план будет активирован автоматически.
                    </>
                  ) : (
                    <>
                      Ваше согласование уже зафиксировано или вы не являетесь участником этого ИПР. Ожидайте
                      подтверждения остальных участников.
                    </>
                  )}
                </p>
              ) : null}
            </section>
          ) : null}

          {isTeamLeadForPlan && (planIsActive || planIsDraft) ? (
            <section className="entity-zone__idp-section" aria-labelledby="idp-tl-actions-heading">
              <h2 id="idp-tl-actions-heading" className="entity-zone__idp-section-title">
                Действия тимлида
              </h2>
              {planIsActive ? (
                <p className="entity-zone__idp-muted">
                  Завершение доступно, когда все задачи выполнены с оценкой тимлида (1–10) и все компетенции
                  подтверждены. Закрытие ИПР — отмена плана без завершения работ.
                </p>
              ) : (
                <p className="entity-zone__idp-muted">
                  Завершить черновик можно без проверки задач. Закрытие ИПР — отмена черновика.
                </p>
              )}
              {completeError ? (
                <div className="entity-zone__error" role="alert" style={{ marginTop: '0.5rem' }}>
                  {completeError}
                </div>
              ) : null}
              {closeError ? (
                <div className="entity-zone__error" role="alert" style={{ marginTop: '0.5rem' }}>
                  {closeError}
                </div>
              ) : null}
              <div className="entity-zone__actions entity-zone__actions--idp-tl" style={{ marginTop: '0.5rem' }}>
                {(planIsDraft || (planIsActive && planReadyForComplete)) ? (
                  <button
                    type="button"
                    className="entity-zone__button entity-zone__button--primary"
                    disabled={completeBusy || closeBusy}
                    onClick={async () => {
                      if (!plan?.id) return
                      if (
                        planIsDraft &&
                        !window.confirm('Завершить ИПР в статусе черновика без согласования и проверки задач?')
                      ) {
                        return
                      }
                      setCompleteBusy(true)
                      setCompleteError(null)
                      try {
                        await developmentPlansApi.changeDevelopmentPlanStatus(plan.id, { status: 'COMPLETED' })
                        await loadAll()
                      } catch (e) {
                        if (e instanceof ApiError) setCompleteError(e.message)
                        else if (e instanceof Error) setCompleteError(e.message)
                        else setCompleteError('Не удалось завершить ИПР')
                      } finally {
                        setCompleteBusy(false)
                      }
                    }}
                  >
                    Завершить ИПР
                  </button>
                ) : null}
                {canTeamLeadClosePlan ? (
                  <button
                    type="button"
                    className="entity-zone__button entity-zone__button--end entity-zone__button--accent-on-hover"
                    disabled={closeBusy || completeBusy}
                    onClick={async () => {
                      if (!plan?.id) return
                      if (!window.confirm('Закрыть (отменить) ИПР? Дальнейшая работа по плану будет недоступна.')) {
                        return
                      }
                      setCloseBusy(true)
                      setCloseError(null)
                      try {
                        await developmentPlansApi.changeDevelopmentPlanStatus(plan.id, { status: 'CLOSED' })
                        await loadAll()
                      } catch (e) {
                        if (e instanceof ApiError) setCloseError(e.message)
                        else if (e instanceof Error) setCloseError(e.message)
                        else setCloseError('Не удалось закрыть ИПР')
                      } finally {
                        setCloseBusy(false)
                      }
                    }}
                  >
                    Закрыть ИПР
                  </button>
                ) : null}
              </div>
            </section>
          ) : null}

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
                      </p>
                      {task.team_lead_task_score != null ? (
                        <p className="entity-zone__idp-muted" style={{ marginTop: '0.25rem' }}>
                          Оценка тимлида: {task.team_lead_task_score}
                        </p>
                      ) : null}
                    </article>
                  )
                })
              )}
            </div>
            {canTeamLeadAddTasks && plan?.id ? (
              <DevelopmentPlanAddTaskForm
                planId={plan.id}
                defaultPlannedStartDate={plan.period_start}
                onCreated={loadAll}
              />
            ) : null}
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
                    {c.employee_progress_notes?.trim() ? (
                      <p className="entity-zone__idp-muted" style={{ marginTop: '0.35rem', whiteSpace: 'pre-wrap' }}>
                        Прогресс сотрудника: {c.employee_progress_notes}
                      </p>
                    ) : (
                      <p className="entity-zone__idp-muted" style={{ marginTop: '0.35rem' }}>
                        Прогресс сотрудника: —
                      </p>
                    )}
                    <p className="entity-zone__idp-muted" style={{ marginTop: '0.35rem' }}>
                      Комментарий тимлида: {c.team_lead_comment?.trim() ? c.team_lead_comment : '—'}
                    </p>
                    <p className="entity-zone__idp-muted" style={{ marginTop: '0.35rem' }}>
                      Связанные задачи:{' '}
                      {c.related_task_ids?.length ? c.related_task_ids.join(', ') : 'не найдены'}
                    </p>
                    {isTeamLeadForPlan && planIsActive && employeeIdFromJwt != null ? (
                      <CompetencyTeamLeadApproveForm
                        planId={plan.id}
                        item={c}
                        participantEmployeeId={employeeIdFromJwt}
                        onUpdated={reloadCompetenciesOnly}
                      />
                    ) : null}
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
