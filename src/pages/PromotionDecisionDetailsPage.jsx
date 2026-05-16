import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, promotionDecisionsApi } from '../api/index.js'
import { useAuth } from '../auth/useAuth.js'
import { hasDirectorRole } from '../auth/roleChecks.js'
import { InlineAlert } from '../components/ui/Alert.jsx'
import { useDisplayWhileRefreshing } from '../hooks/useDisplayWhileRefreshing.js'
import { cn } from '../lib/utils.js'
import { formatDateTimeRuNoSeconds } from '../utils/dateFormat.js'
import './pages.css'
import './EntityZone.css'

const DECISION_LABEL = {
  APPROVED: 'Одобрено',
  REJECTED: 'Отклонено',
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

  const { displayData: displayItem, showBlockingSpinner, isRefreshing } = useDisplayWhileRefreshing(item, loading)

  const decisionKey = displayItem ? String(displayItem.decision).toUpperCase() : ''
  const decisionLabel = DECISION_LABEL[/** @type {keyof typeof DECISION_LABEL} */ (decisionKey)] ?? displayItem?.decision

  return (
    <article className="page">
      <ol className="page__breadcrumbs">
        <li><Link to="/">Главная</Link></li>
        <li><Link to="/promotion-decisions">Решения</Link></li>
        <li>Решение #{decisionId}</li>
      </ol>
      <h1 className="page__title">Кадровое решение</h1>

      {error ? <InlineAlert variant="error">{error}</InlineAlert> : null}
      {showBlockingSpinner ? <p className="entity-zone__loading">Загрузка…</p> : null}

      {displayItem ? (
        <div
          className={cn(
            'entity-zone__results-surface',
            isRefreshing && 'entity-zone__results-surface--refreshing',
          )}
          aria-busy={isRefreshing || undefined}
        >
        <section className="entity-zone__summary">
          <header className="entity-zone__idp-hero">
            <div className="entity-zone__idp-hero-main">
              <p className="entity-zone__idp-hero-name">{displayItem.employee_name}</p>
              <div className="entity-zone__idp-chip-row" style={{ marginTop: '0.35rem' }}>
                <span className="entity-zone__idp-chip">
                  {displayItem.from_grade_code} → {displayItem.to_grade_code ?? '—'}
                </span>
              </div>
              <p className="entity-zone__idp-hero-meta" style={{ marginTop: '0.5rem', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                <span>Принято: {formatDateTimeRuNoSeconds(displayItem.decided_at)}</span>
              </p>
            </div>
            <span className={decisionChipClass(displayItem.decision)}>{decisionLabel}</span>
          </header>

          {String(displayItem.decision).toUpperCase() === 'APPROVED' &&
          displayItem.agreed_salary_rub_month != null &&
          displayItem.agreed_salary_rub_month !== '' ? (
            <section className="entity-zone__idp-section">
              <h2 className="entity-zone__idp-section-title">Согласованный оклад</h2>
              <p className="entity-zone__idp-muted">
                <strong>{Number(displayItem.agreed_salary_rub_month).toLocaleString('ru-RU')} ₽</strong> в месяц
              </p>
            </section>
          ) : null}

          <section className="entity-zone__idp-section">
            <h2 className="entity-zone__idp-section-title">Обоснование</h2>
            <p className="entity-zone__idp-muted" style={{ whiteSpace: 'pre-wrap' }}>{displayItem.rationale || '—'}</p>
          </section>

          {displayItem.improvement_plan_summary ? (
            <section className="entity-zone__idp-section">
              <h2 className="entity-zone__idp-section-title">План улучшений</h2>
              <p className="entity-zone__idp-muted" style={{ whiteSpace: 'pre-wrap' }}>{displayItem.improvement_plan_summary}</p>
            </section>
          ) : null}

          <section className="entity-zone__idp-section">
            <h2 className="entity-zone__idp-section-title">Контекст</h2>
            <div className="entity-zone__idp-cards">
              <article className="entity-zone__idp-card entity-zone__context-panel">
                <p className="entity-zone__idp-muted">
                  Принял: <strong className="entity-zone__context-strong">{displayItem.decided_by_name}</strong>
                </p>
                <p className="entity-zone__idp-muted">
                  Сотрудник:{' '}
                  <Link className="entity-zone__inline-link" to={`/employees/${displayItem.employee_id}`}>
                    {displayItem.employee_name}
                  </Link>
                </p>
                <p className="entity-zone__idp-muted">
                  Собеседование:{' '}
                  <Link className="entity-zone__inline-link" to={`/reviews/${displayItem.review_cycle_id}`}>
                    #{displayItem.review_cycle_id}
                  </Link>
                </p>
              </article>
            </div>
          </section>
        </section>
        </div>
      ) : null}
    </article>
  )
}
