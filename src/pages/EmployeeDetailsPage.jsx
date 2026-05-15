import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, departmentsApi, employeesApi } from '../api/index.js'
import { resolveCompanyId } from '../config/companyContext.js'
import './pages.css'
import './EntityZone.css'

export function EmployeeDetailsPage() {
  const { companyId } = resolveCompanyId()
  const { employeeId: employeeIdParam } = useParams()
  const employeeId = Number(employeeIdParam)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [details, setDetails] = useState(
    /** @type {{ employee: import('../api/employees.js').EmployeeView, currentGrade: import('../api/employees.js').EmployeeGradeView | null, gradeHistory: import('../api/employees.js').EmployeeGradeView[] } | null} */ (null),
  )
  const [departmentNames, setDepartmentNames] = useState(
    /** @type {Map<number, string>} */ (new Map()),
  )

  const loadDetails = useCallback(async () => {
    if (companyId == null || !Number.isInteger(employeeId) || employeeId <= 0) {
      setDetails(null)
      setError('Некорректный идентификатор сотрудника.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const [employee, currentGradeResult, gradeHistoryResult, depts] = await Promise.all([
        employeesApi.fetchEmployeeById(employeeId),
        employeesApi.fetchEmployeeCurrentGrade(employeeId).catch(() => null),
        employeesApi.fetchEmployeeGradeHistory(employeeId).catch(() => []),
        departmentsApi.fetchDepartmentsByCompany(companyId, false).catch(() => []),
      ])

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

      setDetails({
        employee,
        currentGrade: currentGradeResult,
        gradeHistory: Array.isArray(gradeHistoryResult) ? gradeHistoryResult : [],
      })
    } catch (e) {
      setDetails(null)
      if (e instanceof ApiError) {
        setError(e.message)
      } else if (e instanceof Error) {
        setError(e.message)
      } else {
        setError('Не удалось загрузить данные сотрудника')
      }
    } finally {
      setLoading(false)
    }
  }, [companyId, employeeId])

  useEffect(() => {
    void loadDetails()
  }, [loadDetails])

  return (
    <article className="page">
      <ol className="page__breadcrumbs">
        <li>
          <Link to="/">Главная</Link>
        </li>
        <li>
          <Link to="/employees">Сотрудники</Link>
        </li>
        <li>{details?.employee?.full_name ?? 'Профиль'}</li>
      </ol>

      <h1 className="page__title">Профиль сотрудника</h1>

      {error ? (
        <div className="entity-zone__error" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? <p className="entity-zone__loading">Загрузка...</p> : null}

      {!loading && details ? (
        <section className="entity-zone__summary">
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
              <span>Отдел</span>
              <span>{departmentLabel(departmentNames, details.employee.department_id)}</span>
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
                  <span>{details.currentGrade.grade_name}</span>
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
                    <span>{row.grade_name}</span>
                    <span>
                      {formatDate(row.start_date)} - {formatDate(row.end_date)}
                    </span>
                    <span>Уровень {row.grade_level_order}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="entity-zone__muted">История грейдов отсутствует.</p>
            )}
          </div>
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
