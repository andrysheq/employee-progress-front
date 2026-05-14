import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, reportsApi } from '../api/index.js'
import { resolveCompanyId } from '../config/companyContext.js'
import './pages.css'
import './EntityZone.css'

const PLAN_STATUS_LABEL = {
  DRAFT: 'Черновик',
  ACTIVE: 'Активен',
  ARCHIVED: 'Архив',
}

const DECISION_LABEL = {
  APPROVED: 'Одобрено',
  REJECTED: 'Отклонено',
}

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
 * @param {string} value
 * @returns {number | null}
 */
function parsePositiveInt(value) {
  if (!value || value.trim() === '') {
    return null
  }
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) {
    return null
  }
  return Math.trunc(n)
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
  const defaultRange = useMemo(() => defaultPeriod(), [])
  const [dateFrom, setDateFrom] = useState(() => defaultRange.dateFrom)
  const [dateTo, setDateTo] = useState(() => defaultRange.dateTo)
  const [employeeIdInput, setEmployeeIdInput] = useState('')
  const [teamLeadIdInput, setTeamLeadIdInput] = useState('')

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

  const load = useCallback(async (params) => {
    if (companyId == null || !params.dateFrom || !params.dateTo) {
      setCompletion(null)
      setEffectiveness(null)
      setHistory(null)
      setError(null)
      setCompletionError(null)
      setEffectivenessError(null)
      setHistoryError(null)
      return
    }
    const filter = {
      company_id: companyId,
      date_from: params.dateFrom,
      date_to: params.dateTo,
      employee_id: parsePositiveInt(params.employeeIdInput),
      team_lead_id: parsePositiveInt(params.teamLeadIdInput),
    }
    setLoading(true)
    setError(null)
    setCompletionError(null)
    setEffectivenessError(null)
    setHistoryError(null)
    const settled = await Promise.allSettled([
      reportsApi.fetchDevelopmentPlansCompletionReport(filter),
      reportsApi.fetchEffectivenessSummaryReport(filter),
      reportsApi.fetchPromotionDecisionsHistoryReport(filter),
    ])
    const [c, e, h] = settled
    if (c.status === 'fulfilled') {
      setCompletion(/** @type {import('../api/reports.js').DevelopmentPlanCompletionReportView} */ (c.value))
      setCompletionError(null)
    } else {
      setCompletion(null)
      setCompletionError(formatReportFailure(c.reason))
    }
    if (e.status === 'fulfilled') {
      setEffectiveness(/** @type {import('../api/reports.js').EffectivenessSummaryReportView} */ (e.value))
      setEffectivenessError(null)
    } else {
      setEffectiveness(null)
      setEffectivenessError(formatReportFailure(e.reason))
    }
    if (h.status === 'fulfilled') {
      setHistory(/** @type {import('../api/reports.js').PromotionDecisionHistoryReportView} */ (h.value))
      setHistoryError(null)
    } else {
      setHistory(null)
      setHistoryError(formatReportFailure(h.reason))
    }
    if (c.status === 'rejected' && e.status === 'rejected' && h.status === 'rejected') {
      setError('Ни один отчёт не загрузился. Проверьте права доступа и параметры периода.')
    } else {
      setError(null)
    }
    setLoading(false)
  }, [companyId])

  useEffect(() => {
    void load({
      dateFrom: defaultRange.dateFrom,
      dateTo: defaultRange.dateTo,
      employeeIdInput: '',
      teamLeadIdInput: '',
    })
  }, [companyId, load, defaultRange.dateFrom, defaultRange.dateTo])

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
        <div className="entity-zone__error" role="status">
          Не удалось определить компанию для загрузки отчётов.
        </div>
      ) : null}

      <form
        className="entity-zone__filters"
        onSubmit={(ev) => {
          ev.preventDefault()
          void load({
            dateFrom,
            dateTo,
            employeeIdInput,
            teamLeadIdInput,
          })
        }}
      >
        <label className="entity-zone__field">
          <span className="entity-zone__field-label">Период: с</span>
          <input
            className="entity-zone__input"
            type="date"
            value={dateFrom}
            onChange={(ev) => setDateFrom(ev.target.value)}
          />
        </label>
        <label className="entity-zone__field">
          <span className="entity-zone__field-label">Период: по</span>
          <input
            className="entity-zone__input"
            type="date"
            value={dateTo}
            onChange={(ev) => setDateTo(ev.target.value)}
          />
        </label>
        <label className="entity-zone__field">
          <span className="entity-zone__field-label">Сотрудник (опционально)</span>
          <input
            className="entity-zone__input"
            value={employeeIdInput}
            onChange={(ev) => setEmployeeIdInput(ev.target.value)}
            inputMode="numeric"
            placeholder="Введите номер сотрудника"
          />
        </label>
        <label className="entity-zone__field">
          <span className="entity-zone__field-label">Тимлид (опционально)</span>
          <input
            className="entity-zone__input"
            value={teamLeadIdInput}
            onChange={(ev) => setTeamLeadIdInput(ev.target.value)}
            inputMode="numeric"
            placeholder="Введите номер тимлида"
          />
        </label>
      </form>

      <div className="entity-zone__actions">
        <button
          className="entity-zone__button entity-zone__button--primary"
          type="button"
          onClick={() =>
            void load({
              dateFrom,
              dateTo,
              employeeIdInput,
              teamLeadIdInput,
            })
          }
        >
          Обновить отчёты
        </button>
      </div>

      {error ? (
        <div className="entity-zone__error" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? <p className="entity-zone__loading">Загрузка…</p> : null}

      {!loading && effectivenessError ? (
        <p className="entity-zone__section-error" role="status">
          Сводка эффективности: {effectivenessError}
        </p>
      ) : null}

      {!loading && effectiveness ? (
        <>
          <h2 className="page__title">Сводка эффективности</h2>
          <div className="entity-zone__metrics">
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">ИПР в срезе</div>
              <div className="entity-zone__metric-value">{effectiveness.plans_total}</div>
            </article>
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Активных ИПР</div>
              <div className="entity-zone__metric-value">{effectiveness.plans_active}</div>
            </article>
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Завершённых ИПР</div>
              <div className="entity-zone__metric-value">{effectiveness.plans_completed}</div>
            </article>
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Среднее выполнение</div>
              <div className="entity-zone__metric-value">{asPercent(effectiveness.avg_plan_completion_percent)}</div>
            </article>
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Доля задач в срок</div>
              <div className="entity-zone__metric-value">{asPercent(effectiveness.on_time_done_tasks_share_percent)}</div>
            </article>
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Средняя длительность задачи</div>
              <div className="entity-zone__metric-value">
                {Number.isFinite(Number(effectiveness.avg_task_completion_duration_days))
                  ? `${Number(effectiveness.avg_task_completion_duration_days).toFixed(1)} дн.`
                  : '—'}
              </div>
            </article>
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Итоговых ревью</div>
              <div className="entity-zone__metric-value">{effectiveness.final_reviews_total}</div>
            </article>
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Повышения одобрено</div>
              <div className="entity-zone__metric-value">{effectiveness.promotion_approved_total}</div>
            </article>
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Повышения отклонено</div>
              <div className="entity-zone__metric-value">{effectiveness.promotion_rejected_total}</div>
            </article>
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Конверсия в повышение</div>
              <div className="entity-zone__metric-value">{asPercent(effectiveness.promotion_conversion_percent)}</div>
            </article>
          </div>
        </>
      ) : null}

      {!loading && completionError ? (
        <p className="entity-zone__section-error" role="status">
          Выполнение ИПР: {completionError}
        </p>
      ) : null}

      {!loading && completion ? (
        <>
          <h2 className="page__title">Выполнение ИПР</h2>
          <div className="entity-zone__metrics">
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Всего ИПР</div>
              <div className="entity-zone__metric-value">{completion.plans_total}</div>
            </article>
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Всего задач</div>
              <div className="entity-zone__metric-value">{completion.tasks_total}</div>
            </article>
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Выполнено задач</div>
              <div className="entity-zone__metric-value">{completion.tasks_done}</div>
            </article>
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">В работе</div>
              <div className="entity-zone__metric-value">{completion.tasks_in_progress}</div>
            </article>
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Запланировано</div>
              <div className="entity-zone__metric-value">{completion.tasks_planned}</div>
            </article>
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Среднее выполнение ИПР</div>
              <div className="entity-zone__metric-value">{asPercent(completion.avg_plan_completion_percent)}</div>
            </article>
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Доля задач в срок</div>
              <div className="entity-zone__metric-value">{asPercent(completion.on_time_done_tasks_share_percent)}</div>
            </article>
          </div>

          {completion.items.length > 0 ? (
            <div className="entity-zone__grid">
              {completion.items.map((item) => {
                const st = typeof item.plan_status === 'string' ? item.plan_status.toUpperCase() : item.plan_status
                const statusLabel =
                  PLAN_STATUS_LABEL[/** @type {keyof typeof PLAN_STATUS_LABEL} */ (st)] ?? item.plan_status
                return (
                  <article key={item.plan_id} className="entity-zone__card entity-zone__card--panel">
                    <div className="entity-zone__card-name">{item.employee_name}</div>
                    <div className="entity-zone__card-code">
                      {item.team_lead_name ? `Тимлид: ${item.team_lead_name}` : 'Тимлид не указан'}
                    </div>
                    <div className="entity-zone__card-meta">
                      <span className="entity-zone__badge">{statusLabel}</span>
                      <span className="entity-zone__badge">{asPercent(item.completion_percent)}</span>
                    </div>
                    <p className="entity-zone__card-desc">
                      Период: {item.period_start} — {item.period_end}
                      <br />
                      Задачи: {item.done_tasks_count}/{item.total_tasks_count} выполнено
                      {item.in_progress_tasks_count != null || item.planned_tasks_count != null ? (
                        <>
                          <br />
                          В работе: {item.in_progress_tasks_count ?? '—'}, запланировано: {item.planned_tasks_count ?? '—'}
                        </>
                      ) : null}
                    </p>
                  </article>
                )
              })}
            </div>
          ) : (
            <p className="entity-zone__empty">По текущим фильтрам нет строк отчёта выполнения ИПР.</p>
          )}
        </>
      ) : null}

      {!loading && historyError ? (
        <p className="entity-zone__section-error" role="status">
          История кадровых решений: {historyError}
        </p>
      ) : null}

      {!loading && history ? (
        <>
          <h2 className="page__title">История кадровых решений</h2>
          <div className="entity-zone__metrics">
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Всего решений</div>
              <div className="entity-zone__metric-value">{history.decisions_total}</div>
            </article>
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Одобрено</div>
              <div className="entity-zone__metric-value">{history.approved_total}</div>
            </article>
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">Отклонено</div>
              <div className="entity-zone__metric-value">{history.rejected_total}</div>
            </article>
          </div>
          {history.items.length > 0 ? (
            <div className="entity-zone__grid">
              {history.items.map((item) => {
                const d = typeof item.decision === 'string' ? item.decision.toUpperCase() : item.decision
                const decisionLabel =
                  DECISION_LABEL[/** @type {keyof typeof DECISION_LABEL} */ (d)] ?? item.decision
                return (
                  <article key={item.decision_id} className="entity-zone__card entity-zone__card--panel">
                    <div className="entity-zone__card-name">{item.employee_name}</div>
                    <div className="entity-zone__card-code">
                      {item.from_grade_code} → {item.to_grade_code ?? '—'}
                    </div>
                    <div className="entity-zone__card-meta">
                      <span className="entity-zone__badge">{decisionLabel}</span>
                      <span className="entity-zone__badge">{new Date(item.decided_at).toLocaleDateString('ru-RU')}</span>
                    </div>
                    <p className="entity-zone__card-desc">{item.rationale}</p>
                  </article>
                )
              })}
            </div>
          ) : (
            <p className="entity-zone__empty">История решений за период пуста.</p>
          )}
        </>
      ) : null}
    </article>
  )
}
