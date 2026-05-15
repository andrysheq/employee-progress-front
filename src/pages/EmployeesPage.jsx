import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, departmentsApi, employeesApi } from '../api/index.js'
import { resolveCompanyId } from '../config/companyContext.js'
import './pages.css'
import './EntityZone.css'

export function EmployeesPage() {
  const { companyId } = resolveCompanyId()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [employees, setEmployees] = useState(
    /** @type {import('../api/employees.js').EmployeeView[] | null} */ (null),
  )
  const [departmentNames, setDepartmentNames] = useState(
    /** @type {Map<number, string>} */ (new Map()),
  )
  const [fullNameLike, setFullNameLike] = useState('')

  const normalizedFullNameLike = useMemo(() => fullNameLike.trim(), [fullNameLike])

  const loadEmployees = useCallback(async () => {
    if (companyId == null) {
      setEmployees(null)
      setError(null)
      setDepartmentNames(new Map())
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [registryPage, depts] = await Promise.all([
        employeesApi.fetchEmployeesRegistry(
          {
            company_id: companyId,
            full_name_like: normalizedFullNameLike || null,
          },
          {
            page: 0,
            size: 200,
            sort: 'fullName,asc',
          },
        ),
        departmentsApi.fetchDepartmentsByCompany(companyId, false).catch(() => []),
      ])

      const list = Array.isArray(registryPage?.content) ? registryPage.content : []
      const nextDeptNames = new Map()
      if (Array.isArray(depts)) {
        for (const d of depts) {
          const id = Number(d?.id)
          if (Number.isFinite(id) && id > 0 && typeof d?.name === 'string' && d.name.trim() !== '') {
            nextDeptNames.set(Math.trunc(id), d.name.trim())
          }
        }
      }
      setDepartmentNames(nextDeptNames)
      setEmployees(list)
    } catch (e) {
      setEmployees(null)
      if (e instanceof ApiError) {
        setError(e.message)
      } else if (e instanceof Error) {
        setError(e.message)
      } else {
        setError('Не удалось загрузить список сотрудников')
      }
    } finally {
      setLoading(false)
    }
  }, [companyId, normalizedFullNameLike])

  useEffect(() => {
    void loadEmployees()
  }, [loadEmployees])

  return (
    <article className="page">
      <ol className="page__breadcrumbs">
        <li>
          <Link to="/">Главная</Link>
        </li>
        <li>Сотрудники</li>
      </ol>

      <h1 className="page__title">Сотрудники</h1>
      <p className="page__lead">Раздел для работы с профилями сотрудников и их карьерным треком.</p>

      {companyId == null ? (
        <div className="entity-zone__error" role="status">
          Не удалось определить компанию для загрузки сотрудников. Обновите страницу или войдите заново.
        </div>
      ) : (
        <div className="entity-zone__toolbar">
          <label className="entity-zone__field entity-zone__field--grow">
            <span className="entity-zone__field-label">Поиск по ФИО</span>
            <input
              className="entity-zone__input"
              type="text"
              placeholder="Например: Иванов"
              value={fullNameLike}
              onChange={(ev) => setFullNameLike(ev.target.value)}
            />
          </label>
        </div>
      )}

      {error ? (
        <div className="entity-zone__error" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? <p className="entity-zone__loading">Загрузка...</p> : null}

      {!loading && companyId != null && employees && employees.length === 0 ? (
        <p className="entity-zone__empty">Сотрудники не найдены.</p>
      ) : null}

      {!loading && employees && employees.length > 0 ? (
        <>
          <p className="entity-zone__muted">Нажмите на карточку, чтобы открыть профиль сотрудника.</p>
          <div className="entity-zone__grid entity-zone__grid--employees">
            {employees.map((employee) => (
              <article key={employee.id} className="entity-zone__card entity-zone__card--panel">
                <button
                  type="button"
                  className="entity-zone__card-select"
                  onClick={() => navigate(`/employees/${employee.id}`)}
                >
                  <div className="entity-zone__card-name">{employee.full_name}</div>
                  <div className="entity-zone__card-code">{employee.email}</div>
                  <div className="entity-zone__card-meta">
                    <span className="entity-zone__badge">
                      Отдел: {departmentLabel(departmentNames, employee.department_id)}
                    </span>
                    <span
                      className={
                        employee.is_active
                          ? 'entity-zone__badge entity-zone__badge--active'
                          : 'entity-zone__badge entity-zone__badge--inactive'
                      }
                    >
                      {employee.is_active ? 'Активен' : 'Неактивен'}
                    </span>
                  </div>
                </button>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </article>
  )
}

/**
 * @param {Map<number, string>} departmentNames
 * @param {number} departmentId
 */
function departmentLabel(departmentNames, departmentId) {
  const id = Math.trunc(Number(departmentId))
  if (!Number.isFinite(id) || id <= 0) {
    return '—'
  }
  return departmentNames.get(id) ?? '—'
}
