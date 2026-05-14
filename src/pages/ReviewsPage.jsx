import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, reviewCyclesApi } from '../api/index.js'
import { resolveCompanyId } from '../config/companyContext.js'
import './pages.css'
import './EntityZone.css'

const REVIEW_TYPE_LABEL = {
  INTERIM_PROGRESS: 'Промежуточное',
  FINAL_PROMOTION: 'Итоговое',
}

const STATUS_LABEL = {
  SCHEDULED: 'Запланирован',
  COMPLETED: 'Завершён',
  CANCELLED: 'Отменён',
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

export function ReviewsPage() {
  const { companyId } = resolveCompanyId()

  const [employeeIdInput, setEmployeeIdInput] = useState('')
  const [reviewType, setReviewType] = useState('')
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [items, setItems] = useState(
    /** @type {import('../api/reviewCycles.js').ReviewCycleView[] | null} */ (null),
  )

  const load = useCallback(async (params) => {
    const employeeId = parsePositiveInt(params.employeeIdInput)
    const filter = {
      employee_id: employeeId,
      company_id: companyId,
      review_type: params.reviewType || null,
      status: params.status || null,
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
      const list = await reviewCyclesApi.fetchReviewCycles(filter)
      setItems(Array.isArray(list) ? list : [])
    } catch (e) {
      setItems(null)
      if (e instanceof ApiError) {
        setError(e.message)
      } else if (e instanceof Error) {
        setError(e.message)
      } else {
        setError('Не удалось загрузить циклы ревью')
      }
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    void load({
      employeeIdInput: '',
      reviewType: '',
      status: '',
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
        <li>Ревью</li>
      </ol>

      <h1 className="page__title">Циклы ревью</h1>
      <p className="page__lead">Плановые и завершённые ревью по сотрудникам.</p>

      {companyId == null ? (
        <div className="entity-zone__error" role="status">
          Не удалось определить компанию. Чтобы увидеть ревью, выберите сотрудника в фильтре.
        </div>
      ) : null}

      <form
        className="entity-zone__filters"
        onSubmit={(ev) => {
          ev.preventDefault()
          void load({
            employeeIdInput,
            reviewType,
            status,
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
          <span className="entity-zone__field-label">Тип ревью</span>
          <select
            className="entity-zone__select"
            value={reviewType}
            onChange={(ev) => setReviewType(ev.target.value)}
          >
            <option value="">Все</option>
            <option value="INTERIM_PROGRESS">Промежуточное</option>
            <option value="FINAL_PROMOTION">Итоговое</option>
          </select>
        </label>
        <label className="entity-zone__field">
          <span className="entity-zone__field-label">Статус</span>
          <select
            className="entity-zone__select"
            value={status}
            onChange={(ev) => setStatus(ev.target.value)}
          >
            <option value="">Все</option>
            <option value="SCHEDULED">Запланирован</option>
            <option value="COMPLETED">Завершён</option>
            <option value="CANCELLED">Отменён</option>
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
              reviewType,
              status,
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
        <p className="entity-zone__empty">Циклы ревью не найдены.</p>
      ) : null}

      {!loading && items && items.length > 0 ? (
        <div className="entity-zone__grid">
          {items.map((item) => (
            <article key={item.review_cycle_id} className="entity-zone__card">
              <div className="entity-zone__card-name">{REVIEW_TYPE_LABEL[item.review_type] ?? item.review_type}</div>
              <div className="entity-zone__card-meta">
                <span className="entity-zone__badge">{STATUS_LABEL[item.status] ?? item.status}</span>
                <span className="entity-zone__badge">Планов учтено: {item.considered_development_plan_ids.length}</span>
              </div>
              <p className="entity-zone__card-desc">
                Плановая дата: {formatDateTime(item.scheduled_at)}
                <br />
                Начато: {formatDateTime(item.started_at)}
                <br />
                Завершено: {formatDateTime(item.completed_at)}
              </p>
            </article>
          ))}
        </div>
      ) : null}
    </article>
  )
}
