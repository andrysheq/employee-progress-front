import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, departmentsApi } from '../api/index.js'
import { resolveCompanyId } from '../config/companyContext.js'
import './pages.css'
import './EntityZone.css'

export function DepartmentsPage() {
  const { companyId, source } = resolveCompanyId()

  const [onlyActive, setOnlyActive] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [requestId, setRequestId] = useState(/** @type {string | null} */ (null))
  const [items, setItems] = useState(null)

  const load = useCallback(async () => {
    if (companyId == null) {
      setItems(null)
      setError(null)
      setRequestId(null)
      return
    }
    setLoading(true)
    setError(null)
    setRequestId(null)
    try {
      const list = await departmentsApi.fetchDepartmentsByCompany(
        companyId,
        onlyActive,
      )
      setItems(Array.isArray(list) ? list : [])
    } catch (e) {
      setItems(null)
      if (e instanceof ApiError) {
        setError(e.message)
        setRequestId(e.requestId)
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
        <li>Отделы</li>
      </ol>

      <h1 className="page__title">Отделы</h1>
      <p className="page__lead">
        Список отделов компании. Создание и назначение директора доступны по API роли «Генеральный директор»;
        чтение списка — всем выданным ролям с грантом{' '}
        <code>READ_COMPANY_DEPARTMENTS</code>.
      </p>

      {companyId == null ? (
        <div className="entity-zone__error" role="status">
          <strong>Не задана компания.</strong> Войдите и положите access token в{' '}
          <code>sessionStorage</code> (ключ <code>ep_access_token</code>), чтобы в JWT был claim{' '}
          <code>company_id</code> (имя настраивается в <code>VITE_JWT_COMPANY_CLAIM</code>), либо для чисто
          локальной вёрстки задайте в <code>.env</code> строку <code>VITE_DEV_COMPANY_ID=&#123;id из БД&#125;</code>{' '}
          и перезапустите <code>npm run dev</code>. Пример — в <code>.env.example</code>.
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
            Только активные отделы
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

      {!loading && companyId != null && items && items.length === 0 ? (
        <p className="entity-zone__empty">Отделы не найдены.</p>
      ) : null}

      {!loading && items && items.length > 0 ? (
        <div className="entity-zone__grid">
          {items.map((d) => (
            <article key={d.id} className="entity-zone__card">
              <div className="entity-zone__card-name">{d.name}</div>
              <div className="entity-zone__card-code">{d.code}</div>
              {d.description ? (
                <p className="entity-zone__card-desc">{d.description}</p>
              ) : null}
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
                {d.director_employee_id != null ? (
                  <span className="entity-zone__badge">
                    Директор: #{d.director_employee_id}
                  </span>
                ) : (
                  <span className="entity-zone__badge">Директор не назначен</span>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </article>
  )
}
