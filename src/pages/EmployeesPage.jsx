import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, employeesApi } from '../api/index.js'
import { resolveCompanyId } from '../config/companyContext.js'
import './pages.css'
import './EntityZone.css'

export function EmployeesPage() {
  const { companyId } = resolveCompanyId()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [employees, setEmployees] = useState(
    /** @type {import('../api/employees.js').EmployeeView[] | null} */ (null),
  )
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(/** @type {number | null} */ (null))
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState(/** @type {string | null} */ (null))
  const [details, setDetails] = useState(
    /** @type {{ employee: import('../api/employees.js').EmployeeView, currentGrade: import('../api/employees.js').EmployeeGradeView | null, gradeHistory: import('../api/employees.js').EmployeeGradeView[] } | null} */ (null),
  )

  const loadEmployees = useCallback(async () => {
    if (companyId == null) {
      setEmployees(null)
      setError(null)
      setSelectedEmployeeId(null)
      setDetails(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const list = await employeesApi.fetchEmployeesByCompany(companyId)
      setEmployees(Array.isArray(list) ? list : [])
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
  }, [companyId])

  const loadEmployeeDetails = useCallback(async (employeeId) => {
    setSelectedEmployeeId(employeeId)
    setDetailsLoading(true)
    setDetailsError(null)
    try {
      const employee = await employeesApi.fetchEmployeeById(employeeId)
      const [currentGradeResult, gradeHistoryResult] = await Promise.allSettled([
        employeesApi.fetchEmployeeCurrentGrade(employeeId),
        employeesApi.fetchEmployeeGradeHistory(employeeId),
      ])
      const currentGrade =
        currentGradeResult.status === 'fulfilled' ? currentGradeResult.value : null
      const gradeHistory =
        gradeHistoryResult.status === 'fulfilled' && Array.isArray(gradeHistoryResult.value)
          ? gradeHistoryResult.value
          : []
      setDetails({
        employee,
        currentGrade,
        gradeHistory,
      })
    } catch (e) {
      setDetails(null)
      if (e instanceof ApiError) {
        setDetailsError(e.message)
      } else if (e instanceof Error) {
        setDetailsError(e.message)
      } else {
        setDetailsError('Не удалось загрузить детальные данные сотрудника')
      }
    } finally {
      setDetailsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadEmployees()
  }, [loadEmployees])

  useEffect(() => {
    if (!employees || employees.length === 0) {
      setSelectedEmployeeId(null)
      setDetails(null)
      setDetailsError(null)
      setDetailsLoading(false)
      return
    }
    const firstEmployeeId = Number(employees[0]?.id)
    if (!Number.isFinite(firstEmployeeId) || firstEmployeeId <= 0) {
      return
    }
    if (selectedEmployeeId == null) {
      void loadEmployeeDetails(Math.trunc(firstEmployeeId))
    }
  }, [employees, selectedEmployeeId, loadEmployeeDetails])

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
      ) : null}

      {error ? (
        <div className="entity-zone__error" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? <p className="entity-zone__loading">Загрузка…</p> : null}

      {!loading && companyId != null && employees && employees.length === 0 ? (
        <p className="entity-zone__empty">Сотрудники не найдены.</p>
      ) : null}

      {!loading && employees && employees.length > 0 ? (
        <>
          <p className="entity-zone__muted">Нажмите на карточку сотрудника, чтобы посмотреть детальные данные.</p>
          <div className="entity-zone__grid">
            {employees.map((employee) => {
              const isSelected = selectedEmployeeId === employee.id
              return (
                <article
                  key={employee.id}
                  className={`entity-zone__card entity-zone__card--panel ${isSelected ? 'entity-zone__card--selected' : ''}`}
                >
                  <button
                    type="button"
                    className="entity-zone__card-select"
                    onClick={() => void loadEmployeeDetails(employee.id)}
                  >
                    <div className="entity-zone__card-name">{employee.full_name}</div>
                    <div className="entity-zone__card-code">{employee.email}</div>
                    <div className="entity-zone__card-meta">
                      <span className="entity-zone__badge">ID: {employee.id}</span>
                      <span className="entity-zone__badge">Отдел: {employee.department_id}</span>
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
              )
            })}
          </div>
        </>
      ) : null}

      {selectedEmployeeId != null ? (
        <section className="entity-zone__summary">
          <h2 className="entity-zone__summary-title">Детальная карточка сотрудника</h2>

          {detailsError ? (
            <div className="entity-zone__error" role="alert">
              {detailsError}
            </div>
          ) : null}

          {detailsLoading ? <p className="entity-zone__loading">Загрузка детальных данных…</p> : null}

          {!detailsLoading && details ? (
            <>
              <div className="entity-zone__grades-table">
                <div className="entity-zone__grades-row">
                  <span>ФИО</span>
                  <span>{details.employee.full_name}</span>
                  <span />
                </div>
                <div className="entity-zone__grades-row">
                  <span>E-mail</span>
                  <span>{details.employee.email}</span>
                  <span />
                </div>
                <div className="entity-zone__grades-row">
                  <span>Компания / отдел</span>
                  <span>
                    {details.employee.company_id} / {details.employee.department_id}
                  </span>
                  <span />
                </div>
                <div className="entity-zone__grades-row">
                  <span>Дата найма</span>
                  <span>{formatDate(details.employee.hired_at)}</span>
                  <span />
                </div>
              </div>

              <div className="entity-zone__matrix-block">
                <h3 className="entity-zone__matrix-block-title">Текущий грейд</h3>
                {details.currentGrade ? (
                  <div className="entity-zone__grades-table">
                    <div className="entity-zone__grades-row">
                      <span>Грейд</span>
                      <span>
                        {details.currentGrade.grade_code} — {details.currentGrade.grade_name}
                      </span>
                      <span />
                    </div>
                    <div className="entity-zone__grades-row">
                      <span>Уровень</span>
                      <span>{details.currentGrade.grade_level_order}</span>
                      <span />
                    </div>
                    <div className="entity-zone__grades-row">
                      <span>Действует с</span>
                      <span>{formatDate(details.currentGrade.start_date)}</span>
                      <span />
                    </div>
                    <div className="entity-zone__grades-row">
                      <span>Кто назначил</span>
                      <span>{details.currentGrade.changed_by_employee_full_name}</span>
                      <span />
                    </div>
                  </div>
                ) : (
                  <p className="entity-zone__muted">Текущий грейд не найден или недоступен по правам.</p>
                )}
              </div>

              <div className="entity-zone__matrix-block">
                <h3 className="entity-zone__matrix-block-title">История грейдов</h3>
                {details.gradeHistory.length > 0 ? (
                  <div className="entity-zone__grades-table">
                    {details.gradeHistory.map((row) => (
                      <div key={row.employee_grade_id} className="entity-zone__grades-row">
                        <span>
                          {row.grade_code} — {row.grade_name}
                        </span>
                        <span>
                          {formatDate(row.start_date)} — {formatDate(row.end_date)}
                        </span>
                        <span>Уровень {row.grade_level_order}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="entity-zone__muted">История грейдов отсутствует.</p>
                )}
              </div>
            </>
          ) : null}
        </section>
      ) : null}
    </article>
  )
}

/**
 * @param {string | null | undefined} value
 * @returns {string}
 */
function formatDate(value) {
  if (!value) {
    return '—'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }
  return date.toLocaleDateString('ru-RU')
}
