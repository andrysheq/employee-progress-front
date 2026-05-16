import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, employeesApi, gradeModelApi, promotionDecisionsApi, reviewCyclesApi } from '../api/index.js'
import { useAuth } from '../auth/useAuth.js'
import { hasDepartmentDirectorRole, hasDirectorRole, hasGeneralDirectorRole } from '../auth/roleChecks.js'
import { resolveCompanyId } from '../config/companyContext.js'
import { formatDateTimeRuNoSeconds } from '../utils/dateFormat.js'
import { InlineAlert } from '../components/ui/Alert.jsx'
import { SelectDropdown } from '../components/ui/SelectDropdown.jsx'
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
  APPROVED_BY_DEPARTMENT_DIRECTOR: 'Одобрено директором отдела',
  APPROVED_BY_GENERAL_DIRECTOR: 'Одобрено генеральным директором',
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

/**
 * @param {unknown} raw
 * @returns {string | null}
 */
function formatWeightedAdvisoryScoreDisplay(raw) {
  if (raw == null || raw === '') {
    return null
  }
  const n = Number(raw)
  if (!Number.isFinite(n)) {
    return null
  }
  return n.toFixed(2).replace('.', ',')
}

/**
 * @param {unknown} amount
 */
function formatRubAmount(amount) {
  if (amount == null || amount === '') {
    return null
  }
  const n = Math.trunc(Number(amount))
  if (!Number.isFinite(n)) {
    return null
  }
  return `${n.toLocaleString('ru-RU')} ₽`
}

/**
 * @param {import('../api/gradeModel.js').GradeView | null | undefined} g
 */
function salaryForkCaption(g) {
  if (!g) {
    return '—'
  }
  const min = g.salary_min_amount
  const max = g.salary_max_amount
  if (min == null && max == null) {
    return 'вилка не задана в матрице грейдов'
  }
  if (min != null && max != null) {
    return `${formatRubAmount(min)} — ${formatRubAmount(max)}`
  }
  if (min != null) {
    return `от ${formatRubAmount(min)}`
  }
  return `до ${formatRubAmount(max)}`
}

/**
 * @param {import('../api/employees.js').EmployeeView | null | undefined} emp
 */
function formatEmployeeCurrentSalaryDisplay(emp) {
  if (!emp) {
    return 'не зафиксирован'
  }
  if (emp.current_salary_redacted === true) {
    return 'недоступен'
  }
  return formatRubAmount(emp.current_salary_rub_month) ?? 'не зафиксирован'
}

export function ReviewCycleDetailsPage() {
  const { reviewCycleId } = useParams()
  const { companyId } = resolveCompanyId()
  const { roles, employeeIdFromJwt } = useAuth()
  const canActAsDirector = hasDirectorRole(roles)
  const canActAsDepartmentDirector = hasDepartmentDirectorRole(roles)
  const canActAsGeneralDirector = hasGeneralDirectorRole(roles)

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

  const [activeAction, setActiveAction] = useState(/** @type {'reschedule' | null} */ (null))
  const [targetGradeId, setTargetGradeId] = useState('')
  const [rationale, setRationale] = useState('')
  const [improvementPlanSummary, setImprovementPlanSummary] = useState('')
  const [rescheduleAt, setRescheduleAt] = useState('')
  const [rescheduleComment, setRescheduleComment] = useState('')

  const [subjectEmployee, setSubjectEmployee] = useState(
    /** @type {import('../api/employees.js').EmployeeView | null} */ (null),
  )
  const [directorModal, setDirectorModal] = useState(/** @type {'approve' | 'reject' | null} */ (null))
  const [modalSalaryRub, setModalSalaryRub] = useState('')
  const [modalError, setModalError] = useState(/** @type {string | null} */ (null))
  const [generalDirectorModal, setGeneralDirectorModal] = useState(/** @type {'approve' | 'reject' | null} */ (null))
  const [gdRationale, setGdRationale] = useState('')
  const [gdImprovementPlanSummary, setGdImprovementPlanSummary] = useState('')
  const [gdModalError, setGdModalError] = useState(/** @type {string | null} */ (null))

  const [actionBusy, setActionBusy] = useState(false)
  const [actionError, setActionError] = useState(/** @type {string | null} */ (null))
  const [actionInfo, setActionInfo] = useState(/** @type {string | null} */ (null))
  /** Снимок ответа POST решения; приоритетнее полей GET карточки до перезагрузки. */
  const [promotionDecisionAdvisory, setPromotionDecisionAdvisory] = useState(
    /** @type {{ weightedScoreAdvisory: number | null, policyCompliant: boolean, policyAdvisories: string[] } | null} */ (null),
  )

  const policyPreview = useMemo(() => {
    if (promotionDecisionAdvisory) {
      return promotionDecisionAdvisory
    }
    if (!cycle) {
      return null
    }
    const adv = Array.isArray(cycle.policy_advisories) ? cycle.policy_advisories : []
    const wRaw = cycle.weighted_score_advisory
    let weightedNum = null
    if (wRaw != null && wRaw !== '') {
      const n = Number(wRaw)
      if (Number.isFinite(n)) {
        weightedNum = n
      }
    }
    const compliant = cycle.policy_compliant
    const hasFromDetailGet =
      compliant === true ||
      compliant === false ||
      adv.length > 0 ||
      weightedNum != null
    if (!hasFromDetailGet) {
      return null
    }
    return {
      weightedScoreAdvisory: weightedNum,
      policyCompliant: compliant === true,
      policyAdvisories: adv,
    }
  }, [promotionDecisionAdvisory, cycle])

  const reloadCycle = useCallback(async () => {
    const id = Number(reviewCycleId)
    if (!Number.isFinite(id)) {
      return
    }
    const data = await reviewCyclesApi.fetchReviewCycleById(id)
    setCycle(data)
    setRescheduleAt(toDatetimeLocalValue(data.scheduled_at))
    try {
      const e = await employeesApi.fetchEmployeeById(data.employee_id)
      setSubjectEmployee(e)
    } catch {
      setSubjectEmployee(null)
    }
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
      setPromotionDecisionAdvisory(null)
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
        try {
          const se = await employeesApi.fetchEmployeeById(data.employee_id)
          if (!cancelled) {
            setSubjectEmployee(se)
          }
        } catch {
          if (!cancelled) {
            setSubjectEmployee(null)
          }
        }
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
        !canActAsDepartmentDirector ||
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
  }, [canActAsDepartmentDirector, cycle, companyId])

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

  const deptAwaitingGeneralDirector = useMemo(() => {
    if (!linkedDecision) {
      return false
    }
    return String(linkedDecision.decision).toUpperCase() === 'APPROVED_BY_DEPARTMENT_DIRECTOR'
  }, [linkedDecision])

  const reviewTypeKey = cycle ? String(cycle.review_type).toUpperCase() : ''
  const statusKey = cycle ? String(cycle.status).toUpperCase() : ''
  const isFinalPromotion = reviewTypeKey === 'FINAL_PROMOTION'
  const isScheduled = statusKey === 'SCHEDULED'
  const showPromotionMeetingToolbar =
    canActAsDirector && isFinalPromotion && isScheduled && (linkedDecision == null || deptAwaitingGeneralDirector)
  const showDepartmentDirectorPromotionActions =
    canActAsDepartmentDirector && isFinalPromotion && isScheduled && linkedDecision == null
  const showGeneralDirectorPromotionActions =
    canActAsGeneralDirector && isFinalPromotion && isScheduled && deptAwaitingGeneralDirector

  const selectedTargetGrade = useMemo(() => {
    if (!targetGradeId) {
      return null
    }
    const gid = Math.trunc(Number(targetGradeId))
    if (!Number.isFinite(gid) || gid <= 0) {
      return null
    }
    return eligibleGrades.find((g) => Number(g.id) === gid) ?? null
  }, [eligibleGrades, targetGradeId])

  const openApproveDecisionModal = useCallback(() => {
    setActiveAction(null)
    setModalError(null)
    setRationale('')
    setTargetGradeId('')
    const cur = subjectEmployee?.current_salary_rub_month
    setModalSalaryRub(cur != null && cur !== '' ? String(Math.trunc(Number(cur))) : '')
    setDirectorModal('approve')
  }, [subjectEmployee])

  const openRejectDecisionModal = useCallback(() => {
    setActiveAction(null)
    setModalError(null)
    setRationale('')
    setImprovementPlanSummary('')
    setDirectorModal('reject')
  }, [])

  const closeDirectorModal = useCallback(() => {
    setDirectorModal(null)
    setModalError(null)
  }, [])

  const closeGeneralDirectorModal = useCallback(() => {
    setGeneralDirectorModal(null)
    setGdModalError(null)
  }, [])

  const openGdApproveModal = useCallback(() => {
    setDirectorModal(null)
    setActiveAction(null)
    setGdModalError(null)
    setGdRationale('')
    setGdImprovementPlanSummary('')
    setGeneralDirectorModal('approve')
  }, [])

  const openGdRejectModal = useCallback(() => {
    setDirectorModal(null)
    setActiveAction(null)
    setGdModalError(null)
    setGdRationale('')
    setGdImprovementPlanSummary('')
    setGeneralDirectorModal('reject')
  }, [])

  /**
   * @param {'APPROVED_BY_DEPARTMENT_DIRECTOR' | 'REJECTED'} decisionType
   */
  async function submitDirectorDecision(decisionType) {
    if (!cycle || employeeIdFromJwt == null) {
      setModalError('Не удалось определить сотрудника-директора в сессии.')
      return
    }
    const trimmedRationale = rationale.trim()
    if (trimmedRationale === '') {
      setModalError('Укажите обоснование решения.')
      return
    }
    if (decisionType === 'APPROVED_BY_DEPARTMENT_DIRECTOR' && targetGradeId === '') {
      setModalError('Выберите целевой грейд для одобрения повышения.')
      return
    }
    if (decisionType === 'REJECTED' && improvementPlanSummary.trim() === '') {
      setModalError('Укажите план доработки. После отклонения потребуется новый ИПР и новое собеседование.')
      return
    }
    /** @type {number | null} */
    let agreedSalaryRubMonth = null
    if (decisionType === 'APPROVED_BY_DEPARTMENT_DIRECTOR') {
      const raw = modalSalaryRub.trim().replace(/\s/g, '')
      if (raw === '') {
        setModalError('Укажите согласованный оклад (руб./мес.).')
        return
      }
      const n = Math.trunc(Number(raw))
      if (!Number.isFinite(n)) {
        setModalError('Оклад должен быть целым числом рублей в месяц.')
        return
      }
      if (n < 0) {
        setModalError('Оклад не может быть отрицательным.')
        return
      }
      agreedSalaryRubMonth = n
    }

    setActionBusy(true)
    setActionError(null)
    setActionInfo(null)
    setModalError(null)
    setPromotionDecisionAdvisory(null)
    try {
      const result = await reviewCyclesApi.makeFinalPromotionDecision(cycle.review_cycle_id, {
        director_employee_id: employeeIdFromJwt,
        decision: decisionType,
        target_grade_id: decisionType === 'APPROVED_BY_DEPARTMENT_DIRECTOR' ? Number(targetGradeId) : null,
        rationale: trimmedRationale,
        improvement_plan_summary: decisionType === 'REJECTED' ? improvementPlanSummary.trim() : null,
        agreed_salary_rub_month: agreedSalaryRubMonth,
      })
      await reloadCycle()
      const list = await promotionDecisionsApi.fetchPromotionDecisions({
        review_cycle_id: cycle.review_cycle_id,
      })
      setLinkedDecision(Array.isArray(list) && list.length > 0 ? list[0] : null)
      setActionInfo(`Кадровое решение зафиксировано (№${result.promotion_decision_id}).`)
      const advisories = Array.isArray(result.policy_advisories) ? [...result.policy_advisories] : []
      const wRaw = result.weighted_score_advisory
      let weightedNum = null
      if (wRaw != null && wRaw !== '') {
        const n = Number(wRaw)
        if (Number.isFinite(n)) {
          weightedNum = n
        }
      }
      setPromotionDecisionAdvisory({
        weightedScoreAdvisory: weightedNum,
        policyCompliant: result.policy_compliant === true,
        policyAdvisories: advisories,
      })
      closeDirectorModal()
    } catch (e) {
      if (e instanceof ApiError) setModalError(e.message)
      else if (e instanceof Error) setModalError(e.message)
      else setModalError('Не удалось зафиксировать кадровое решение')
    } finally {
      setActionBusy(false)
    }
  }

  /**
   * @param {'APPROVED_BY_GENERAL_DIRECTOR' | 'REJECTED'} decisionType
   */
  async function submitGeneralDirectorDecision(decisionType) {
    if (!cycle || employeeIdFromJwt == null) {
      setGdModalError('Не удалось определить сотрудника в сессии.')
      return
    }
    const trimmed = gdRationale.trim()
    if (trimmed === '') {
      setGdModalError('Укажите обоснование решения.')
      return
    }
    if (decisionType === 'REJECTED' && gdImprovementPlanSummary.trim() === '') {
      setGdModalError('Укажите план доработки. После отказа повышение не будет зафиксировано.')
      return
    }
    setActionBusy(true)
    setActionError(null)
    setActionInfo(null)
    setGdModalError(null)
    setPromotionDecisionAdvisory(null)
    try {
      const result = await reviewCyclesApi.confirmGeneralDirectorPromotionDecision(cycle.review_cycle_id, {
        general_director_employee_id: employeeIdFromJwt,
        decision: decisionType,
        rationale: trimmed,
        improvement_plan_summary: decisionType === 'REJECTED' ? gdImprovementPlanSummary.trim() : null,
      })
      await reloadCycle()
      const list = await promotionDecisionsApi.fetchPromotionDecisions({
        review_cycle_id: cycle.review_cycle_id,
      })
      setLinkedDecision(Array.isArray(list) && list.length > 0 ? list[0] : null)
      setActionInfo(`Решение генерального директора зафиксировано (№${result.promotion_decision_id}).`)
      const advisories = Array.isArray(result.policy_advisories) ? [...result.policy_advisories] : []
      const wRaw = result.weighted_score_advisory
      let weightedNum = null
      if (wRaw != null && wRaw !== '') {
        const n = Number(wRaw)
        if (Number.isFinite(n)) {
          weightedNum = n
        }
      }
      setPromotionDecisionAdvisory({
        weightedScoreAdvisory: weightedNum,
        policyCompliant: result.policy_compliant === true,
        policyAdvisories: advisories,
      })
      closeGeneralDirectorModal()
    } catch (e) {
      if (e instanceof ApiError) setGdModalError(e.message)
      else if (e instanceof Error) setGdModalError(e.message)
      else setGdModalError('Не удалось зафиксировать решение генерального директора')
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

      {error ? <InlineAlert variant="error">{error}</InlineAlert> : null}
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
                {canActAsDirector ? (
                  <span>
                    Текущий оклад сотрудника: <strong>{formatEmployeeCurrentSalaryDisplay(subjectEmployee)}</strong>
                  </span>
                ) : null}
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
                {(String(linkedDecision.decision).toUpperCase() === 'APPROVED_BY_DEPARTMENT_DIRECTOR' ||
                  String(linkedDecision.decision).toUpperCase() === 'APPROVED_BY_GENERAL_DIRECTOR') &&
                linkedDecision.agreed_salary_rub_month != null &&
                linkedDecision.agreed_salary_rub_month !== '' ? (
                  <p className="entity-zone__idp-muted" style={{ marginTop: '0.35rem' }}>
                    Согласованный оклад: <strong>{formatRubAmount(linkedDecision.agreed_salary_rub_month)}</strong>
                  </p>
                ) : null}
              </article>
            </section>
          ) : null}

          {policyPreview ? (
            <section className="entity-zone__idp-section" aria-labelledby="final-promotion-advisory-heading">
              <h2 id="final-promotion-advisory-heading" className="entity-zone__idp-section-title">
                Политика ревью (справочно)
              </h2>
              {formatWeightedAdvisoryScoreDisplay(policyPreview.weightedScoreAdvisory) != null ? (
                <p className="entity-zone__idp-muted" style={{ marginBottom: '0.5rem' }}>
                  Взвешенный показатель прохождения ИПР (не влияет на действительность решения):{' '}
                  <strong>{formatWeightedAdvisoryScoreDisplay(policyPreview.weightedScoreAdvisory)}</strong>
                </p>
              ) : null}
              {policyPreview.policyCompliant ? (
                <InlineAlert variant="success" className="ui-alert--mb-sm" role="status">
                  По доступным данным замечаний политики нет.
                </InlineAlert>
              ) : (
                <InlineAlert variant="warning" className="ui-alert--mb-sm" role="status">
                  Есть рекомендательные замечания по политике (решение ими не блокируется).
                </InlineAlert>
              )}
              {policyPreview.policyAdvisories.length > 0 ? (
                <ul className="entity-zone__idp-muted" style={{ marginTop: '0.35rem' }}>
                  {policyPreview.policyAdvisories.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}

          {(showPromotionMeetingToolbar || showGeneralDirectorPromotionActions) ? (
            <>
              {actionError ? (
                <InlineAlert variant="error" className="ui-alert--mb-sm">
                  {actionError}
                </InlineAlert>
              ) : null}
              {actionInfo ? (
                <p className="entity-zone__idp-muted" style={{ marginBottom: '0.75rem' }}>
                  {actionInfo}
                </p>
              ) : null}

              {showPromotionMeetingToolbar ? (
                <section className="entity-zone__idp-section">
                  <h2 className="entity-zone__idp-section-title">Управление собеседованием</h2>
                  <div className="entity-zone__filters">
                    {showDepartmentDirectorPromotionActions ? (
                      <p className="entity-zone__idp-muted" style={{ gridColumn: '1 / -1' }}>
                        Изучите связанные ИПР, проведите встречу, затем согласуйте грейд и оклад. Они применятся к сотруднику только
                        после подписи генерального директора.
                      </p>
                    ) : deptAwaitingGeneralDirector ? (
                      <p className="entity-zone__idp-muted" style={{ gridColumn: '1 / -1' }}>
                        Решение директора отдела зафиксировано и ожидает подписи генерального директора. Перенос даты всё ещё возможен.
                      </p>
                    ) : (
                      <p className="entity-zone__idp-muted" style={{ gridColumn: '1 / -1' }}>
                        При необходимости перенесите дату собеседования.
                      </p>
                    )}
                    <div className="entity-zone__actions entity-zone__actions--idp-tl" style={{ gridColumn: '1 / -1', marginBottom: '0.5rem' }}>
                      <button type="button" className="entity-zone__button" disabled={actionBusy} onClick={() => setActiveAction('reschedule')}>
                        Перенести собеседование
                      </button>
                      {showDepartmentDirectorPromotionActions ? (
                        <>
                          <button type="button" className="entity-zone__button" disabled={actionBusy} onClick={openRejectDecisionModal}>
                            Отклонить повышение
                          </button>
                          <button
                            type="button"
                            className="entity-zone__button entity-zone__button--primary"
                            disabled={actionBusy || gradeOptionsLoading}
                            onClick={openApproveDecisionModal}
                          >
                            Согласовать грейд и оклад
                          </button>
                        </>
                      ) : null}
                    </div>

                    {activeAction === 'reschedule' ? (
                      <div className="entity-zone__filters entity-zone__filters--reschedule-row">
                        <label className="entity-zone__field entity-zone__field--reschedule-datetime">
                          <span className="entity-zone__field-label">Новая дата и время</span>
                          <input className="entity-zone__input" type="datetime-local" value={rescheduleAt} onChange={(ev) => setRescheduleAt(ev.target.value)} disabled={actionBusy} />
                        </label>
                        <label className="entity-zone__field entity-zone__field--grow">
                          <span className="entity-zone__field-label">Комментарий</span>
                          <input className="entity-zone__input" value={rescheduleComment} onChange={(ev) => setRescheduleComment(ev.target.value)} disabled={actionBusy} />
                        </label>
                        <label className="entity-zone__field entity-zone__field--reschedule-submit">
                          <span className="entity-zone__field-label" aria-hidden="true">
                            {'\u00a0'}
                          </span>
                          <div className="entity-zone__actions entity-zone__actions--reschedule-submit">
                            <button type="button" className="entity-zone__button entity-zone__button--primary" disabled={actionBusy} onClick={() => void handleReschedule()}>
                              Подтвердить
                            </button>
                          </div>
                        </label>
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : null}

              {showGeneralDirectorPromotionActions ? (
                <section className="entity-zone__idp-section">
                  <h2 className="entity-zone__idp-section-title">Решение генерального директора</h2>
                  <p className="entity-zone__idp-muted" style={{ marginBottom: '0.75rem' }}>
                    Директор отдела согласовал целевой грейд и оклад. Подтвердите итоговое повышение или отклоните решение.
                  </p>
                  <div className="entity-zone__actions entity-zone__actions--idp-tl">
                    <button type="button" className="entity-zone__button" disabled={actionBusy} onClick={openGdRejectModal}>
                      Отклонить
                    </button>
                    <button type="button" className="entity-zone__button entity-zone__button--primary" disabled={actionBusy} onClick={openGdApproveModal}>
                      Подтвердить повышение
                    </button>
                  </div>
                </section>
              ) : null}
            </>
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

      {directorModal && cycle ? (
        <div
          className="entity-zone__modal-backdrop"
          role="presentation"
          onClick={() => {
            if (!actionBusy) {
              closeDirectorModal()
            }
          }}
        >
          <section
            className="entity-zone__modal entity-zone__modal--wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="director-decision-modal-title"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="entity-zone__modal-head">
              <h3 id="director-decision-modal-title" className="entity-zone__modal-title">
                {directorModal === 'approve' ? 'Решение директора отдела' : 'Отклонение повышения'}
              </h3>
              <button type="button" className="entity-zone__icon-button" onClick={closeDirectorModal} aria-label="Закрыть" disabled={actionBusy}>
                {'\u00D7'}
              </button>
            </div>

            {modalError ? <InlineAlert variant="error" className="ui-alert--mb-sm">{modalError}</InlineAlert> : null}

            {directorModal === 'approve' ? (
              <div className="entity-zone__filters">
                <p className="entity-zone__idp-muted" style={{ gridColumn: '1 / -1' }}>
                  Для сотрудника грейд и оклад изменятся только после подписи генерального директора.
                </p>
                <p className="entity-zone__idp-muted" style={{ gridColumn: '1 / -1' }}>
                  Текущий оклад сотрудника: <strong>{formatEmployeeCurrentSalaryDisplay(subjectEmployee)}</strong>
                </p>
                <label className="entity-zone__field entity-zone__field--grow">
                  <span className="entity-zone__field-label">Целевой грейд</span>
                  <SelectDropdown
                    value={targetGradeId}
                    onChange={setTargetGradeId}
                    placeholder="Выберите грейд"
                    disabled={actionBusy || gradeOptionsLoading || eligibleGrades.length === 0}
                    options={[
                      { value: '', label: 'Выберите грейд' },
                      ...eligibleGrades.map((g) => ({
                        value: String(g.id),
                        label: g.name,
                        description: `Уровень ${g.level_order}`,
                      })),
                    ]}
                  />
                  {gradeOptionsMessage ? (
                    <InlineAlert variant="warning" role="status" className="ui-alert--field-hint">
                      {gradeOptionsMessage}
                    </InlineAlert>
                  ) : null}
                </label>
                <p className="entity-zone__idp-muted" style={{ gridColumn: '1 / -1', marginTop: 0 }}>
                  Зарплатная вилка по целевому грейду: <strong>{salaryForkCaption(selectedTargetGrade)}</strong>
                </p>
                <label className="entity-zone__field entity-zone__field--grow" style={{ gridColumn: '1 / -1' }}>
                  <span className="entity-zone__field-label">Согласованный оклад, ₽/мес.</span>
                  <input
                    className="entity-zone__input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={modalSalaryRub}
                    onChange={(ev) => setModalSalaryRub(ev.target.value)}
                    disabled={actionBusy}
                    placeholder="Например: 180000"
                  />
                </label>
                <label className="entity-zone__field entity-zone__field--grow" style={{ gridColumn: '1 / -1' }}>
                  <span className="entity-zone__field-label">Обоснование</span>
                  <textarea className="entity-zone__input" rows={3} value={rationale} onChange={(ev) => setRationale(ev.target.value)} disabled={actionBusy} />
                </label>
                <div className="entity-zone__actions" style={{ gridColumn: '1 / -1' }}>
                  <button type="button" className="entity-zone__button" disabled={actionBusy} onClick={closeDirectorModal}>
                    Отмена
                  </button>
                  <button
                    type="button"
                    className="entity-zone__button entity-zone__button--primary"
                    disabled={actionBusy}
                    onClick={() => void submitDirectorDecision('APPROVED_BY_DEPARTMENT_DIRECTOR')}
                  >
                    Зафиксировать согласование
                  </button>
                </div>
              </div>
            ) : (
              <div className="entity-zone__filters">
                <label className="entity-zone__field entity-zone__field--grow" style={{ gridColumn: '1 / -1' }}>
                  <span className="entity-zone__field-label">План доработки</span>
                  <textarea
                    className="entity-zone__input"
                    rows={3}
                    value={improvementPlanSummary}
                    onChange={(ev) => setImprovementPlanSummary(ev.target.value)}
                    disabled={actionBusy}
                  />
                </label>
                <label className="entity-zone__field entity-zone__field--grow" style={{ gridColumn: '1 / -1' }}>
                  <span className="entity-zone__field-label">Обоснование отклонения</span>
                  <textarea className="entity-zone__input" rows={3} value={rationale} onChange={(ev) => setRationale(ev.target.value)} disabled={actionBusy} />
                </label>
                <p className="entity-zone__idp-muted" style={{ gridColumn: '1 / -1' }}>
                  После отклонения создайте новый ИПР, завершите его и назначьте новое собеседование.
                </p>
                <div className="entity-zone__actions" style={{ gridColumn: '1 / -1' }}>
                  <button type="button" className="entity-zone__button" disabled={actionBusy} onClick={closeDirectorModal}>
                    Отмена
                  </button>
                  <button
                    type="button"
                    className="entity-zone__button entity-zone__button--primary"
                    disabled={actionBusy}
                    onClick={() => void submitDirectorDecision('REJECTED')}
                  >
                    Зафиксировать отклонение
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {generalDirectorModal && cycle && linkedDecision ? (
        <div
          className="entity-zone__modal-backdrop"
          role="presentation"
          onClick={() => {
            if (!actionBusy) {
              closeGeneralDirectorModal()
            }
          }}
        >
          <section
            className="entity-zone__modal entity-zone__modal--wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gd-decision-modal-title"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="entity-zone__modal-head">
              <h3 id="gd-decision-modal-title" className="entity-zone__modal-title">
                {generalDirectorModal === 'approve' ? 'Подтверждение повышения' : 'Отказ от повышения'}
              </h3>
              <button type="button" className="entity-zone__icon-button" onClick={closeGeneralDirectorModal} aria-label="Закрыть" disabled={actionBusy}>
                {'\u00D7'}
              </button>
            </div>

            {gdModalError ? <InlineAlert variant="error" className="ui-alert--mb-sm">{gdModalError}</InlineAlert> : null}

            {generalDirectorModal === 'approve' ? (
              <div className="entity-zone__filters">
                <p className="entity-zone__idp-muted" style={{ gridColumn: '1 / -1' }}>
                  Предложение директора отдела: целевой грейд <strong>{linkedDecision.to_grade_code ?? '—'}</strong>
                  {linkedDecision.agreed_salary_rub_month != null && linkedDecision.agreed_salary_rub_month !== '' ? (
                    <>
                      {', оклад '}
                      <strong>{formatRubAmount(linkedDecision.agreed_salary_rub_month)}</strong>
                    </>
                  ) : null}
                  . После подтверждения они будут применены к сотруднику.
                </p>
                <p className="entity-zone__idp-muted" style={{ gridColumn: '1 / -1' }}>
                  Обоснование директора отдела: <em style={{ whiteSpace: 'pre-wrap' }}>{linkedDecision.rationale || '—'}</em>
                </p>
                <label className="entity-zone__field entity-zone__field--grow" style={{ gridColumn: '1 / -1' }}>
                  <span className="entity-zone__field-label">Обоснование генерального директора</span>
                  <textarea className="entity-zone__input" rows={3} value={gdRationale} onChange={(ev) => setGdRationale(ev.target.value)} disabled={actionBusy} />
                </label>
                <div className="entity-zone__actions" style={{ gridColumn: '1 / -1' }}>
                  <button type="button" className="entity-zone__button" disabled={actionBusy} onClick={closeGeneralDirectorModal}>
                    Отмена
                  </button>
                  <button
                    type="button"
                    className="entity-zone__button entity-zone__button--primary"
                    disabled={actionBusy}
                    onClick={() => void submitGeneralDirectorDecision('APPROVED_BY_GENERAL_DIRECTOR')}
                  >
                    Подтвердить и применить
                  </button>
                </div>
              </div>
            ) : (
              <div className="entity-zone__filters">
                <label className="entity-zone__field entity-zone__field--grow" style={{ gridColumn: '1 / -1' }}>
                  <span className="entity-zone__field-label">План доработки</span>
                  <textarea
                    className="entity-zone__input"
                    rows={3}
                    value={gdImprovementPlanSummary}
                    onChange={(ev) => setGdImprovementPlanSummary(ev.target.value)}
                    disabled={actionBusy}
                  />
                </label>
                <label className="entity-zone__field entity-zone__field--grow" style={{ gridColumn: '1 / -1' }}>
                  <span className="entity-zone__field-label">Обоснование отказа</span>
                  <textarea className="entity-zone__input" rows={3} value={gdRationale} onChange={(ev) => setGdRationale(ev.target.value)} disabled={actionBusy} />
                </label>
                <div className="entity-zone__actions" style={{ gridColumn: '1 / -1' }}>
                  <button type="button" className="entity-zone__button" disabled={actionBusy} onClick={closeGeneralDirectorModal}>
                    Отмена
                  </button>
                  <button
                    type="button"
                    className="entity-zone__button entity-zone__button--primary"
                    disabled={actionBusy}
                    onClick={() => void submitGeneralDirectorDecision('REJECTED')}
                  >
                    Зафиксировать отказ
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </article>
  )
}
