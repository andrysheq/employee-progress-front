import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, developmentPlansApi } from '../api/index.js'
import { getEffectiveEmployeeId, resolveCompanyId } from '../config/companyContext.js'
import './pages.css'
import './EntityZone.css'

export function DevelopmentPlansPage() {
  const { companyId } = resolveCompanyId()
  const employeeId = getEffectiveEmployeeId()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [plans, setPlans] = useState(
    /** @type {import('../api/developmentPlans.js').DevelopmentPlanView[] | null} */ (null),
  )

  const load = useCallback(async () => {
    if (employeeId == null) {
      setPlans(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const list = await developmentPlansApi.fetchEmployeePlans(employeeId)
      setPlans(Array.isArray(list) ? list : [])
    } catch (e) {
      setPlans(null)
      if (e instanceof ApiError) {
        setError(e.message)
      } else if (e instanceof Error) {
        setError(e.message)
      } else {
        setError('Не удалось загрузить ИПР')
      }
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <article className="page">
      <ol className="page__breadcrumbs">
        <li>
          <Link to="/">Главная</Link>
        </li>
        <li>ИПР</li>
      </ol>

      <h1 className="page__title">Индивидуальные планы развития</h1>
      <p className="page__lead">Ваши планы развития, сроки и текущий статус выполнения.</p>

      {companyId == null ? (
        <p className="entity-zone__hint">Компания не определена.</p>
      ) : null}

      {employeeId == null ? (
        <div className="entity-zone__error" role="status">
          Не удалось определить сотрудника. Обновите страницу или войдите заново.
        </div>
      ) : null}

      {error ? (
        <div className="entity-zone__error" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? <p className="entity-zone__loading">Загрузка…</p> : null}

      {!loading && employeeId != null && plans && plans.length === 0 && !error ? (
        <p className="entity-zone__empty">ИПР для этого сотрудника не найдены.</p>
      ) : null}

      {!loading && plans && plans.length > 0 ? (
        <div className="entity-zone__grid">
          {plans.map((plan) => (
            <article key={plan.id} className="entity-zone__card">
              <div className="entity-zone__card-name">{plan.status}</div>
              <div className="entity-zone__card-code">
                {plan.period_start} — {plan.period_end}
              </div>
              <div className="entity-zone__card-meta">
                <span className="entity-zone__badge">Задач: {Array.isArray(plan.tasks) ? plan.tasks.length : 0}</span>
                {plan.target_grade_id != null ? (
                  <span className="entity-zone__badge">Целевой грейд определён</span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </article>
  )
}
