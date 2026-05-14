import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, employeesApi, promotionDecisionsApi } from '../api/index.js'
import { useAuth } from '../auth/useAuth.js'
import { hasDirectorRole } from '../auth/roleChecks.js'
import { resolveCompanyId } from '../config/companyContext.js'
import './pages.css'
import './EntityZone.css'

const DECISION_LABEL = {
  APPROVED: 'Одобрено',
  REJECTED: 'Отклонено',
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
  const { roles } = useAuth()
  const canRead = hasDirectorRole(roles)

  const [employees, setEmployees] = useState(
    /** @type {import('../api/employees.js').EmployeeView[] | null} */ (null),
  )
  const [employeeNameLike, setEmployeeNameLike] = useState('')
  const [teamLeadId, setTeamLeadId] = useState('')
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
      const page = await employeesApi.fetchEmployeesRegistry(
        { company_id: companyId, is_active: true },
        { size: 300, sort: 'fullName,asc' },
      )
      setEmployees(page.content)
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

  const load = useCallback(async () => {
    if (companyId == null) {
      setItems(null)
      setError(null)
      return
    }
    if (!canRead) {
      setItems(null)
      setError('Недостаточно прав для просмотра кадровых решений')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const page = await promotionDecisionsApi.fetchPromotionDecisionsRegistry(
        {
          company_id: companyId,
          team_lead_id: teamLeadId ? Number(teamLeadId) : null,
          decision_type: decision || null,
          date_from: dateFrom || null,
          date_to: dateTo || null,
          employee_title_like: employeeNameLike.trim() || null,
        },
        { size: 100, sort: 'decidedAt,desc' },
      )
      setItems(page.content)
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
  }, [canRead, companyId, dateFrom, dateTo, decision, employeeNameLike, teamLeadId])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <article className="page">
      <ol className="page__breadcrumbs">
        <li>
          <Link to="/">Главная</Link>
        </li>
        <li>Кадровые решения</li>
      </ol>

      <h1 className="page__title">Кадровые решения по повышению</h1>
      <p className="page__lead">История решений по итогам ревью с фильтрацией по значениям.</p>

      {companyId == null ? (
        <div className="entity-zone__error" role="status">
          Не удалось определить компанию.
        </div>
      ) : null}

      <form
        className="entity-zone__filters"
        onSubmit={(ev) => {
          ev.preventDefault()
          void load()
        }}
      >
        <label className="entity-zone__field entity-zone__field--grow">
          <span className="entity-zone__field-label">Сотрудник (поиск по ФИО)</span>
          <input
            className="entity-zone__input"
            value={employeeNameLike}
            onChange={(ev) => setEmployeeNameLike(ev.target.value)}
            placeholder="Например: Сидоров"
          />
        </label>
        <label className="entity-zone__field">
          <span className="entity-zone__field-label">Тимлид</span>
          <select className="entity-zone__select" value={teamLeadId} onChange={(ev) => setTeamLeadId(ev.target.value)}>
            <option value="">Все</option>
            {sortedEmployees.map((emp) => (
              <option key={emp.id} value={String(emp.id)}>
                {emp.full_name}
              </option>
            ))}
          </select>
        </label>
        <label className="entity-zone__field">
          <span className="entity-zone__field-label">Решение</span>
          <select className="entity-zone__select" value={decision} onChange={(ev) => setDecision(ev.target.value)}>
            <option value="">Все</option>
            <option value="APPROVED">Одобрено</option>
            <option value="REJECTED">Отклонено</option>
          </select>
        </label>
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
              <div className="entity-zone__card-code">{item.employee_name}</div>
              <div className="entity-zone__card-meta">
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
