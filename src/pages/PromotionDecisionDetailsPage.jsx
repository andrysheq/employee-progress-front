import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, promotionDecisionsApi } from '../api/index.js'
import { useAuth } from '../auth/useAuth.js'
import { hasDirectorRole } from '../auth/roleChecks.js'
import './pages.css'
import './EntityZone.css'

const DECISION_LABEL = {
  APPROVED: 'Одобрено',
  REJECTED: 'Отклонено',
}

/**
 * @param {string | null | undefined} iso
 */
function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleString('ru-RU')
}

/**
 * @param {string} decision
 */
function decisionChipClass(decision) {
  const d = String(decision ?? '').toUpperCase()
  if (d === 'APPROVED') return 'entity-zone__idp-chip entity-zone__idp-chip--status-done'
  if (d === 'REJECTED') return 'entity-zone__idp-chip entity-zone__idp-chip--status-planned'
  return 'entity-zone__idp-chip'
}

export function PromotionDecisionDetailsPage() {
  const { decisionId } = useParams()
  const { roles } = useAuth()
  const canRead = hasDirectorRole(roles)

  const [item, setItem] = useState(/** @type {import('../api/promotionDecisions.js').PromotionDecisionView | null} */ (null))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!decisionId) return
      if (!canRead) {
        setError('Недостаточно прав для просмотра кадровых решений')
        setLoading(false)
        return
      }
      const id = Number(decisionId)
      if (!Number.isFinite(id)) {
        setError('Некорректный идентификатор решения')
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const data = await promotionDecisionsApi.fetchPromotionDecisionById(id)
        if (!cancelled) setItem(data)
      } catch (e) {
        if (cancelled) return
        if (e instanceof ApiError) setError(e.message)
        else if (e instanceof Error) setError(e.message)
        else setError('Не удалось загрузить решение')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [decisionId, canRead])

  const decisionKey = item ? String(item.decision).toUpperCase() : ''
  const decisionLabel = DECISION_LABEL[/** @type {keyof typeof DECISION_LABEL} */ (decisionKey)] ?? item?.decision

  return (
    <article className="page">
      <ol className="page__breadcrumbs">
        <li><Link to="/">Главная</Link></li>
        <li><Link to="/promotion-decisions">Решения</Link></li>
        <li>Решение #{decisionId}</li>
      </ol>
      <h1 className="page__title">Кадровое решение</h1>

      {error ? <div className="entity-zone__error" role="alert">{error}</div> : null}
      {loading ? <p className="entity-zone__loading">Загрузка…</p> : null}

      {!loading && item ? (
        <section className="entity-zone__summary">
          <header className="entity-zone__idp-hero">
            <div className="entity-zone__idp-hero-main">
              <p className="entity-zone__idp-hero-name">{item.employee_name}</p>
              <div className="entity-zone__idp-chip-row" style={{ marginTop: '0.35rem' }}>
                <span className="entity-zone__idp-chip">
                  {item.from_grade_code} → {item.to_grade_code ?? '—'}
                </span>
              </div>
              <p className="entity-zone__idp-hero-meta" style={{ marginTop: '0.5rem' }}>
                <span>Принято: {formatDateTime(item.decided_at)}</span>
              </p>
            </div>
            <span className={decisionChipClass(item.decision)}>{decisionLabel}</span>
          </header>

          <section className="entity-zone__idp-section">
            <h2 className="entity-zone__idp-section-title">Обоснование</h2>
            <p className="entity-zone__idp-muted" style={{ whiteSpace: 'pre-wrap' }}>{item.rationale || '—'}</p>
          </section>

          {item.improvement_plan_summary ? (
            <section className="entity-zone__idp-section">
              <h2 className="entity-zone__idp-section-title">План улучшений</h2>
              <p className="entity-zone__idp-muted" style={{ whiteSpace: 'pre-wrap' }}>{item.improvement_plan_summary}</p>
            </section>
          ) : null}

          <section className="entity-zone__idp-section">
            <h2 className="entity-zone__idp-section-title">Контекст</h2>
            <div className="entity-zone__idp-cards">
              <article className="entity-zone__idp-card">
                <p className="entity-zone__idp-muted">
                  Принял: <strong>{item.decided_by_name}</strong>
                </p>
                <p className="entity-zone__idp-muted" style={{ marginTop: '0.35rem' }}>
                  Сотрудник:{' '}
                  <Link className="entity-zone__idp-link" to={`/employees/${item.employee_id}`}>
                    {item.employee_name}
                  </Link>
                </p>
                <p className="entity-zone__idp-muted" style={{ marginTop: '0.35rem' }}>
                  Цикл ревью:{' '}
                  <Link className="entity-zone__idp-link" to={`/reviews/${item.review_cycle_id}`}>
                    #{item.review_cycle_id}
                  </Link>
                </p>
              </article>
            </div>
          </section>
        </section>
      ) : null}
    </article>
  )
}
