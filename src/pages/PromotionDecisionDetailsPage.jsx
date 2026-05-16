import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, promotionDecisionsApi, reviewCyclesApi } from '../api/index.js'
import { useAuth } from '../auth/useAuth.js'
import { hasDirectorRole, hasGeneralDirectorRole } from '../auth/roleChecks.js'
import { InlineAlert } from '../components/ui/Alert.jsx'
import { useDisplayWhileRefreshing } from '../hooks/useDisplayWhileRefreshing.js'
import { cn } from '../lib/utils.js'
import { formatDateTimeRuNoSeconds } from '../utils/dateFormat.js'
import './pages.css'
import './EntityZone.css'

const DECISION_LABEL = {
  APPROVED_BY_DEPARTMENT_DIRECTOR: 'Одобрено директором отдела',
  APPROVED_BY_GENERAL_DIRECTOR: 'Одобрено генеральным директором',
  REJECTED: 'Отклонено',
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
 * @param {string} decision
 */
function decisionChipClass(decision) {
  const d = String(decision ?? '').toUpperCase()
  if (d === 'APPROVED_BY_GENERAL_DIRECTOR') return 'entity-zone__idp-chip entity-zone__idp-chip--status-done'
  if (d === 'APPROVED_BY_DEPARTMENT_DIRECTOR') return 'entity-zone__idp-chip entity-zone__idp-chip--status-planned'
  if (d === 'REJECTED') return 'entity-zone__idp-chip entity-zone__idp-chip--status-planned'
  return 'entity-zone__idp-chip'
}

export function PromotionDecisionDetailsPage() {
  const { decisionId } = useParams()
  const { roles, employeeIdFromJwt } = useAuth()
  const canRead = hasDirectorRole(roles)

  const [item, setItem] = useState(/** @type {import('../api/promotionDecisions.js').PromotionDecisionView | null} */ (null))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  const [gdModal, setGdModal] = useState(/** @type {'approve' | 'reject' | null} */ (null))
  const [gdRationale, setGdRationale] = useState('')
  const [gdImprovementPlanSummary, setGdImprovementPlanSummary] = useState('')
  const [gdModalError, setGdModalError] = useState(/** @type {string | null} */ (null))
  const [actionBusy, setActionBusy] = useState(false)
  const [actionInfo, setActionInfo] = useState(/** @type {string | null} */ (null))

  const reloadDecision = useCallback(async () => {
    if (!decisionId) return
    const id = Number(decisionId)
    if (!Number.isFinite(id)) return
    const data = await promotionDecisionsApi.fetchPromotionDecisionById(id)
    setItem(data)
  }, [decisionId])

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

  const showGeneralDirectorPanel = useMemo(() => {
    if (!displayItem) return false
    if (!hasGeneralDirectorRole(roles)) return false
    return String(displayItem.decision).toUpperCase() === 'APPROVED_BY_DEPARTMENT_DIRECTOR'
  }, [displayItem, roles])

  const closeGdModal = useCallback(() => {
    setGdModal(null)
    setGdModalError(null)
  }, [])

  const openGdApproveModal = useCallback(() => {
    setGdModalError(null)
    setGdRationale('')
    setGdImprovementPlanSummary('')
    setGdModal('approve')
  }, [])

  const openGdRejectModal = useCallback(() => {
    setGdModalError(null)
    setGdRationale('')
    setGdImprovementPlanSummary('')
    setGdModal('reject')
  }, [])

  /**
   * @param {'APPROVED_BY_GENERAL_DIRECTOR' | 'REJECTED'} decisionType
   */
  async function submitGeneralDirectorDecision(decisionType) {
    if (!item || employeeIdFromJwt == null) {
      setGdModalError('Не удалось определить сотрудника в сессии.')
      return
    }
    const reviewCycleId = typeof item.review_cycle_id === 'number' ? item.review_cycle_id : null
    if (reviewCycleId == null || reviewCycleId <= 0) {
      setGdModalError('Не найден идентификатор собеседования для подтверждения.')
      return
    }
    const trimmed = gdRationale.trim()
    if (trimmed === '') {
      setGdModalError('Укажите обоснование решения.')
      return
    }
    if (decisionType === 'REJECTED' && gdImprovementPlanSummary.trim() === '') {
      setGdModalError('Укажите план доработки при отказе.')
      return
    }
    setActionBusy(true)
    setGdModalError(null)
    setActionInfo(null)
    try {
      await reviewCyclesApi.confirmGeneralDirectorPromotionDecision(reviewCycleId, {
        general_director_employee_id: employeeIdFromJwt,
        decision: decisionType,
        rationale: trimmed,
        improvement_plan_summary: decisionType === 'REJECTED' ? gdImprovementPlanSummary.trim() : null,
      })
      await reloadDecision()
      setActionInfo(
        decisionType === 'APPROVED_BY_GENERAL_DIRECTOR'
          ? 'Повышение подтверждено: грейд и оклад применены к сотруднику.'
          : 'Решение отклонено.',
      )
      closeGdModal()
    } catch (e) {
      if (e instanceof ApiError) setGdModalError(e.message)
      else if (e instanceof Error) setGdModalError(e.message)
      else setGdModalError('Не удалось зафиксировать решение генерального директора')
    } finally {
      setActionBusy(false)
    }
  }

  return (
    <article className="page">
      <ol className="page__breadcrumbs">
        <li><Link to="/">Главная</Link></li>
        <li><Link to="/promotion-decisions">Решения</Link></li>
        <li>Решение #{decisionId}</li>
      </ol>
      <h1 className="page__title">Кадровое решение</h1>

      {error ? <InlineAlert variant="error">{error}</InlineAlert> : null}
      {actionInfo ? (
        <InlineAlert variant="success" className="ui-alert--mb-sm" role="status">
          {actionInfo}
        </InlineAlert>
      ) : null}
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
                <span>Решение директора отдела: {formatDateTimeRuNoSeconds(displayItem.decided_at)}</span>
                {displayItem.ceo_decided_at ? (
                  <span>Решение генерального директора: {formatDateTimeRuNoSeconds(displayItem.ceo_decided_at)}</span>
                ) : null}
              </p>
            </div>
            <span className={decisionChipClass(displayItem.decision)}>{decisionLabel}</span>
          </header>

          {(String(displayItem.decision).toUpperCase() === 'APPROVED_BY_DEPARTMENT_DIRECTOR' ||
            String(displayItem.decision).toUpperCase() === 'APPROVED_BY_GENERAL_DIRECTOR') &&
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
            <h2 className="entity-zone__idp-section-title">Обоснование директора отдела</h2>
            <p className="entity-zone__idp-muted" style={{ whiteSpace: 'pre-wrap' }}>{displayItem.rationale || '—'}</p>
          </section>

          {displayItem.ceo_rationale ? (
            <section className="entity-zone__idp-section">
              <h2 className="entity-zone__idp-section-title">Решение генерального директора</h2>
              {displayItem.ceo_decided_by_name ? (
                <p className="entity-zone__idp-muted" style={{ marginBottom: '0.35rem' }}>
                  {displayItem.ceo_decided_by_name}
                </p>
              ) : null}
              <p className="entity-zone__idp-muted" style={{ whiteSpace: 'pre-wrap' }}>{displayItem.ceo_rationale}</p>
            </section>
          ) : null}

          {displayItem.improvement_plan_summary ? (
            <section className="entity-zone__idp-section">
              <h2 className="entity-zone__idp-section-title">План улучшений</h2>
              <p className="entity-zone__idp-muted" style={{ whiteSpace: 'pre-wrap' }}>{displayItem.improvement_plan_summary}</p>
            </section>
          ) : null}

          {showGeneralDirectorPanel ? (
            <section className="entity-zone__idp-section">
              <h2 className="entity-zone__idp-section-title">Ваше решение как генерального директора</h2>
              <p className="entity-zone__idp-muted" style={{ marginBottom: '0.75rem' }}>
                Директор отдела согласовал грейд и оклад. Подтвердите итоговое повышение (применятся к сотруднику) или отклоните решение.
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

      {gdModal && displayItem ? (
        <div
          className="entity-zone__modal-backdrop"
          role="presentation"
          onClick={() => {
            if (!actionBusy) {
              closeGdModal()
            }
          }}
        >
          <section
            className="entity-zone__modal entity-zone__modal--wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="promo-decision-gd-modal-title"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="entity-zone__modal-head">
              <h3 id="promo-decision-gd-modal-title" className="entity-zone__modal-title">
                {gdModal === 'approve' ? 'Подтверждение повышения' : 'Отказ от повышения'}
              </h3>
              <button type="button" className="entity-zone__icon-button" onClick={closeGdModal} aria-label="Закрыть" disabled={actionBusy}>
                {'\u00D7'}
              </button>
            </div>

            {gdModalError ? <InlineAlert variant="error" className="ui-alert--mb-sm">{gdModalError}</InlineAlert> : null}

            {gdModal === 'approve' ? (
              <div className="entity-zone__filters">
                <p className="entity-zone__idp-muted" style={{ gridColumn: '1 / -1' }}>
                  Предложение директора отдела: целевой грейд <strong>{displayItem.to_grade_code ?? '—'}</strong>
                  {displayItem.agreed_salary_rub_month != null && displayItem.agreed_salary_rub_month !== '' ? (
                    <>
                      {', оклад '}
                      <strong>{formatRubAmount(displayItem.agreed_salary_rub_month)}</strong>
                    </>
                  ) : null}
                  . После подтверждения они будут применены к сотруднику.
                </p>
                <p className="entity-zone__idp-muted" style={{ gridColumn: '1 / -1' }}>
                  Обоснование директора отдела: <em style={{ whiteSpace: 'pre-wrap' }}>{displayItem.rationale || '—'}</em>
                </p>
                <label className="entity-zone__field entity-zone__field--grow" style={{ gridColumn: '1 / -1' }}>
                  <span className="entity-zone__field-label">Обоснование генерального директора</span>
                  <textarea className="entity-zone__input" rows={3} value={gdRationale} onChange={(ev) => setGdRationale(ev.target.value)} disabled={actionBusy} />
                </label>
                <div className="entity-zone__actions" style={{ gridColumn: '1 / -1' }}>
                  <button type="button" className="entity-zone__button" disabled={actionBusy} onClick={closeGdModal}>
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
                  <button type="button" className="entity-zone__button" disabled={actionBusy} onClick={closeGdModal}>
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
