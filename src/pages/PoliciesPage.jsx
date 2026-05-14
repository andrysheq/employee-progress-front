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
  const { companyId } = resolveCompanyId()
  const [onlyActive, setOnlyActive] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [policies, setPolicies] = useState(
    /** @type {import('../api/promotionPolicies.js').PromotionPolicyView[] | null} */ (null),
  )
  const [activeNote, setActiveNote] = useState(/** @type {string | null} */ (null))

  const load = useCallback(async () => {
    if (companyId == null) {
      setPolicies(null)
      setError(null)
      setActiveNote(null)
      return
    }
    setLoading(true)
    setError(null)
    setActiveNote(null)
    try {
      const list = await promotionPoliciesApi.fetchPoliciesByCompany(companyId, onlyActive)
      setPolicies(Array.isArray(list) ? list : [])
      try {
        await promotionPoliciesApi.fetchActivePolicy(companyId)
      } catch (e) {
        if (e instanceof ApiError && e.httpStatus === 404) {
          setActiveNote('Сейчас активная версия политики не отмечена.')
        }
      }
    } catch (e) {
      setPolicies(null)
      if (e instanceof ApiError) {
        setError(e.message)
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

  return (
    <article className="page">
      <ol className="page__breadcrumbs">
        <li>
          <Link to="/">Главная</Link>
        </li>
        <li>Политики повышения</li>
      </ol>

      <h1 className="page__title">Политики повышения</h1>
      <p className="page__lead">Правила, по которым оценивается готовность к повышению.</p>

      {companyId == null ? (
        <div className="entity-zone__error" role="status">
          Не удалось определить компанию для загрузки политик. Обновите страницу или войдите заново.
        </div>
      ) : (
        <div className="entity-zone__toolbar">
          <label className="entity-zone__toggle">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(ev) => setOnlyActive(ev.target.checked)}
            />
            Только активные политики
          </label>
        </div>
      )}

      {activeNote ? (
        <p className="entity-zone__muted" role="status">
          {activeNote}
        </p>
      ) : null}

      {error ? (
        <div className="entity-zone__error" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? <p className="entity-zone__loading">Загрузка…</p> : null}

      {!loading && companyId != null && policies && policies.length === 0 && !error ? (
        <p className="entity-zone__empty">Политики не найдены.</p>
      ) : null}

      {!loading && policies && policies.length > 0 ? (
        <div className="entity-zone__grid">
          {policies.map((pol) => (
            <article key={pol.id} className="entity-zone__card">
              <div className="entity-zone__card-name">{pol.name}</div>
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
                Интервал между ревью: {pol.min_months_between_reviews} мес. · Минимум выполнения ИПР:{' '}
                {displayDecimal(pol.min_completion_percent)}% · Веса: тимлид {displayDecimal(pol.weight_team_lead)} /
                менеджер {displayDecimal(pol.weight_manager)}
              </p>
            </article>
          ))}
        </div>
      ) : null}
    </article>
  )
}
