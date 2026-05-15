import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, employeesApi, reviewCyclesApi } from '../api/index.js'
import { resolveCompanyId } from '../config/companyContext.js'
import './pages.css'
import './EntityZone.css'

const REVIEW_TYPE_LABEL = {
  INTERIM_PROGRESS: 'Промежуточное ревью ИПР',
  FINAL_PROMOTION: 'Итоговое ревью на повышение',
}

const STATUS_LABEL = {
  SCHEDULED: 'Запланирован',
  COMPLETED: 'Завершён',
  CANCELLED: 'Отменён',
}

const RECOMMENDATION_LABEL = {
  CONTINUE: 'Продолжить без изменений',
  ADJUST: 'Скорректировать план',
}

/**
 * @param {string | null | undefined} iso
 */
function formatDateTimeNoSeconds(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
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
  const [cycle, setCycle] = useState(/** @type {import('../api/reviewCycles.js').ReviewCycleView | null} */ (null))
  const [assessments, setAssessments] = useState(/** @type {import('../api/reviewCycles.js').InterimReviewAssessmentView[] | null} */ (null))
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!reviewCycleId) return
      const id = Number(reviewCycleId)
      if (!Number.isFinite(id)) {
        setError('Некорректный идентификатор цикла ревью')
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const [data, employeesPage] = await Promise.all([
          reviewCyclesApi.fetchReviewCycleById(id),
          companyId == null
            ? Promise.resolve({ content: [] })
            : employeesApi.fetchEmployeesRegistry({ company_id: companyId }, { size: 300, sort: 'fullName,asc' }),
        ])
        if (cancelled) return
        setCycle(data)
        setEmployees(Array.isArray(employeesPage?.content) ? employeesPage.content : [])
      } catch (e) {
        if (cancelled) return
        if (e instanceof ApiError) setError(e.message)
        else if (e instanceof Error) setError(e.message)
        else setError('Не удалось загрузить цикл ревью')
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
      if (!cycle || String(cycle.review_type).toUpperCase() !== 'INTERIM_PROGRESS') {
        setAssessments(null)
        return
      }
      try {
        const list = await reviewCyclesApi.fetchInterimReviewAssessments(cycle.review_cycle_id)
        if (!cancelled) setAssessments(Array.isArray(list) ? list : [])
      } catch {
        if (!cancelled) setAssessments([])
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [cycle])

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

  return (
    <article className="page">
      <ol className="page__breadcrumbs">
        <li><Link to="/">Главная</Link></li>
        <li><Link to="/reviews">Ревью</Link></li>
        <li>Цикл #{reviewCycleId}</li>
      </ol>
      <h1 className="page__title">Цикл ревью</h1>

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
                {REVIEW_TYPE_LABEL[/** @type {keyof typeof REVIEW_TYPE_LABEL} */ (String(cycle.review_type).toUpperCase())] ?? cycle.review_type}
              </p>
              <div
                className="entity-zone__idp-hero-meta"
                style={{ marginTop: '0.5rem', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}
              >
                <span>Плановая дата: {formatDateTimeNoSeconds(cycle.scheduled_at)}</span>
                <span>Начато: {formatDateTimeNoSeconds(cycle.started_at)}</span>
                <span>Завершено: {formatDateTimeNoSeconds(cycle.completed_at)}</span>
              </div>
            </div>
            <span className={reviewStatusChipClass(cycle.status)}>
              {STATUS_LABEL[/** @type {keyof typeof STATUS_LABEL} */ (String(cycle.status).toUpperCase())] ?? cycle.status}
            </span>
          </header>

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

          {String(cycle.review_type).toUpperCase() === 'INTERIM_PROGRESS' && assessments != null ? (
            <section className="entity-zone__idp-section">
              <h2 className="entity-zone__idp-section-title">Оценки промежуточного ревью</h2>
              <div className="entity-zone__idp-cards">
                {assessments.length === 0 ? (
                  <p className="entity-zone__idp-muted">Оценки ещё не зафиксированы.</p>
                ) : (
                  assessments.map((a) => {
                    const recKey = String(a.recommendation ?? '').toUpperCase()
                    const recLabel =
                      RECOMMENDATION_LABEL[/** @type {keyof typeof RECOMMENDATION_LABEL} */ (recKey)] ?? a.recommendation
                    return (
                      <article key={a.assessment_id} className="entity-zone__idp-card">
                        <div className="entity-zone__idp-card-head">
                          <h3 className="entity-zone__idp-card-title">{a.reviewer_employee_full_name}</h3>
                          <div className="entity-zone__idp-chip-row">
                            <span className="entity-zone__idp-chip">{a.reviewer_role}</span>
                            {a.score != null ? <span className="entity-zone__idp-chip">Оценка: {a.score}</span> : null}
                            <span className="entity-zone__idp-chip entity-zone__idp-chip--status-progress">{recLabel}</span>
                          </div>
                        </div>
                        {a.strengths ? <p className="entity-zone__idp-muted" style={{ marginTop: '0.35rem' }}><strong>Сильные стороны:</strong> {a.strengths}</p> : null}
                        {a.gaps ? <p className="entity-zone__idp-muted" style={{ marginTop: '0.35rem' }}><strong>Зоны роста:</strong> {a.gaps}</p> : null}
                        {a.comment ? <p className="entity-zone__idp-muted" style={{ marginTop: '0.35rem', whiteSpace: 'pre-wrap' }}>{a.comment}</p> : null}
                      </article>
                    )
                  })
                )}
              </div>
            </section>
          ) : null}
        </section>
      ) : null}
    </article>
  )
}
