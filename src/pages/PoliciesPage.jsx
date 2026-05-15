import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, promotionPoliciesApi } from '../api/index.js'
import { useAuth } from '../auth/useAuth.js'
import { hasDirectorRole } from '../auth/roleChecks.js'
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
  const { roles } = useAuth()
  const canManage = hasDirectorRole(roles)

  const [activeFilter, setActiveFilter] = useState('active')
  const [nameLike, setNameLike] = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState('')
  const [effectiveTo, setEffectiveTo] = useState('')

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [submitError, setSubmitError] = useState(/** @type {string | null} */ (null))
  const [policies, setPolicies] = useState(
    /** @type {import('../api/promotionPolicies.js').PromotionPolicyView[] | null} */ (null),
  )

  const [createForm, setCreateForm] = useState({
    name: '',
    minMonthsBetweenReviews: 6,
    minCompletionPercent: 70,
    weightTeamLead: 60,
    weightManager: 40,
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: '',
    isActive: true,
  })

  const load = useCallback(async () => {
    if (companyId == null) {
      setPolicies(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const isActive =
        activeFilter === 'active' ? true : activeFilter === 'inactive' ? false : null
      const page = await promotionPoliciesApi.fetchPoliciesRegistry(
        {
          company_id: companyId,
          is_active: isActive,
          effective_from: effectiveFrom || null,
          effective_to: effectiveTo || null,
          name_like: nameLike.trim() || null,
        },
        { size: 100 },
      )
      setPolicies(page.content)
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
  }, [activeFilter, companyId, effectiveFrom, effectiveTo, nameLike])

  useEffect(() => {
    void load()
  }, [load])

  const submitCreate = useCallback(async () => {
    if (companyId == null || !canManage || submitting) {
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      await promotionPoliciesApi.createPolicy(companyId, {
        name: createForm.name.trim(),
        min_months_between_reviews: Number(createForm.minMonthsBetweenReviews),
        min_completion_percent: Number(createForm.minCompletionPercent),
        weight_team_lead: Number(createForm.weightTeamLead),
        weight_manager: Number(createForm.weightManager),
        effective_from: createForm.effectiveFrom || null,
        effective_to: createForm.effectiveTo || null,
        is_active: createForm.isActive,
      })
      await load()
      setCreateForm((prev) => ({ ...prev, name: '' }))
    } catch (e) {
      if (e instanceof ApiError) {
        setSubmitError(e.message)
      } else if (e instanceof Error) {
        setSubmitError(e.message)
      } else {
        setSubmitError('Не удалось создать политику')
      }
    } finally {
      setSubmitting(false)
    }
  }, [canManage, companyId, createForm, load, submitting])

  const togglePolicyActive = useCallback(
    async (policy, nextActive) => {
      if (!canManage || submitting) {
        return
      }
      setSubmitting(true)
      setSubmitError(null)
      try {
        if (nextActive) {
          await promotionPoliciesApi.activatePolicy(policy.id)
        } else {
          await promotionPoliciesApi.deactivatePolicy(policy.id)
        }
        await load()
      } catch (e) {
        if (e instanceof ApiError) {
          setSubmitError(e.message)
        } else if (e instanceof Error) {
          setSubmitError(e.message)
        } else {
          setSubmitError('Не удалось обновить статус политики')
        }
      } finally {
        setSubmitting(false)
      }
    },
    [canManage, load, submitting],
  )

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
        <form
          className="entity-zone__filters"
          onSubmit={(ev) => {
            ev.preventDefault()
            void load()
          }}
        >
          <label className="entity-zone__field">
            <span className="entity-zone__field-label">Поиск по названию</span>
            <input
              className="entity-zone__input"
              value={nameLike}
              onChange={(ev) => setNameLike(ev.target.value)}
              placeholder="Например: Базовая политика"
            />
          </label>
          <label className="entity-zone__field">
            <span className="entity-zone__field-label">Статус</span>
            <select
              className="entity-zone__select"
              value={activeFilter}
              onChange={(ev) => setActiveFilter(ev.target.value)}
            >
              <option value="active">Только активные</option>
              <option value="inactive">Только неактивные</option>
              <option value="all">Все</option>
            </select>
          </label>
          <label className="entity-zone__field">
            <span className="entity-zone__field-label">Действует с</span>
            <input
              className="entity-zone__input"
              type="date"
              value={effectiveFrom}
              onChange={(ev) => setEffectiveFrom(ev.target.value)}
            />
          </label>
          <label className="entity-zone__field">
            <span className="entity-zone__field-label">Действует по</span>
            <input
              className="entity-zone__input"
              type="date"
              value={effectiveTo}
              onChange={(ev) => setEffectiveTo(ev.target.value)}
            />
          </label>
        </form>
      )}

      <div className="entity-zone__actions">
        <button className="entity-zone__button entity-zone__button--primary" type="button" onClick={() => void load()}>
          Применить фильтры
        </button>
      </div>

      {canManage && companyId != null ? (
        <section className="entity-zone__summary">
          <h2 className="entity-zone__summary-title">Новая политика</h2>
          <div className="entity-zone__filters">
            <label className="entity-zone__field entity-zone__field--grow">
              <span className="entity-zone__field-label">Название</span>
              <input
                className="entity-zone__input"
                value={createForm.name}
                onChange={(ev) => setCreateForm((prev) => ({ ...prev, name: ev.target.value }))}
              />
            </label>
            <label className="entity-zone__field">
              <span className="entity-zone__field-label">Интервал ревью (мес.)</span>
              <input
                className="entity-zone__input"
                type="number"
                min={1}
                value={String(createForm.minMonthsBetweenReviews)}
                onChange={(ev) =>
                  setCreateForm((prev) => ({ ...prev, minMonthsBetweenReviews: Number(ev.target.value || 0) }))
                }
              />
            </label>
            <label className="entity-zone__field">
              <span className="entity-zone__field-label">Минимум выполнения ИПР (%)</span>
              <input
                className="entity-zone__input"
                type="number"
                min={0}
                max={100}
                value={String(createForm.minCompletionPercent)}
                onChange={(ev) =>
                  setCreateForm((prev) => ({ ...prev, minCompletionPercent: Number(ev.target.value || 0) }))
                }
              />
            </label>
            <label className="entity-zone__field">
              <span className="entity-zone__field-label">Вес тимлида</span>
              <input
                className="entity-zone__input"
                type="number"
                min={0}
                max={100}
                value={String(createForm.weightTeamLead)}
                onChange={(ev) => setCreateForm((prev) => ({ ...prev, weightTeamLead: Number(ev.target.value || 0) }))}
              />
            </label>
            <label className="entity-zone__field">
              <span className="entity-zone__field-label">Вес менеджера</span>
              <input
                className="entity-zone__input"
                type="number"
                min={0}
                max={100}
                value={String(createForm.weightManager)}
                onChange={(ev) => setCreateForm((prev) => ({ ...prev, weightManager: Number(ev.target.value || 0) }))}
              />
            </label>
            <label className="entity-zone__field">
              <span className="entity-zone__field-label">Действует с</span>
              <input
                className="entity-zone__input"
                type="date"
                value={createForm.effectiveFrom}
                onChange={(ev) => setCreateForm((prev) => ({ ...prev, effectiveFrom: ev.target.value }))}
              />
            </label>
            <label className="entity-zone__field">
              <span className="entity-zone__field-label">Действует по</span>
              <input
                className="entity-zone__input"
                type="date"
                value={createForm.effectiveTo}
                onChange={(ev) => setCreateForm((prev) => ({ ...prev, effectiveTo: ev.target.value }))}
              />
            </label>
            <label className="entity-zone__toggle">
              <input
                type="checkbox"
                checked={createForm.isActive}
                onChange={(ev) => setCreateForm((prev) => ({ ...prev, isActive: ev.target.checked }))}
              />
              Сделать активной сразу
            </label>
          </div>
          <div className="entity-zone__actions">
            <button
              type="button"
              className="entity-zone__button entity-zone__button--primary"
              onClick={() => void submitCreate()}
              disabled={submitting || createForm.name.trim() === ''}
            >
              Создать политику
            </button>
          </div>
        </section>
      ) : null}

      {submitError ? (
        <div className="entity-zone__error" role="alert">
          {submitError}
        </div>
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
        <div className="entity-zone__grid entity-zone__grid--idp">
          {policies.map((pol) => (
            <article key={pol.id} className="entity-zone__card entity-zone__card--panel">
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
                Интервал между ревью: {pol.min_months_between_reviews} мес.
              </p>
              <p className="entity-zone__card-desc entity-zone__task-stats">
                Минимум выполнения ИПР: {displayDecimal(pol.min_completion_percent)}%
              </p>
              <p className="entity-zone__card-desc entity-zone__task-stats">
                Тимлид {displayDecimal(pol.weight_team_lead)}% / Директор отдела {displayDecimal(pol.weight_manager)}%
              </p>
              {canManage ? (
                <div className="entity-zone__actions entity-zone__actions--tight">
                  {pol.is_active ? (
                    <button
                      type="button"
                      className="entity-zone__button"
                      disabled={submitting}
                      onClick={() => void togglePolicyActive(pol, false)}
                    >
                      Деактивировать
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="entity-zone__button entity-zone__button--primary"
                      disabled={submitting}
                      onClick={() => void togglePolicyActive(pol, true)}
                    >
                      Активировать
                    </button>
                  )}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </article>
  )
}
