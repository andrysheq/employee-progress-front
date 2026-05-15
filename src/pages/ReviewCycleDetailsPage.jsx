import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, employeesApi, gradeModelApi, promotionDecisionsApi, reviewCyclesApi } from '../api/index.js'
import { useAuth } from '../auth/useAuth.js'
import { hasDirectorRole } from '../auth/roleChecks.js'
import { resolveCompanyId } from '../config/companyContext.js'
import { formatDateTimeRuNoSeconds } from '../utils/dateFormat.js'
import './pages.css'
import './EntityZone.css'

const INTERVIEW_TYPE_LABEL = {
  FINAL_PROMOTION: 'Собеседование на повышение сотрудника',
}

const STATUS_LABEL = {
  SCHEDULED: 'Запланирован',
  COMPLETED: 'Завершён',
  CANCELLED: 'Отменён',
}

const DECISION_LABEL = {
  APPROVED: 'Повышение одобрено',
  REJECTED: 'Повышение отклонено',
}

/**
 * @param {string | null | undefined} iso
 */
function toDatetimeLocalValue(iso) {
  if (!iso) {
    return ''
  }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return ''
  }
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * @param {string} status
 */
function reviewStatusChipClass(status) {
  const s = String(status ?? '').toUpperCase()
  if (s === 'COMPLETED') return 'entity-zone__idp-chip entity-zone__idp-chip--status-done'
  if (s === 'CANCELLED') return 'entity-zone__idp-chip entity-zone__idp-chip--pending'
  return 'entity-zone__idp-chip entity-zone__idp-chip--status-planned'
}

export function ReviewCycleDetailsPage() {
  const { reviewCycleId } = useParams()
  const { companyId } = resolveCompanyId()
  const { roles, employeeIdFromJwt } = useAuth()
  const canActAsDirector = hasDirectorRole(roles)

  const [cycle, setCycle] = useState(/** @type {import('../api/reviewCycles.js').ReviewCycleView | null} */ (null))
  const [scheduleHistory, setScheduleHistory] = useState(
    /** @type {import('../api/reviewCycles.js').PromotionInterviewScheduleHistoryView[]} */ ([]),
  )
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  const [linkedDecision, setLinkedDecision] = useState(
    /** @type {import('../api/promotionDecisions.js').PromotionDecisionView | null} */ (null),
  )
  const [eligibleGrades, setEligibleGrades] = useState(/** @type {import('../api/gradeModel.js').GradeView[]} */ ([]))
  const [gradeOptionsLoading, setGradeOptionsLoading] = useState(false)
  const [gradeOptionsMessage, setGradeOptionsMessage] = useState(/** @type {string | null} */ (null))

  const [activeAction, setActiveAction] = useState(/** @type {'reschedule' | 'approve' | 'reject' | null} */ (null))
  const [targetGradeId, setTargetGradeId] = useState('')
  const [rationale, setRationale] = useState('')
  const [improvementPlanSummary, setImprovementPlanSummary] = useState('')
  const [rescheduleAt, setRescheduleAt] = useState('')
  const [rescheduleComment, setRescheduleComment] = useState('')

  const [actionBusy, setActionBusy] = useState(false)
  const [actionError, setActionError] = useState(/** @type {string | null} */ (null))
  const [actionInfo, setActionInfo] = useState(/** @type {string | null} */ (null))
  const [policyAdvisories, setPolicyAdvisories] = useState(/** @type {string[] | null} */ (null))

  const reloadCycle = useCallback(async () => {
    const id = Number(reviewCycleId)
    if (!Number.isFinite(id)) {
      return
    }
    const data = await reviewCyclesApi.fetchReviewCycleById(id)
    setCycle(data)
    setRescheduleAt(toDatetimeLocalValue(data.scheduled_at))
  }, [reviewCycleId])

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!reviewCycleId) return
      const id = Number(reviewCycleId)
      if (!Number.isFinite(id)) {
        setError('Некорректный идентификатор собеседования')
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const [data, employeesPage, history] = await Promise.all([
          reviewCyclesApi.fetchReviewCycleById(id),
          companyId == null
            ? Promise.resolve({ content: [] })
            : employeesApi.fetchEmployeesRegistry({ company_id: companyId }, { size: 300, sort: 'fullName,asc' }),
          reviewCyclesApi.fetchPromotionInterviewScheduleHistory(id).catch(() => []),
        ])
        if (cancelled) return
        setCycle(data)
        setRescheduleAt(toDatetimeLocalValue(data.scheduled_at))
        setScheduleHistory(Array.isArray(history) ? history : [])
        setEmployees(Array.isArray(employeesPage?.content) ? employeesPage.content : [])
      } catch (e) {
        if (cancelled) return
        if (e instanceof ApiError) setError(e.message)
        else if (e instanceof Error) setError(e.message)
        else setError('Не удалось загрузить собеседование')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [reviewCycleId, companyId])

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!cycle || String(cycle.review_type).toUpperCase() !== 'FINAL_PROMOTION') {
        setLinkedDecision(null)
        return
      }
      try {
        const list = await promotionDecisionsApi.fetchPromotionDecisions({
          review_cycle_id: cycle.review_cycle_id,
        })
        if (!cancelled) {
          setLinkedDecision(Array.isArray(list) && list.length > 0 ? list[0] : null)
        }
      } catch {
        if (!cancelled) {
          setLinkedDecision(null)
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [cycle])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setEligibleGrades([])
      setGradeOptionsMessage(null)
      setTargetGradeId('')

      if (
        !canActAsDirector ||
        !cycle ||
        String(cycle.review_type).toUpperCase() !== 'FINAL_PROMOTION' ||
        String(cycle.status).toUpperCase() !== 'SCHEDULED' ||
        companyId == null
      ) {
        setGradeOptionsLoading(false)
        return
      }

      setGradeOptionsLoading(true)
      try {
        const cur = await employeesApi.fetchEmployeeCurrentGrade(cycle.employee_id)
        if (cancelled) {
          return
        }
        const positionId = typeof cur.position_id === 'number' ? cur.position_id : null
        if (positionId == null) {
          setGradeOptionsMessage('У сотрудника не указана должность в текущем грейде.')
          return
        }
        const levelOrder = Number(cur.grade_level_order)
        if (!Number.isFinite(levelOrder)) {
          setGradeOptionsMessage('Не удалось определить уровень текущего грейда.')
          return
        }
        const page = await gradeModelApi.fetchGradeRegistry(
          {
            company_id: companyId,
            position_id: positionId,
            is_active: true,
            level_from: Math.min(32767, Math.trunc(levelOrder) + 1),
          },
          { size: 80, sort: 'levelOrder,asc' },
        )
        if (cancelled) {
          return
        }
        const list = Array.isArray(page.content) ? page.content.filter((g) => g.is_active !== false) : []
        setEligibleGrades(list)
        if (list.length === 0) {
          setGradeOptionsMessage('Нет грейдов выше текущего для этой должности.')
        }
      } catch (e) {
        if (cancelled) {
          return
        }
        setEligibleGrades([])
        if (e instanceof ApiError && e.httpStatus === 404) {
          setGradeOptionsMessage('У сотрудника не зафиксирован текущий грейд.')
        } else if (e instanceof ApiError) {
          setGradeOptionsMessage(e.message)
        } else if (e instanceof Error) {
          setGradeOptionsMessage(e.message)
        } else {
          setGradeOptionsMessage('Не удалось загрузить список грейдов')
        }
      } finally {
        if (!cancelled) {
          setGradeOptionsLoading(false)
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [canActAsDirector, cycle, companyId])

  const employeeNameById = useMemo(() => {
    const m = new Map()
    for (const e of employees) m.set(e.id, e.full_name)
    return m
  }, [employees])

  const planIds = useMemo(() => {
    if (!cycle) return []
    const raw = cycle.considered_development_plan_ids
    return Array.isArray(raw) ? raw : []
  }, [cycle])

  const extraPlanIds = useMemo(() => {
    if (!cycle) return []
    return planIds.filter((pid) => pid !== cycle.plan_id)
  }, [planIds, cycle])

  const reviewTypeKey = cycle ? String(cycle.review_type).toUpperCase() : ''
  const statusKey = cycle ? String(cycle.status).toUpperCase() : ''
  const isFinalPromotion = reviewTypeKey === 'FINAL_PROMOTION'
  const isScheduled = statusKey === 'SCHEDULED'
  const showDirectorActions = canActAsDirector && isFinalPromotion && isScheduled && linkedDecision == null

  /**
   * @param {'APPROVED' | 'REJECTED'} decisionType
   */
  async function handleMakeDecision(decisionType) {
    if (!cycle || employeeIdFromJwt == null) {
      setActionError('Не удалось определить сотрудника-директора в сессии.')
      return
    }
    const trimmedRationale = rationale.trim()
    if (trimmedRationale === '') {
      setActionError('Укажите обоснование решения.')
      return
    }
    if (decisionType === 'APPROVED' && targetGradeId === '') {
      setActionError('Выберите целевой грейд для одобрения повышения.')
      return
    }
    if (decisionType === 'REJECTED' && improvementPlanSummary.trim() === '') {
      setActionError('Укажите план доработки. После отклонения потребуется новый ИПР и новое собеседование.')
      return
    }

    setActionBusy(true)
    setActionError(null)
    setActionInfo(null)
    setPolicyAdvisories(null)
    try {
      const result = await reviewCyclesApi.makeFinalPromotionDecision(cycle.review_cycle_id, {
        director_employee_id: employeeIdFromJwt,
        decision: decisionType,
        target_grade_id: decisionType === 'APPROVED' ? Number(targetGradeId) : null,
        rationale: trimmedRationale,
        improvement_plan_summary: decisionType === 'REJECTED' ? improvementPlanSummary.trim() : null,
      })
      await reloadCycle()
      const list = await promotionDecisionsApi.fetchPromotionDecisions({
        review_cycle_id: cycle.review_cycle_id,
      })
      setLinkedDecision(Array.isArray(list) && list.length > 0 ? list[0] : null)
      setActionInfo(`Кадровое решение зафиксировано (№${result.promotion_decision_id}).`)
      if (Array.isArray(result.policy_advisories) && result.policy_advisories.length > 0) {
        setPolicyAdvisories(result.policy_advisories)
      }
      setActiveAction(null)
    } catch (e) {
      if (e instanceof ApiError) setActionError(e.message)
      else if (e instanceof Error) setActionError(e.message)
      else setActionError('Не удалось зафиксировать кадровое решение')
    } finally {
      setActionBusy(false)
    }
  }

  async function handleReschedule() {
    if (!cycle || employeeIdFromJwt == null) {
      setActionError('Не удалось определить сотрудника-директора в сессии.')
      return
    }
    if (rescheduleAt.trim() === '') {
      setActionError('Укажите новую плановую дату и время собеседования.')
      return
    }
    setActionBusy(true)
    setActionError(null)
    setActionInfo(null)
    try {
      const updated = await reviewCyclesApi.rescheduleReviewCycle(cycle.review_cycle_id, {
        rescheduled_by_employee_id: employeeIdFromJwt,
        scheduled_at: `${rescheduleAt.trim()}:00`,
        comment: rescheduleComment.trim() || null,
      })
      setCycle(updated)
      setRescheduleAt(toDatetimeLocalValue(updated.scheduled_at))
      const history = await reviewCyclesApi.fetchPromotionInterviewScheduleHistory(cycle.review_cycle_id)
      setScheduleHistory(Array.isArray(history) ? history : [])
      setActionInfo('Дата собеседования перенесена, запись добавлена в историю.')
      setActiveAction(null)
    } catch (e) {
      if (e instanceof ApiError) setActionError(e.message)
      else if (e instanceof Error) setActionError(e.message)
      else setActionError('Не удалось перенести собеседование')
    } finally {
      setActionBusy(false)
    }
  }

  return (
    <article className="page">
      <ol className="page__breadcrumbs">
        <li><Link to="/">Главная</Link></li>
        <li><Link to="/reviews">Собеседования</Link></li>
        <li>Собеседование #{reviewCycleId}</li>
      </ol>
      <h1 className="page__title">Собеседование на повышение</h1>

      {error ? <div className="entity-zone__error" role="alert">{error}</div> : null}
      {loading ? <p className="entity-zone__loading">Загрузка…</p> : null}

      {!loading && cycle ? (
        <section className="entity-zone__summary">
          <header className="entity-zone__idp-hero">
            <div className="entity-zone__idp-hero-main">
              <p className="entity-zone__idp-hero-name">
                {employeeNameById.get(cycle.employee_id) ?? `Сотрудник #${cycle.employee_id}`}
              </p>
              <p className="entity-zone__idp-muted" style={{ marginTop: '0.25rem' }}>
                {INTERVIEW_TYPE_LABEL[/** @type {keyof typeof INTERVIEW_TYPE_LABEL} */ (reviewTypeKey)] ?? 'Собеседование на повышение'}
              </p>
              <div
                className="entity-zone__idp-hero-meta"
                style={{ marginTop: '0.5rem', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}
              >
                <span>Плановая дата встречи: {formatDateTimeRuNoSeconds(cycle.scheduled_at)}</span>
                <span>Дата создания: {formatDateTimeRuNoSeconds(cycle.created_at)}</span>
                <span>Дата завершения: {formatDateTimeRuNoSeconds(cycle.completed_at)}</span>
              </div>
            </div>
            <span className={reviewStatusChipClass(cycle.status)}>
              {STATUS_LABEL[/** @type {keyof typeof STATUS_LABEL} */ (statusKey)] ?? cycle.status}
            </span>
          </header>

          {linkedDecision ? (
            <section className="entity-zone__idp-section">
              <h2 className="entity-zone__idp-section-title">Кадровое решение</h2>
              <article className="entity-zone__idp-card">
                <p className="entity-zone__idp-muted">
                  {DECISION_LABEL[/** @type {keyof typeof DECISION_LABEL} */ (String(linkedDecision.decision).toUpperCase())] ??
                    linkedDecision.decision}
                  {linkedDecision.to_grade_code ? ` → ${linkedDecision.to_grade_code}` : ''}
                </p>
                <p className="entity-zone__idp-muted" style={{ marginTop: '0.35rem' }}>
                  <Link className="entity-zone__idp-link" to={`/promotion-decisions/${linkedDecision.decision_id}`}>
                    Открыть карточку решения
                  </Link>
                </p>
              </article>
            </section>
          ) : null}

          {canActAsDirector && isFinalPromotion && isScheduled ? (
            <section className="entity-zone__idp-section">
              <h2 className="entity-zone__idp-section-title">Действия директора</h2>

              {actionError ? (
                <div className="entity-zone__error" role="alert" style={{ marginBottom: '0.75rem' }}>
                  {actionError}
                </div>
              ) : null}
              {actionInfo ? (
                <p className="entity-zone__idp-muted" style={{ marginBottom: '0.75rem' }}>
                  {actionInfo}
                </p>
              ) : null}
              {policyAdvisories && policyAdvisories.length > 0 ? (
                <ul className="entity-zone__idp-muted" style={{ marginBottom: '0.75rem' }}>
                  {policyAdvisories.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              ) : null}

              {showDirectorActions ? (
                <div className="entity-zone__filters">
                  <p className="entity-zone__idp-muted" style={{ gridColumn: '1 / -1' }}>
                    Изучите связанные ИПР, проведите встречу, затем выберите действие ниже.
                  </p>
                  <div className="entity-zone__actions entity-zone__actions--idp-tl" style={{ gridColumn: '1 / -1', marginBottom: '0.5rem' }}>
                    <button type="button" className="entity-zone__button" disabled={actionBusy} onClick={() => setActiveAction('reschedule')}>
                      Перенести собеседование
                    </button>
                    <button type="button" className="entity-zone__button" disabled={actionBusy} onClick={() => setActiveAction('reject')}>
                      Отклонить повышение
                    </button>
                    <button type="button" className="entity-zone__button entity-zone__button--primary" disabled={actionBusy} onClick={() => setActiveAction('approve')}>
                      Одобрить повышение
                    </button>
                  </div>

                  {activeAction === 'approve' ? (
                    <>
                      <label className="entity-zone__field entity-zone__field--grow">
                        <span className="entity-zone__field-label">Целевой грейд</span>
                        <select
                          className="entity-zone__select"
                          value={targetGradeId}
                          onChange={(ev) => setTargetGradeId(ev.target.value)}
                          disabled={actionBusy || gradeOptionsLoading || eligibleGrades.length === 0}
                        >
                          <option value="">Выберите грейд</option>
                          {eligibleGrades.map((g) => (
                            <option key={g.id} value={String(g.id)}>
                              {g.name} (уровень {g.level_order})
                            </option>
                          ))}
                        </select>
                        {gradeOptionsMessage ? (
                          <span className="entity-zone__idp-muted" style={{ display: 'block', marginTop: '0.25rem' }}>
                            {gradeOptionsMessage}
                          </span>
                        ) : null}
                      </label>
                      <label className="entity-zone__field entity-zone__field--grow" style={{ gridColumn: '1 / -1' }}>
                        <span className="entity-zone__field-label">Обоснование</span>
                        <textarea className="entity-zone__input" rows={3} value={rationale} onChange={(ev) => setRationale(ev.target.value)} disabled={actionBusy} />
                      </label>
                      <div className="entity-zone__actions" style={{ gridColumn: '1 / -1' }}>
                        <button type="button" className="entity-zone__button entity-zone__button--primary" disabled={actionBusy} onClick={() => void handleMakeDecision('APPROVED')}>
                          Одобрить
                        </button>
                      </div>
                    </>
                  ) : null}

                  {activeAction === 'reject' ? (
                    <>
                      <label className="entity-zone__field entity-zone__field--grow" style={{ gridColumn: '1 / -1' }}>
                        <span className="entity-zone__field-label">План доработки</span>
                        <textarea className="entity-zone__input" rows={3} value={improvementPlanSummary} onChange={(ev) => setImprovementPlanSummary(ev.target.value)} disabled={actionBusy} />
                      </label>
                      <label className="entity-zone__field entity-zone__field--grow" style={{ gridColumn: '1 / -1' }}>
                        <span className="entity-zone__field-label">Обоснование отклонения</span>
                        <textarea className="entity-zone__input" rows={3} value={rationale} onChange={(ev) => setRationale(ev.target.value)} disabled={actionBusy} />
                      </label>
                      <p className="entity-zone__idp-muted" style={{ gridColumn: '1 / -1' }}>
                        После отклонения создайте новый ИПР, завершите его и назначьте новое собеседование.
                      </p>
                      <div className="entity-zone__actions" style={{ gridColumn: '1 / -1' }}>
                        <button type="button" className="entity-zone__button entity-zone__button--primary" disabled={actionBusy} onClick={() => void handleMakeDecision('REJECTED')}>
                          Зафиксировать отклонение
                        </button>
                      </div>
                    </>
                  ) : null}

                  {activeAction === 'reschedule' ? (
                    <div className="entity-zone__filters entity-zone__filters--reschedule-row">
                      <label className="entity-zone__field">
                        <span className="entity-zone__field-label">Новая дата и время</span>
                        <input className="entity-zone__input" type="datetime-local" value={rescheduleAt} onChange={(ev) => setRescheduleAt(ev.target.value)} disabled={actionBusy} />
                      </label>
                      <label className="entity-zone__field entity-zone__field--grow">
                        <span className="entity-zone__field-label">Комментарий</span>
                        <input className="entity-zone__input" value={rescheduleComment} onChange={(ev) => setRescheduleComment(ev.target.value)} disabled={actionBusy} />
                      </label>
                      <div className="entity-zone__actions entity-zone__actions--reschedule-submit">
                        <button type="button" className="entity-zone__button entity-zone__button--primary" disabled={actionBusy} onClick={() => void handleReschedule()}>
                          Подтвердить
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="entity-zone__idp-section">
            <h2 className="entity-zone__idp-section-title">Участники</h2>
            <div className="entity-zone__idp-cards">
              <article className="entity-zone__idp-card">
                <p className="entity-zone__idp-muted">
                  Инициатор:{' '}
                  {employeeNameById.get(cycle.initiated_by_employee_id) ?? `Сотрудник #${cycle.initiated_by_employee_id}`}
                </p>
                <p className="entity-zone__idp-muted" style={{ marginTop: '0.35rem' }}>
                  Сотрудник:{' '}
                  <Link className="entity-zone__idp-link" to={`/employees/${cycle.employee_id}`}>
                    {employeeNameById.get(cycle.employee_id) ?? `Профиль #${cycle.employee_id}`}
                  </Link>
                </p>
              </article>
            </div>
          </section>

          <section className="entity-zone__idp-section">
            <h2 className="entity-zone__idp-section-title">Связанные ИПР</h2>
            <div className="entity-zone__idp-cards">
              {cycle.plan_id != null ? (
                <article className="entity-zone__idp-card">
                  <div className="entity-zone__idp-card-head">
                    <Link className="entity-zone__idp-link" to={`/development-plans/${cycle.plan_id}`}>
                      Связанный ИПР #{cycle.plan_id}
                    </Link>
                  </div>
                </article>
              ) : null}
              {extraPlanIds.length === 0 && cycle.plan_id == null ? (
                <p className="entity-zone__idp-muted">ИПР в карточке не указаны.</p>
              ) : null}
              {extraPlanIds.map((pid) => (
                <article key={pid} className="entity-zone__idp-card">
                  <div className="entity-zone__idp-card-head">
                    <Link className="entity-zone__idp-link" to={`/development-plans/${pid}`}>
                      ИПР #{pid}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {scheduleHistory.length > 0 ? (
            <section className="entity-zone__idp-section">
              <h2 className="entity-zone__idp-section-title">История переносов</h2>
              <div className="entity-zone__idp-cards">
                {scheduleHistory.map((h) => (
                  <article key={h.history_id} className="entity-zone__idp-card">
                    <p className="entity-zone__idp-muted">
                      {formatDateTimeRuNoSeconds(h.previous_scheduled_at)} → {formatDateTimeRuNoSeconds(h.new_scheduled_at)}
                    </p>
                    {h.comment ? (
                      <p className="entity-zone__idp-muted" style={{ marginTop: '0.35rem' }}>
                        {h.comment}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </section>
      ) : null}
    </article>
  )
}
