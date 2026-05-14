import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, promotionDecisionsApi } from '../api/index.js'
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
  const [employeeIdInput, setEmployeeIdInput] = useState('')
  const [reviewCycleIdInput, setReviewCycleIdInput] = useState('')
  const [decision, setDecision] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [items, setItems] = useState(
    /** @type {import('../api/promotionDecisions.js').PromotionDecisionView[] | null} */ (null),
  )

  const load = useCallback(async (params) => {
    const employeeId = parsePositiveInt(params.employeeIdInput)
    const reviewCycleId = parsePositiveInt(params.reviewCycleIdInput)
    const filter = {
      employee_id: employeeId,
      review_cycle_id: reviewCycleId,
      company_id: companyId,
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
  }, [companyId])

  useEffect(() => {
    void load({
      employeeIdInput: '',
      reviewCycleIdInput: '',
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
      <p className="page__lead">История решений по итогам ревью.</p>

      {companyId == null ? (
        <div className="entity-zone__error" role="status">
          Не удалось определить компанию. Чтобы увидеть решения, укажите сотрудника в фильтре.
        </div>
      ) : null}

      <form
        className="entity-zone__filters"
        onSubmit={(ev) => {
          ev.preventDefault()
          void load({
            employeeIdInput,
            reviewCycleIdInput,
            decision,
            dateFrom,
            dateTo,
          })
        }}
      >
        <label className="entity-zone__field">
          <span className="entity-zone__field-label">Сотрудник</span>
          <input
            className="entity-zone__input"
            value={employeeIdInput}
            onChange={(ev) => setEmployeeIdInput(ev.target.value)}
            inputMode="numeric"
            placeholder="Введите номер сотрудника"
          />
        </label>
        <label className="entity-zone__field">
          <span className="entity-zone__field-label">Цикл ревью</span>
          <input
            className="entity-zone__input"
            value={reviewCycleIdInput}
            onChange={(ev) => setReviewCycleIdInput(ev.target.value)}
            inputMode="numeric"
            placeholder="Введите номер цикла"
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
              employeeIdInput,
              reviewCycleIdInput,
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
            <article key={item.decision_id} className="entity-zone__card">
              <div className="entity-zone__card-name">{DECISION_LABEL[item.decision] ?? item.decision}</div>
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
            </article>
          ))}
        </div>
      ) : null}
    </article>
  )
}
