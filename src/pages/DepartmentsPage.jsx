import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, departmentsApi, employeesApi } from '../api/index.js'
import { useAuth } from '../auth/useAuth.js'
import { resolveCompanyId } from '../config/companyContext.js'
import { InlineAlert } from '../components/ui/Alert.jsx'
import { useDisplayWhileRefreshing } from '../hooks/useDisplayWhileRefreshing.js'
import { cn } from '../lib/utils.js'
import './pages.css'
import './EntityZone.css'

export function DepartmentsPage() {
  const { companyId } = resolveCompanyId()
  const { employeeIdFromJwt } = useAuth()
  const [onlyActive, setOnlyActive] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [items, setItems] = useState(null)
  const [myDepartmentId, setMyDepartmentId] = useState(/** @type {number | null} */ (null))
  const [employeeNamesById, setEmployeeNamesById] = useState(() => new Map())

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

  useEffect(() => {
    if (companyId == null) {
      setEmployeeNamesById(new Map())
      return
    }

    let cancelled = false
    employeesApi
      .fetchEmployeesByCompany(companyId)
      .then((employees) => {
        if (cancelled) {
          return
        }
        const map = new Map()
        if (Array.isArray(employees)) {
          for (const employee of employees) {
            const id = Number(employee?.id)
            const fullName = String(employee?.full_name ?? '').trim()
            if (Number.isFinite(id) && id > 0 && fullName) {
              map.set(Math.trunc(id), fullName)
            }
          }
        }
        setEmployeeNamesById(map)
      })
      .catch(() => {
        if (!cancelled) {
          setEmployeeNamesById(new Map())
        }
      })

    return () => {
      cancelled = true
    }
  }, [companyId])

  useEffect(() => {
    if (employeeIdFromJwt == null) {
      setMyDepartmentId(null)
      return
    }

    let cancelled = false
    employeesApi
      .fetchEmployeeById(employeeIdFromJwt)
      .then((employee) => {
        if (cancelled) {
          return
        }
        const departmentId = Number(employee?.department_id)
        setMyDepartmentId(Number.isFinite(departmentId) && departmentId > 0 ? Math.trunc(departmentId) : null)
      })
      .catch(() => {
        if (!cancelled) {
          setMyDepartmentId(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [employeeIdFromJwt])

  /**
   * @param {import('../api/departments.js').DepartmentView} department
   * @returns {number | null}
   */
  function resolveEmployeeCount(department) {
    const candidates = [
      department.employee_count,
      department.employees_count,
      department.employee_total,
      department.employees_total,
      department.staff_count,
    ]
    for (const value of candidates) {
      const count = Number(value)
      if (Number.isFinite(count) && count >= 0) {
        return Math.trunc(count)
      }
    }
    return null
  }

  const { displayData: displayItems, showBlockingSpinner, isRefreshing } = useDisplayWhileRefreshing(items, loading)

  return (
    <article className="page">
      <ol className="page__breadcrumbs">
        <li>
          <Link to="/">Главная</Link>
        </li>
        <li>Отделы</li>
      </ol>

      <h1 className="page__title">Отделы</h1>

      {companyId == null ? (
        <InlineAlert variant="warning" role="status">
          Не удалось определить компанию для загрузки отделов. Обновите страницу или войдите заново.
        </InlineAlert>
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

      {error ? <InlineAlert variant="error">{error}</InlineAlert> : null}

      {showBlockingSpinner ? <p className="entity-zone__loading">Загрузка...</p> : null}

      {companyId != null && displayItems && displayItems.length === 0 && !error && !showBlockingSpinner ? (
        <p className="entity-zone__empty">Отделы не найдены.</p>
      ) : null}

      {displayItems && displayItems.length > 0 ? (
        <div
          className={cn(
            'entity-zone__results-surface',
            isRefreshing && 'entity-zone__results-surface--refreshing',
          )}
          aria-busy={isRefreshing || undefined}
        >
          <div className="entity-zone__grid entity-zone__grid--idp">
          {displayItems.map((d) => {
            const employeesCount = resolveEmployeeCount(d)
            const directorId = Number(d.director_employee_id)
            const directorNameFromDepartment = String(d.director_employee_full_name ?? d.director_full_name ?? '').trim()
            const directorName =
              directorNameFromDepartment ||
              (Number.isFinite(directorId) && directorId > 0
                ? employeeNamesById.get(Math.trunc(directorId)) ?? null
                : null)

            return (
              <article key={d.id} className="entity-zone__card entity-zone__card--panel">
                <div className="entity-zone__card-name">{d.name}</div>
                <div className="entity-zone__card-meta">
                  <span className="entity-zone__badge">Сотрудников: {employeesCount != null ? employeesCount : '—'}</span>
                  <span
                    className={
                      d.is_active
                        ? 'entity-zone__badge entity-zone__badge--active'
                        : 'entity-zone__badge entity-zone__badge--inactive'
                    }
                  >
                    {d.is_active ? 'Активен' : 'Неактивен'}
                  </span>
                  {myDepartmentId != null && d.id === myDepartmentId ? (
                    <span className="entity-zone__badge entity-zone__badge--self">Ваш отдел</span>
                  ) : null}
                </div>
                {directorName ? <div className="entity-zone__card-desc">Директор: {directorName}</div> : null}
              </article>
            )
          })}
          </div>
        </div>
      ) : null}
    </article>
  )
}
