import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, departmentsApi, employeesApi } from '../api/index.js'
import { resolveCompanyId } from '../config/companyContext.js'
import { InlineAlert } from '../components/ui/Alert.jsx'
import { useDisplayWhileRefreshing } from '../hooks/useDisplayWhileRefreshing.js'
import { cn } from '../lib/utils.js'
import './pages.css'
import './EntityZone.css'

export function EmployeeDetailsPage() {
  const { companyId } = resolveCompanyId()
  const { employeeId: employeeIdParam } = useParams()
  const employeeId = Number(employeeIdParam)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [details, setDetails] = useState(
    /** @type {{ employee: import('../api/employees.js').EmployeeView, currentGrade: import('../api/employees.js').EmployeeGradeView | null, gradeHistory: import('../api/employees.js').EmployeeGradeView[], gradeHistoryForbidden?: boolean } | null} */ (null),
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
      const [employee, currentGradeResult, depts] = await Promise.all([
        employeesApi.fetchEmployeeById(employeeId),
        employeesApi.fetchEmployeeCurrentGrade(employeeId).catch(() => null),
        departmentsApi.fetchDepartmentsByCompany(companyId, false).catch(() => []),
      ])

      let gradeHistoryResult = /** @type {import('../api/employees.js').EmployeeGradeView[]} */ ([])
      let gradeHistoryForbidden = false
      try {
        gradeHistoryResult = await employeesApi.fetchEmployeeGradeHistory(employeeId)
      } catch (e) {
        if (e instanceof ApiError && e.httpStatus === 403) {
          gradeHistoryForbidden = true
        }
      }

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
        gradeHistoryForbidden,
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

  const { displayData: displayDetails, showBlockingSpinner, isRefreshing } = useDisplayWhileRefreshing(details, loading)

  return (
    <article className="page">
      <ol className="page__breadcrumbs">
        <li>
          <Link to="/">Главная</Link>
        </li>
        <li>
          <Link to="/employees">Сотрудники</Link>
        </li>
        <li>{displayDetails?.employee?.full_name ?? details?.employee?.full_name ?? 'Профиль'}</li>
      </ol>

      <h1 className="page__title">Профиль сотрудника</h1>

      {error ? <InlineAlert variant="error">{error}</InlineAlert> : null}

      {showBlockingSpinner ? <p className="entity-zone__loading">Загрузка...</p> : null}

      {displayDetails ? (
        <div
          className={cn(
            'entity-zone__results-surface',
            isRefreshing && 'entity-zone__results-surface--refreshing',
          )}
          aria-busy={isRefreshing || undefined}
        >
        <section className="entity-zone__summary">
          <div className="entity-zone__grades-table">
            <div className="entity-zone__grades-row">
              <span>ФИО</span>
              <span>{displayDetails.employee.full_name}</span>
              <span />
            </div>
            <div className="entity-zone__grades-row">
              <span>E-mail</span>
              <span>{displayDetails.employee.email}</span>
              <span />
            </div>
            <div className="entity-zone__grades-row">
              <span>Отдел</span>
              <span>{departmentLabel(departmentNames, displayDetails.employee.department_id)}</span>
              <span />
            </div>
            <div className="entity-zone__grades-row">
              <span>Дата найма</span>
              <span>{formatDate(displayDetails.employee.hired_at)}</span>
              <span />
            </div>
            {displayDetails.employee.current_salary_redacted !== true ? (
              <div className="entity-zone__grades-row">
                <span>Оклад (₽/мес.)</span>
                <span>
                  {displayDetails.employee.current_salary_rub_month != null &&
                  displayDetails.employee.current_salary_rub_month !== ''
                    ? Number(displayDetails.employee.current_salary_rub_month).toLocaleString('ru-RU')
                    : '—'}
                </span>
                <span />
              </div>
            ) : null}
          </div>

          <div className="entity-zone__matrix-block">
            <h3 className="entity-zone__matrix-block-title">Текущий грейд</h3>
            {displayDetails.currentGrade ? (
              <div className="entity-zone__grades-table">
                <div className="entity-zone__grades-row">
                  <span>Грейд</span>
                  <span>{displayDetails.currentGrade.grade_name}</span>
                  <span />
                </div>
                <div className="entity-zone__grades-row">
                  <span>Уровень</span>
                  <span>{displayDetails.currentGrade.grade_level_order}</span>
                  <span />
                </div>
                <div className="entity-zone__grades-row">
                  <span>Действует с</span>
                  <span>{formatDate(displayDetails.currentGrade.start_date)}</span>
                  <span />
                </div>
                <div className="entity-zone__grades-row">
                  <span>Кто назначил</span>
                  <span>{displayDetails.currentGrade.changed_by_employee_full_name}</span>
                  <span />
                </div>
              </div>
            ) : (
              <p className="entity-zone__muted">Текущий грейд не найден</p>
            )}
          </div>

          {!displayDetails.gradeHistoryForbidden ? (
            <div className="entity-zone__matrix-block">
              <h3 className="entity-zone__matrix-block-title">История грейдов</h3>
              {displayDetails.gradeHistory.length > 0 ? (
                <div className="entity-zone__grades-table">
                  {displayDetails.gradeHistory.map((row) => (
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
          ) : null}
        </section>
        </div>
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
