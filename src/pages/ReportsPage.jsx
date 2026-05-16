import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, reportsApi } from '../api/index.js'
import { useAuth } from '../auth/useAuth.js'
import { hasDirectorRole, hasTeamLeadRole } from '../auth/roleChecks.js'
import { resolveCompanyId } from '../config/companyContext.js'
import { InlineAlert } from '../components/ui/Alert.jsx'
import { useDisplayWhileRefreshing } from '../hooks/useDisplayWhileRefreshing.js'
import { cn } from '../lib/utils.js'
import { ReportPlansPipelineDonut, ReportPromotionDonut, ReportTasksStackedBar } from '../components/reports/ReportCharts.jsx'
import './pages.css'
import './EntityZone.css'

/**
 * @returns {{ dateFrom: string, dateTo: string }}
 */
function defaultPeriod() {
  const now = new Date()
  const to = new Date(now)
  const from = new Date(now)
  from.setDate(from.getDate() - 90)
  const fmt = (d) => d.toISOString().slice(0, 10)
  return { dateFrom: fmt(from), dateTo: fmt(to) }
}

/**
 * @param {number | string | null | undefined} value
 */
function asPercent(value) {
  if (value == null || value === '') {
    return '—'
  }
  const n = Number(value)
  if (!Number.isFinite(n)) {
    return String(value)
  }
  return `${n.toFixed(1)}%`
}

/**
 * @param {unknown} reason
 */
function formatReportFailure(reason) {
  if (reason instanceof ApiError) {
    return reason.message
  }
  if (reason instanceof Error) {
    return reason.message
  }
  return 'Не удалось загрузить раздел'
}

export function ReportsPage() {
  const { companyId } = resolveCompanyId()
  const { roles } = useAuth()
  const canReadDirectorReports = hasDirectorRole(roles)
  const canReadTeamLeadReports = hasTeamLeadRole(roles)
  const canReadPerformance = canReadDirectorReports || canReadTeamLeadReports
  const canReadHistory = canReadDirectorReports

  const defaultRange = useMemo(() => defaultPeriod(), [])
  const [dateFrom, setDateFrom] = useState(() => defaultRange.dateFrom)
  const [dateTo, setDateTo] = useState(() => defaultRange.dateTo)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [completionError, setCompletionError] = useState(/** @type {string | null} */ (null))
  const [effectivenessError, setEffectivenessError] = useState(/** @type {string | null} */ (null))
  const [historyError, setHistoryError] = useState(/** @type {string | null} */ (null))
  const [completion, setCompletion] = useState(
    /** @type {import('../api/reports.js').DevelopmentPlanCompletionReportView | null} */ (null),
  )
  const [effectiveness, setEffectiveness] = useState(
    /** @type {import('../api/reports.js').EffectivenessSummaryReportView | null} */ (null),
  )
  const [history, setHistory] = useState(
    /** @type {import('../api/reports.js').PromotionDecisionHistoryReportView | null} */ (null),
  )

  const load = useCallback(async () => {
    if (companyId == null || !dateFrom || !dateTo) {
      setCompletion(null)
      setEffectiveness(null)
      setHistory(null)
      setError(null)
      setCompletionError(null)
      setEffectivenessError(null)
      setHistoryError(null)
      return
    }
    if (!canReadPerformance && !canReadHistory) {
      setCompletion(null)
      setEffectiveness(null)
      setHistory(null)
      setError('Недостаточно прав для просмотра отчётов')
      setCompletionError(null)
      setEffectivenessError(null)
      setHistoryError(null)
      return
    }

    const filter = {
      company_id: companyId,
      date_from: dateFrom,
      date_to: dateTo,
    }

    setLoading(true)
    setError(null)
    setCompletionError(null)
    setEffectivenessError(null)
    setHistoryError(null)

    const completionPromise = canReadPerformance
      ? reportsApi.fetchDevelopmentPlansCompletionReport(filter)
      : Promise.resolve(null)
    const effectivenessPromise = canReadPerformance
      ? reportsApi.fetchEffectivenessSummaryReport(filter)
      : Promise.resolve(null)
    const historyPromise = canReadHistory
      ? reportsApi.fetchPromotionDecisionsHistoryReport(filter)
      : Promise.resolve(null)

    const settled = await Promise.allSettled([completionPromise, effectivenessPromise, historyPromise])
    const [c, e, h] = settled

    if (canReadPerformance) {
      if (c.status === 'fulfilled') {
        setCompletion(/** @type {import('../api/reports.js').DevelopmentPlanCompletionReportView} */ (c.value))
      } else {
        setCompletion(null)
        setCompletionError(formatReportFailure(c.reason))
      }

      if (e.status === 'fulfilled') {
        setEffectiveness(/** @type {import('../api/reports.js').EffectivenessSummaryReportView} */ (e.value))
      } else {
        setEffectiveness(null)
        setEffectivenessError(formatReportFailure(e.reason))
      }
    } else {
      setCompletion(null)
      setEffectiveness(null)
      setCompletionError(null)
      setEffectivenessError(null)
    }

    if (canReadHistory) {
      if (h.status === 'fulfilled') {
        setHistory(/** @type {import('../api/reports.js').PromotionDecisionHistoryReportView} */ (h.value))
      } else {
        setHistory(null)
        setHistoryError(formatReportFailure(h.reason))
      }
    } else {
      setHistory(null)
      setHistoryError(null)
    }

    const allRequestedFailed =
      (!canReadPerformance || (c.status === 'rejected' && e.status === 'rejected')) &&
      (!canReadHistory || h.status === 'rejected')
    if (allRequestedFailed) {
      setError('Не удалось загрузить отчёты. Проверьте права доступа и параметры периода.')
    } else {
      setError(null)
    }

    setLoading(false)
  }, [
    canReadHistory,
    canReadPerformance,
    companyId,
    dateFrom,
    dateTo,
  ])

  useEffect(() => {
    void load()
  }, [load])

  const displayBundle = useMemo(
    () => ({ completion, effectiveness, history }),
    [completion, effectiveness, history],
  )
  const { displayData: disp, showBlockingSpinner, isRefreshing } = useDisplayWhileRefreshing(displayBundle, loading)
  const dEff = disp?.effectiveness ?? null
  const dComp = disp?.completion ?? null
  const dHist = disp?.history ?? null

  return (
    <article className="page">
      <ol className="page__breadcrumbs">
        <li>
          <Link to="/">Главная</Link>
        </li>
        <li>Отчёты</li>
      </ol>

      <h1 className="page__title">Отчёты по развитию и повышению</h1>
      <p className="page__lead">Сводные показатели по выполнению ИПР, эффективности и кадровым решениям.</p>

      {companyId == null ? (
        <InlineAlert variant="warning" role="status">
          Не удалось определить компанию для загрузки отчётов.
        </InlineAlert>
      ) : null}

      <form
        className="entity-zone__filters"
        onSubmit={(ev) => {
          ev.preventDefault()
          void load()
        }}
      >
        <label className="entity-zone__field">
          <span className="entity-zone__field-label">Период: с</span>
          <input className="entity-zone__input" type="date" value={dateFrom} onChange={(ev) => setDateFrom(ev.target.value)} />
        </label>
        <label className="entity-zone__field">
          <span className="entity-zone__field-label">Период: по</span>
          <input className="entity-zone__input" type="date" value={dateTo} onChange={(ev) => setDateTo(ev.target.value)} />
        </label>
      </form>

      <div className="entity-zone__actions">
        <button className="entity-zone__button entity-zone__button--primary" type="button" onClick={() => void load()}>
          Обновить отчёты
        </button>
      </div>

      {error ? <InlineAlert variant="error">{error}</InlineAlert> : null}

      {showBlockingSpinner ? <p className="entity-zone__loading">Загрузка…</p> : null}

      <div
        className={cn(
          'entity-zone__results-surface',
          isRefreshing && 'entity-zone__results-surface--refreshing',
        )}
        aria-busy={isRefreshing || undefined}
      >
      {effectivenessError ? (
        <p className="entity-zone__section-error" role="status">
          Сводка эффективности: {effectivenessError}
        </p>
      ) : null}

      {dEff ? (
        <>
          <h2 className="page__title">Сводка эффективности</h2>
          <div className="entity-zone__metrics">
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">ИПР в срезе</div>
              <div className="entity-zone__metric-value">{dEff.plans_total}</div>
            </article>
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Активных ИПР</div>
              <div className="entity-zone__metric-value">{dEff.plans_active}</div>
            </article>
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Завершённых ИПР</div>
              <div className="entity-zone__metric-value">{dEff.plans_completed}</div>
            </article>
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Среднее выполнение</div>
              <div className="entity-zone__metric-value">{asPercent(dEff.avg_plan_completion_percent)}</div>
            </article>
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Доля задач в срок</div>
              <div className="entity-zone__metric-value">{asPercent(dEff.on_time_done_tasks_share_percent)}</div>
            </article>
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Средняя длительность задачи</div>
              <div className="entity-zone__metric-value">
                {Number.isFinite(Number(dEff.avg_task_completion_duration_days))
                  ? `${Number(dEff.avg_task_completion_duration_days).toFixed(1)} дн.`
                  : '—'}
              </div>
            </article>
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Итоговых ревью</div>
              <div className="entity-zone__metric-value">{dEff.final_reviews_total}</div>
            </article>
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Повышения одобрено</div>
              <div className="entity-zone__metric-value">{dEff.promotion_approved_total}</div>
            </article>
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Повышения отклонено</div>
              <div className="entity-zone__metric-value">{dEff.promotion_rejected_total}</div>
            </article>
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Конверсия в повышение</div>
              <div className="entity-zone__metric-value">{asPercent(dEff.promotion_conversion_percent)}</div>
            </article>
          </div>
        </>
      ) : null}

      {completionError ? (
        <p className="entity-zone__section-error" role="status">
          Выполнение ИПР: {completionError}
        </p>
      ) : null}

      {dComp ? (
        <>
          <h2 className="page__title">Выполнение ИПР</h2>
          <div className="entity-zone__metrics">
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Всего ИПР</div>
              <div className="entity-zone__metric-value">{dComp.plans_total}</div>
            </article>
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Всего задач</div>
              <div className="entity-zone__metric-value">{dComp.tasks_total}</div>
            </article>
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Выполнено задач</div>
              <div className="entity-zone__metric-value">{dComp.tasks_done}</div>
            </article>
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">В работе</div>
              <div className="entity-zone__metric-value">{dComp.tasks_in_progress}</div>
            </article>
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Запланировано</div>
              <div className="entity-zone__metric-value">{dComp.tasks_planned}</div>
            </article>
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Среднее выполнение ИПР</div>
              <div className="entity-zone__metric-value">{asPercent(dComp.avg_plan_completion_percent)}</div>
            </article>
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Доля задач в срок</div>
              <div className="entity-zone__metric-value">{asPercent(dComp.on_time_done_tasks_share_percent)}</div>
            </article>
          </div>
        </>
      ) : null}

      {historyError ? (
        <p className="entity-zone__section-error" role="status">
          История кадровых решений: {historyError}
        </p>
      ) : null}

      {dHist ? (
        <>
          <h2 className="page__title">История кадровых решений</h2>
          <div className="entity-zone__metrics">
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Всего решений</div>
              <div className="entity-zone__metric-value">{dHist.decisions_total}</div>
            </article>
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Одобрено</div>
              <div className="entity-zone__metric-value">{dHist.approved_total}</div>
            </article>
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Отклонено</div>
              <div className="entity-zone__metric-value">{dHist.rejected_total}</div>
            </article>
          </div>
          {dHist.decisions_total === 0 ? (
            <p className="entity-zone__empty">История решений за период пуста.</p>
          ) : null}
        </>
      ) : null}

      {((canReadPerformance && (dComp || dEff)) || (canReadHistory && dHist && dHist.decisions_total > 0)) ? (
        <section className="reports-charts-section" aria-labelledby="reports-charts-heading">
          <h2 id="reports-charts-heading" className="page__title">
            Графики
          </h2>
          <p className="entity-zone__idp-muted" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
            Краткая визуализация по загруженным отчётам за выбранный период.
          </p>
          <div className="reports-charts-grid">
            {canReadPerformance && dComp ? (
              <ReportTasksStackedBar
                done={dComp.tasks_done}
                inProgress={dComp.tasks_in_progress}
                planned={dComp.tasks_planned}
              />
            ) : null}
            {canReadHistory && dHist && dHist.decisions_total > 0 ? (
              <ReportPromotionDonut history={dHist} />
            ) : canReadPerformance && dEff && dEff.plans_total > 0 ? (
              <ReportPlansPipelineDonut eff={dEff} />
            ) : null}
          </div>
        </section>
      ) : null}
      </div>
    </article>
  )
}
