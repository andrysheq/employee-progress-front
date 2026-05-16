import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, employeesApi, promotionDecisionsApi } from '../api/index.js'
import { useAuth } from '../auth/useAuth.js'
import { hasDirectorRole } from '../auth/roleChecks.js'
import { resolveCompanyId } from '../config/companyContext.js'
import { formatDateTimeRuNoSeconds } from '../utils/dateFormat.js'
import { InlineAlert } from '../components/ui/Alert.jsx'
import { SelectDropdown } from '../components/ui/SelectDropdown.jsx'
import { useDisplayWhileRefreshing } from '../hooks/useDisplayWhileRefreshing.js'
import { cn } from '../lib/utils.js'
import './pages.css'
import './EntityZone.css'

const DECISION_LABEL = {
  APPROVED: 'Одобрено',
  REJECTED: 'Отклонено',
}

const DECISION_FILTER_OPTIONS = [
  { value: '', label: 'Все' },
  { value: 'APPROVED', label: 'Одобрено', description: 'Повышение согласовано' },
  { value: 'REJECTED', label: 'Отклонено', description: 'Повышение не согласовано' },
]

/**
 * @param {string | null | undefined} text
 * @param {number} max
 */
function truncate(text, max) {
  if (!text) return ''
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max).trim()}…`
}

export function PromotionDecisionsPage() {
  const { companyId } = resolveCompanyId()
  const { roles } = useAuth()
  const navigate = useNavigate()
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

  const { displayData: displayItems, showBlockingSpinner, isRefreshing } = useDisplayWhileRefreshing(items, loading)

  return (
    <article className="page">
      <ol className="page__breadcrumbs">
        <li>
          <Link to="/">Главная</Link>
        </li>
        <li>Решения</li>
      </ol>

      <h1 className="page__title">Кадровые решения по повышению</h1>
      <p className="page__lead">История решений по итогам ревью. Нажмите на карточку, чтобы открыть детали.</p>

      {companyId == null ? (
        <InlineAlert variant="warning" role="status">
          Не удалось определить компанию.
        </InlineAlert>
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
          <SelectDropdown
            value={teamLeadId}
            onChange={setTeamLeadId}
            placeholder="Все"
            options={[
              { value: '', label: 'Все' },
              ...sortedEmployees.map((emp) => ({ value: String(emp.id), label: emp.full_name })),
            ]}
          />
        </label>
        <label className="entity-zone__field">
          <span className="entity-zone__field-label">Решение</span>
          <SelectDropdown value={decision} onChange={setDecision} options={DECISION_FILTER_OPTIONS} />
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

      {error ? <InlineAlert variant="error">{error}</InlineAlert> : null}

      {showBlockingSpinner ? <p className="entity-zone__loading">Загрузка…</p> : null}

      {canRead && displayItems && displayItems.length === 0 && !error ? (
        <p className="entity-zone__empty">Кадровые решения не найдены.</p>
      ) : null}

      {canRead && displayItems && displayItems.length > 0 ? (
        <div
          className={cn(
            'entity-zone__results-surface',
            isRefreshing && 'entity-zone__results-surface--refreshing',
          )}
          aria-busy={isRefreshing || undefined}
        >
          <div className="entity-zone__grid entity-zone__grid--idp">
          {displayItems.map((item) => {
            const decisionKey = String(item.decision ?? '').toUpperCase()
            const decisionLabel =
              DECISION_LABEL[/** @type {keyof typeof DECISION_LABEL} */ (decisionKey)] ?? item.decision
            const detailUrl = `/promotion-decisions/${item.decision_id}`
            return (
              <article
                key={item.decision_id}
                className="entity-zone__card entity-zone__card--panel entity-zone__card--clickable"
                role="link"
                tabIndex={0}
                aria-label={`Открыть решение: ${item.employee_name}`}
                onClick={() => navigate(detailUrl)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault()
                    navigate(detailUrl)
                  }
                }}
              >
                <div className="entity-zone__card-name">{item.employee_name}</div>
                <div className="entity-zone__card-code entity-zone__card-code--status-lg">{decisionLabel}</div>
                <div className="entity-zone__card-meta">
                  <span className="entity-zone__badge">
                    {item.from_grade_code} → {item.to_grade_code ?? '—'}
                  </span>
                </div>
                <p className="entity-zone__card-desc">{truncate(item.rationale, 180)}</p>
                <p className="entity-zone__card-desc entity-zone__task-stats">
                  Принял: {item.decided_by_name}
                </p>
                <p className="entity-zone__card-desc entity-zone__task-stats">
                  Дата: {formatDateTimeRuNoSeconds(item.decided_at)}
                </p>
                {item.improvement_plan_summary ? (
                  <p className="entity-zone__card-desc">План улучшений: {truncate(item.improvement_plan_summary, 120)}</p>
                ) : null}
              </article>
            )
          })}
          </div>
        </div>
      ) : null}
    </article>
  )
}
