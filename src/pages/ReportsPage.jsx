import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, reportsApi } from '../api/index.js'
import { resolveCompanyId } from '../config/companyContext.js'
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

export function ReportsPage() {
  const { companyId } = resolveCompanyId()
  const period = defaultPeriod()
  const [dateFrom, setDateFrom] = useState(period.dateFrom)
  const [dateTo, setDateTo] = useState(period.dateTo)
  const [employeeIdInput, setEmployeeIdInput] = useState('')
  const [teamLeadIdInput, setTeamLeadIdInput] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
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
    try {
      const [completionReport, effectivenessReport, historyReport] = await Promise.all([
        reportsApi.fetchDevelopmentPlansCompletionReport(filter),
        reportsApi.fetchEffectivenessSummaryReport(filter),
        reportsApi.fetchPromotionDecisionsHistoryReport(filter),
      ])
      setCompletion(completionReport)
      setEffectiveness(effectivenessReport)
      setHistory(historyReport)
    } catch (e) {
      setCompletion(null)
      setEffectiveness(null)
      setHistory(null)
      if (e instanceof ApiError) {
        setError(e.message)
      } else if (e instanceof Error) {
        setError(e.message)
      } else {
        setError('Не удалось загрузить отчёты')
      }
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    void load({
      dateFrom: period.dateFrom,
      dateTo: period.dateTo,
      employeeIdInput: '',
      teamLeadIdInput: '',
    })
  }, [companyId, load, period.dateFrom, period.dateTo])

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

      {!loading && effectiveness ? (
        <>
          <h2 className="page__title">Сводка эффективности</h2>
          <div className="entity-zone__metrics">
            <article className="entity-zone__metric">
              <div className="entity-zone__metric-label">ИПР в срезе</div>
              <div className="entity-zone__metric-value">{effectiveness.plans_total}</div>
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
              <div className="entity-zone__metric-label">Конверсия в повышение</div>
              <div className="entity-zone__metric-value">{asPercent(effectiveness.promotion_conversion_percent)}</div>
            </article>
          </div>
        </>
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
              <div className="entity-zone__metric-label">Среднее выполнение ИПР</div>
              <div className="entity-zone__metric-value">{asPercent(completion.avg_plan_completion_percent)}</div>
            </article>
          </div>

          {completion.items.length > 0 ? (
            <div className="entity-zone__grid">
              {completion.items.map((item) => (
                <article key={item.plan_id} className="entity-zone__card">
                  <div className="entity-zone__card-name">{item.employee_name}</div>
                  <div className="entity-zone__card-code">
                    {item.team_lead_name ? `Тимлид: ${item.team_lead_name}` : 'Тимлид не указан'}
                  </div>
                  <div className="entity-zone__card-meta">
                    <span className="entity-zone__badge">{item.plan_status}</span>
                    <span className="entity-zone__badge">{asPercent(item.completion_percent)}</span>
                  </div>
                  <p className="entity-zone__card-desc">
                    Период: {item.period_start} — {item.period_end}
                    <br />
                    Задачи: {item.done_tasks_count}/{item.total_tasks_count} выполнено
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="entity-zone__empty">По текущим фильтрам нет строк отчёта выполнения ИПР.</p>
          )}
        </>
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
              {history.items.map((item) => (
                <article key={item.decision_id} className="entity-zone__card">
                  <div className="entity-zone__card-name">{item.employee_name}</div>
                  <div className="entity-zone__card-code">
                    {item.from_grade_code} → {item.to_grade_code ?? '—'}
                  </div>
                  <div className="entity-zone__card-meta">
                    <span className="entity-zone__badge">{item.decision}</span>
                    <span className="entity-zone__badge">{new Date(item.decided_at).toLocaleDateString('ru-RU')}</span>
                  </div>
                  <p className="entity-zone__card-desc">{item.rationale}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="entity-zone__empty">История решений за период пуста.</p>
          )}
        </>
      ) : null}
    </article>
  )
}
