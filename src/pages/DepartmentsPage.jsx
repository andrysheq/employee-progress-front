import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, departmentsApi } from '../api/index.js'
import { resolveCompanyId } from '../config/companyContext.js'
import './pages.css'
import './EntityZone.css'

export function DepartmentsPage() {
  const { companyId } = resolveCompanyId()
  const [onlyActive, setOnlyActive] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [items, setItems] = useState(null)

  const load = useCallback(async () => {
    if (companyId == null) {
      setItems(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const list = await departmentsApi.fetchDepartmentsByCompany(companyId, onlyActive)
      setItems(Array.isArray(list) ? list : [])
    } catch (e) {
      setItems(null)
      if (e instanceof ApiError) {
        setError(e.message)
      } else if (e instanceof Error) {
        setError(e.message)
      } else {
        setError('Не удалось загрузить отделы')
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
        <li>Отделы</li>
      </ol>

      <h1 className="page__title">Отделы</h1>
      <p className="page__lead">Здесь отображаются отделы вашей компании.</p>

      {companyId == null ? (
        <div className="entity-zone__error" role="status">
          Не удалось определить компанию для загрузки отделов. Обновите страницу или войдите заново.
        </div>
      ) : (
        <div className="entity-zone__toolbar">
          <label className="entity-zone__toggle">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(ev) => setOnlyActive(ev.target.checked)}
            />
            Только активные отделы
          </label>
        </div>
      )}

      {error ? (
        <div className="entity-zone__error" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? <p className="entity-zone__loading">Загрузка…</p> : null}

      {!loading && companyId != null && items && items.length === 0 ? (
        <p className="entity-zone__empty">Отделы не найдены.</p>
      ) : null}

      {!loading && items && items.length > 0 ? (
        <div className="entity-zone__grid">
          {items.map((d) => (
            <article key={d.id} className="entity-zone__card">
              <div className="entity-zone__card-name">{d.name}</div>
              <div className="entity-zone__card-code">{d.code}</div>
              {d.description ? <p className="entity-zone__card-desc">{d.description}</p> : null}
              <div className="entity-zone__card-meta">
                <span
                  className={
                    d.is_active
                      ? 'entity-zone__badge entity-zone__badge--active'
                      : 'entity-zone__badge entity-zone__badge--inactive'
                  }
                >
                  {d.is_active ? 'Активен' : 'Неактивен'}
                </span>
                <span className="entity-zone__badge">
                  {d.director_employee_id != null ? 'Директор назначен' : 'Директор не назначен'}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </article>
  )
}
