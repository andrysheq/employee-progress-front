import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, employeesApi, promotionDecisionsApi } from '../api/index.js'
import { resolveCompanyId } from '../config/companyContext.js'
import './pages.css'
import './EntityZone.css'

const DECISION_LABEL = {
  APPROVED: 'Одобрено',
  REJECTED: 'Отклонено',
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
 * @param {string | null | undefined} iso
 * @returns {string}
 */
function formatDateTime(iso) {
  if (!iso) {
    return '—'
  }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return iso
  }
  return d.toLocaleString('ru-RU')
}

export function PromotionDecisionsPage() {
  const { companyId } = resolveCompanyId()
  const [employees, setEmployees] = useState(
    /** @type {import('../api/employees.js').EmployeeView[] | null} */ (null),
  )
  const [employeeFilterId, setEmployeeFilterId] = useState('')
  const [reviewCycleIdInput, setReviewCycleIdInput] = useState('')
  const [teamLeadIdInput, setTeamLeadIdInput] = useState('')
  const [decision, setDecision] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [items, setItems] = useState(
    /** @type {import('../api/promotionDecisions.js').PromotionDecisionView[] | null} */ (null),
  )

  const loadEmployees = useCallback(async () => {
    if (companyId == null) {
      setEmployees(null)
      return
    }
    try {
      const list = await employeesApi.fetchEmployeesByCompany(companyId)
      setEmployees(Array.isArray(list) ? list : [])
    } catch {
      setEmployees(null)
    }
  }, [companyId])

  useEffect(() => {
    void loadEmployees()
  }, [loadEmployees])

  const sortedEmployees = useMemo(() => {
    if (!employees) {
      return []
    }
    return [...employees].sort((a, b) =>
      String(a.full_name ?? '').localeCompare(String(b.full_name ?? ''), 'ru', { sensitivity: 'base' }),
    )
  }, [employees])

  const load = useCallback(
    async (params) => {
      const employeeId = params.employeeFilterId ? parsePositiveInt(params.employeeFilterId) : null
      const reviewCycleId = parsePositiveInt(params.reviewCycleIdInput)
      const teamLeadId = parsePositiveInt(params.teamLeadIdInput)
      const filter = {
        employee_id: employeeId,
        review_cycle_id: reviewCycleId,
        company_id: companyId,
        team_lead_id: teamLeadId,
        decision: params.decision || null,
        date_from: params.dateFrom || null,
        date_to: params.dateTo || null,
      }
      if (filter.company_id == null && filter.employee_id == null) {
        setItems(null)
        setError(null)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const list = await promotionDecisionsApi.fetchPromotionDecisions(filter)
        setItems(Array.isArray(list) ? list : [])
      } catch (e) {
        setItems(null)
        if (e instanceof ApiError) {
          setError(e.message)
        } else if (e instanceof Error) {
          setError(e.message)
        } else {
          setError('Не удалось загрузить кадровые решения')
        }
      } finally {
        setLoading(false)
      }
    },
    [companyId],
  )

  useEffect(() => {
    void load({
      employeeFilterId: '',
      reviewCycleIdInput: '',
      teamLeadIdInput: '',
      decision: '',
      dateFrom: '',
      dateTo: '',
    })
  }, [companyId, load])

  return (
    <article className="page">
      <ol className="page__breadcrumbs">
        <li>
          <Link to="/">Главная</Link>
        </li>
        <li>Кадровые решения</li>
      </ol>

      <h1 className="page__title">Кадровые решения по повышению</h1>
      <p className="page__lead">История решений по итогам ревью. Фильтры по компании, сотруднику, циклу и периоду.</p>

      {companyId == null ? (
        <div className="entity-zone__error" role="status">
          Не удалось определить компанию. Укажите сотрудника в фильтре или войдите с токеном, где есть{' '}
          <code>company_id</code>.
        </div>
      ) : null}

      <form
        className="entity-zone__filters"
        onSubmit={(ev) => {
          ev.preventDefault()
          void load({
            employeeFilterId,
            reviewCycleIdInput,
            teamLeadIdInput,
            decision,
            dateFrom,
            dateTo,
          })
        }}
      >
        <label className="entity-zone__field">
          <span className="entity-zone__field-label">Сотрудник</span>
          <select
            className="entity-zone__select"
            value={employeeFilterId}
            onChange={(ev) => setEmployeeFilterId(ev.target.value)}
          >
            <option value="">Все сотрудники компании</option>
            {sortedEmployees.map((emp) => (
              <option key={emp.id} value={String(emp.id)}>
                {emp.full_name}
              </option>
            ))}
          </select>
        </label>
        <label className="entity-zone__field">
          <span className="entity-zone__field-label">Цикл ревью (ID)</span>
          <input
            className="entity-zone__input"
            value={reviewCycleIdInput}
            onChange={(ev) => setReviewCycleIdInput(ev.target.value)}
            inputMode="numeric"
            placeholder="Необязательно"
          />
        </label>
        <label className="entity-zone__field">
          <span className="entity-zone__field-label">Тимлид (ID)</span>
          <input
            className="entity-zone__input"
            value={teamLeadIdInput}
            onChange={(ev) => setTeamLeadIdInput(ev.target.value)}
            inputMode="numeric"
            placeholder="По связанному ИПР"
          />
        </label>
        <label className="entity-zone__field">
          <span className="entity-zone__field-label">Решение</span>
          <select
            className="entity-zone__select"
            value={decision}
            onChange={(ev) => setDecision(ev.target.value)}
          >
            <option value="">Все</option>
            <option value="APPROVED">Одобрено</option>
            <option value="REJECTED">Отклонено</option>
          </select>
        </label>
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
      </form>

      <div className="entity-zone__actions">
        <button
          className="entity-zone__button entity-zone__button--primary"
          type="button"
          onClick={() =>
            void load({
              employeeFilterId,
              reviewCycleIdInput,
              teamLeadIdInput,
              decision,
              dateFrom,
              dateTo,
            })
          }
        >
          Применить фильтры
        </button>
      </div>

      {error ? (
        <div className="entity-zone__error" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? <p className="entity-zone__loading">Загрузка…</p> : null}

      {!loading && items && items.length === 0 && !error ? (
        <p className="entity-zone__empty">Кадровые решения не найдены.</p>
      ) : null}

      {!loading && items && items.length > 0 ? (
        <div className="entity-zone__grid">
          {items.map((item) => (
            <article key={item.decision_id} className="entity-zone__card entity-zone__card--panel">
              <div className="entity-zone__card-name">
                {DECISION_LABEL[/** @type {keyof typeof DECISION_LABEL} */ (item.decision)] ?? item.decision}
              </div>
              <div className="entity-zone__card-code">
                Цикл ревью #{item.review_cycle_id} · сотрудник #{item.employee_id}
              </div>
              <div className="entity-zone__card-meta">
                <span className="entity-zone__badge">{item.employee_name}</span>
                <span className="entity-zone__badge">
                  {item.from_grade_code} → {item.to_grade_code ?? '—'}
                </span>
              </div>
              <p className="entity-zone__card-desc">
                {item.rationale}
                <br />
                Принял: {item.decided_by_name} · {formatDateTime(item.decided_at)}
              </p>
              {item.improvement_plan_summary ? (
                <p className="entity-zone__card-desc">План улучшений: {item.improvement_plan_summary}</p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </article>
  )
}
