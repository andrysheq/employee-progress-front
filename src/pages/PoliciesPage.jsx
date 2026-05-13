import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, promotionPoliciesApi } from '../api/index.js'
import { resolveCompanyId } from '../config/companyContext.js'
import './pages.css'
import './EntityZone.css'

/**
 * @param {number | string | undefined | null} v
 */
function displayDecimal(v) {
  if (v == null || v === '') {
    return '—'
  }
  return String(v)
}

export function PoliciesPage() {
  const { companyId, source } = resolveCompanyId()
  const [onlyActive, setOnlyActive] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [requestId, setRequestId] = useState(/** @type {string | null} */ (null))
  const [policies, setPolicies] = useState(
    /** @type {import('../api/promotionPolicies.js').PromotionPolicyView[] | null} */ (null),
  )
  const [activeNote, setActiveNote] = useState(/** @type {string | null} */ (null))

  const load = useCallback(async () => {
    if (companyId == null) {
      setPolicies(null)
      setError(null)
      setRequestId(null)
      setActiveNote(null)
      return
    }
    setLoading(true)
    setError(null)
    setRequestId(null)
    setActiveNote(null)
    try {
      const list = await promotionPoliciesApi.fetchPoliciesByCompany(
        companyId,
        onlyActive,
      )
      setPolicies(Array.isArray(list) ? list : [])
      try {
        await promotionPoliciesApi.fetchActivePolicy(companyId)
      } catch (e) {
        if (e instanceof ApiError && e.httpStatus === 404) {
          setActiveNote('Отдельный запрос активной политики вернул 404 (возможно, ни одна версия не помечена активной).')
        }
      }
    } catch (e) {
      setPolicies(null)
      if (e instanceof ApiError) {
        setError(e.message)
        setRequestId(e.requestId)
      } else if (e instanceof Error) {
        setError(e.message)
      } else {
        setError('Не удалось загрузить политики')
      }
    } finally {
      setLoading(false)
    }
  }, [companyId, onlyActive])

  useEffect(() => {
    void load()
  }, [load])

  const companyHint =
    source === 'jwt'
      ? 'Компания из JWT'
      : source === 'env'
        ? 'Компания из VITE_DEV_COMPANY_ID'
        : null

  return (
    <article className="page">
      <ol className="page__breadcrumbs">
        <li>
          <Link to="/">Главная</Link>
        </li>
        <li>Политики повышения</li>
      </ol>

      <h1 className="page__title">Политики повышения</h1>
      <p className="page__lead">
        Интервалы между ревью, минимум выполнения ИПР, веса оценок тимлида и менеджера. Список —{' '}
        <code>GET /promotion-policies/companies/&#123;id&#125;</code> с параметром <code>onlyActive</code> (camelCase,
        как в Spring).
      </p>

      {companyId == null ? (
        <div className="entity-zone__error" role="status">
          <strong>Не задана компания.</strong> Нужен JWT с <code>company_id</code> или <code>VITE_DEV_COMPANY_ID</code>.
        </div>
      ) : null}

      {companyId != null ? (
        <div className="entity-zone__toolbar">
          <label className="entity-zone__toggle">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(ev) => setOnlyActive(ev.target.checked)}
            />
            Только активные политики
          </label>
          <span className="entity-zone__hint">
            {companyHint ? (
              <>
                {companyHint}: <strong>{companyId}</strong>
              </>
            ) : (
              <>
                Компания: <strong>{companyId}</strong>
              </>
            )}
          </span>
        </div>
      ) : null}

      {activeNote ? (
        <p className="entity-zone__muted" role="status">
          {activeNote}
        </p>
      ) : null}

      {error ? (
        <div className="entity-zone__error" role="alert">
          {error}
          {requestId ? (
            <>
              {' '}
              <code>(request_id: {requestId})</code>
            </>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <p className="entity-zone__loading">Загрузка…</p>
      ) : null}

      {!loading && companyId != null && policies && policies.length === 0 && !error ? (
        <p className="entity-zone__empty">Политики не найдены.</p>
      ) : null}

      {!loading && policies && policies.length > 0 ? (
        <div className="entity-zone__grid">
          {policies.map((pol) => (
            <article key={pol.id} className="entity-zone__card">
              <div className="entity-zone__card-name">{pol.name}</div>
              <div className="entity-zone__card-code">id #{pol.id}</div>
              <div className="entity-zone__card-meta">
                <span
                  className={
                    pol.is_active
                      ? 'entity-zone__badge entity-zone__badge--active'
                      : 'entity-zone__badge entity-zone__badge--inactive'
                  }
                >
                  {pol.is_active ? 'Активна' : 'Неактивна'}
                </span>
                <span className="entity-zone__badge">
                  с {pol.effective_from}
                  {pol.effective_to ? ` по ${pol.effective_to}` : ''}
                </span>
              </div>
              <p className="entity-zone__card-desc">
                Между ревью: {pol.min_months_between_reviews} мес. · Мин. выполнение ИПР:{' '}
                {displayDecimal(pol.min_completion_percent)}% · Веса: TL {displayDecimal(pol.weight_team_lead)} / M{' '}
                {displayDecimal(pol.weight_manager)}
              </p>
            </article>
          ))}
        </div>
      ) : null}
    </article>
  )
}
