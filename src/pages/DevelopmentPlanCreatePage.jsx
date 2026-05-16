import { useCallback, useEffect, useMemo, useState } from 'react'
import { TrashIcon } from '@radix-ui/react-icons'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, departmentsApi, developmentPlansApi, employeesApi, gradeModelApi } from '../api/index.js'
import { useAuth } from '../auth/useAuth.js'
import { hasTeamLeadRole } from '../auth/roleChecks.js'
import { resolveCompanyId } from '../config/companyContext.js'
import { idpTaskDraftToApiPayload, newIdpTaskDraft } from '../utils/idpTaskDraft.js'
import { IDP_TASK_PRIORITY_OPTIONS, IDP_TASK_TYPE_OPTIONS } from '../utils/idpSelectOptions.js'
import { InlineAlert } from '../components/ui/Alert.jsx'
import { SelectDropdown } from '../components/ui/SelectDropdown.jsx'
import './pages.css'
import './EntityZone.css'

export function DevelopmentPlanCreatePage() {
  const { companyId } = resolveCompanyId()
  const { roles, employeeIdFromJwt, displayName } = useAuth()
  const navigate = useNavigate()
  const canCreatePlan = hasTeamLeadRole(roles)

  const [positionLabels, setPositionLabels] = useState(/** @type {Record<number, string>} */ ({}))
  const [matrixLookupError, setMatrixLookupError] = useState(/** @type {string | null} */ (null))

  const [eligibleGrades, setEligibleGrades] = useState(/** @type {import('../api/gradeModel.js').GradeView[]} */ ([]))
  const [gradeOptionsLoading, setGradeOptionsLoading] = useState(false)
  const [gradeOptionsMessage, setGradeOptionsMessage] = useState(/** @type {string | null} */ (null))

  const [teamLeadDepartmentId, setTeamLeadDepartmentId] = useState(/** @type {number | null} */ (null))
  const [departmentContextError, setDepartmentContextError] = useState(/** @type {string | null} */ (null))
  const [directorEmployeeId, setDirectorEmployeeId] = useState(/** @type {number | null} */ (null))
  const [directorDisplayName, setDirectorDisplayName] = useState(/** @type {string | null} */ (null))

  const [employeeSearchInput, setEmployeeSearchInput] = useState('')
  const [debouncedEmployeeSearch, setDebouncedEmployeeSearch] = useState('')

  const [employeeSuggestions, setEmployeeSuggestions] = useState(
    /** @type {import('../api/employees.js').EmployeeView[]} */ ([]),
  )
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(
    /** @type {import('../api/employees.js').EmployeeView | null} */ (null),
  )

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(/** @type {string | null} */ (null))
  const [createForm, setCreateForm] = useState({
    targetGradeId: '',
    periodStart: '',
    periodEnd: '',
  })
  const [taskDrafts, setTaskDrafts] = useState(() => [newIdpTaskDraft()])

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (employeeIdFromJwt == null || companyId == null) {
        setTeamLeadDepartmentId(null)
        setDirectorEmployeeId(null)
        setDirectorDisplayName(null)
        setDepartmentContextError(null)
        return
      }
      setDepartmentContextError(null)
      try {
        const me = await employeesApi.fetchEmployeeById(employeeIdFromJwt)
        if (cancelled) return
        const deptId = me.department_id
        if (typeof deptId !== 'number') {
          setTeamLeadDepartmentId(null)
          setDirectorEmployeeId(null)
          setDirectorDisplayName(null)
          setDepartmentContextError('У вашей учётной записи не указан отдел — выбор сотрудников для ИПР недоступен.')
          return
        }
        setTeamLeadDepartmentId(deptId)
        const dept = await departmentsApi.fetchDepartment(deptId)
        if (cancelled) return
        const dirRaw = dept.director_employee_id ?? dept.directorEmployeeId
        const dirId = typeof dirRaw === 'number' ? dirRaw : null
        if (dirId == null) {
          setDirectorEmployeeId(null)
          setDirectorDisplayName(null)
          setDepartmentContextError('В вашем отделе не назначен директор — нельзя автоматически указать менеджера ИПР.')
          return
        }
        setDirectorEmployeeId(dirId)
        const dirEmp = await employeesApi.fetchEmployeeById(dirId)
        if (!cancelled) {
          setDirectorDisplayName(typeof dirEmp.full_name === 'string' ? dirEmp.full_name : `Сотрудник #${dirId}`)
        }
      } catch (e) {
        if (cancelled) return
        setTeamLeadDepartmentId(null)
        setDirectorEmployeeId(null)
        setDirectorDisplayName(null)
        if (e instanceof ApiError) {
          setDepartmentContextError(e.message)
        } else if (e instanceof Error) {
          setDepartmentContextError(e.message)
        } else {
          setDepartmentContextError('Не удалось загрузить данные отдела')
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [employeeIdFromJwt, companyId])

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedEmployeeSearch(employeeSearchInput.trim()), 320)
    return () => window.clearTimeout(t)
  }, [employeeSearchInput])

  const loadMatrixPositionLabels = useCallback(async () => {
    if (companyId == null) {
      setPositionLabels({})
      setMatrixLookupError(null)
      return
    }
    setMatrixLookupError(null)
    try {
      const matrix = await gradeModelApi.fetchGradeMatrix(companyId, true)
      const next = /** @type {Record<number, string>} */ ({})
      if (Array.isArray(matrix?.positions)) {
        for (const row of matrix.positions) {
          const pid = row?.position?.id
          if (typeof pid !== 'number') {
            continue
          }
          const n = String(row?.position?.name ?? '').trim()
          next[pid] = n || `Должность #${pid}`
        }
      }
      setPositionLabels(next)
    } catch (e) {
      setPositionLabels({})
      if (e instanceof ApiError) {
        setMatrixLookupError(e.message)
      } else if (e instanceof Error) {
        setMatrixLookupError(e.message)
      } else {
        setMatrixLookupError('Не удалось загрузить матрицу грейдов')
      }
    }
  }, [companyId])

  useEffect(() => {
    void loadMatrixPositionLabels()
  }, [loadMatrixPositionLabels])

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (companyId == null || teamLeadDepartmentId == null) {
        setEmployeeSuggestions([])
        setSelectedEmployee(null)
        return
      }
      setSuggestLoading(true)
      try {
        /** @type {import('../api/employees.js').EmployeesRegistryFilter} */
        const filter = {
          company_id: companyId,
          department_id: teamLeadDepartmentId,
          is_active: true,
        }
        if (debouncedEmployeeSearch !== '') {
          filter.full_name_like = debouncedEmployeeSearch
        }
        const page = await employeesApi.fetchEmployeesRegistry(filter, { size: 200, sort: 'fullName,asc' })
        if (cancelled) {
          return
        }
        let list = Array.isArray(page.content) ? page.content : []
        if (employeeIdFromJwt != null) {
          list = list.filter((e) => e.id !== employeeIdFromJwt)
        }
        setEmployeeSuggestions(list)
        setSelectedEmployee((prev) => {
          if (prev == null) {
            return null
          }
          return list.some((e) => e.id === prev.id) ? prev : null
        })
      } catch {
        if (!cancelled) {
          setEmployeeSuggestions([])
          setSelectedEmployee(null)
        }
      } finally {
        if (!cancelled) {
          setSuggestLoading(false)
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [companyId, teamLeadDepartmentId, employeeIdFromJwt, debouncedEmployeeSearch])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setEligibleGrades([])
      setGradeOptionsMessage(null)
      setCreateForm((prev) => ({ ...prev, targetGradeId: '' }))

      if (selectedEmployee == null || companyId == null) {
        setGradeOptionsLoading(false)
        return
      }

      setGradeOptionsLoading(true)
      try {
        const cur = await employeesApi.fetchEmployeeCurrentGrade(selectedEmployee.id)
        if (cancelled) {
          return
        }
        const positionRaw = cur.position_id
        const positionId = typeof positionRaw === 'number' ? positionRaw : null
        if (positionId == null) {
          setGradeOptionsMessage('У выбранного сотрудника в текущем грейде не указана должность (карьерная линейка).')
          return
        }
        const levelOrder = Number(cur.grade_level_order)
        if (!Number.isFinite(levelOrder)) {
          setGradeOptionsMessage('Не удалось определить уровень текущего грейда сотрудника.')
          return
        }
        const levelFrom = Math.min(32767, Math.trunc(levelOrder) + 1)
        const page = await gradeModelApi.fetchGradeRegistry(
          {
            company_id: companyId,
            position_id: positionId,
            is_active: true,
            level_from: levelFrom,
          },
          { size: 80, sort: 'levelOrder,asc' },
        )
        if (cancelled) {
          return
        }
        const list = Array.isArray(page.content) ? page.content : []
        const filtered = list.filter((g) => typeof g?.id === 'number' && g.is_active !== false)
        setEligibleGrades(filtered)
        if (filtered.length === 0) {
          setGradeOptionsMessage('Нет доступных грейдов выше текущего для этой должности.')
        }
      } catch (e) {
        if (cancelled) {
          return
        }
        setEligibleGrades([])
        if (e instanceof ApiError && e.httpStatus === 404) {
          setGradeOptionsMessage('У сотрудника не зафиксирован текущий грейд — выбор целевого грейда недоступен.')
        } else if (e instanceof ApiError) {
          setGradeOptionsMessage(e.message)
        } else if (e instanceof Error) {
          setGradeOptionsMessage(e.message)
        } else {
          setGradeOptionsMessage('Не удалось загрузить список грейдов')
        }
      } finally {
        if (!cancelled) {
          setGradeOptionsLoading(false)
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [selectedEmployee, companyId])

  const teamLeadLabel = useMemo(() => {
    if (displayName && String(displayName).trim()) {
      return String(displayName).trim()
    }
    if (employeeIdFromJwt != null) {
      return `Сотрудник #${employeeIdFromJwt}`
    }
    return '—'
  }, [displayName, employeeIdFromJwt])

  const submitCreate = useCallback(async () => {
    if (!canCreatePlan || submitting) {
      return
    }

    if (employeeIdFromJwt == null) {
      setSubmitError('Не удалось определить учётную запись тимлида')
      return
    }
    if (selectedEmployee == null) {
      setSubmitError('Выберите сотрудника из списка под поиском')
      return
    }
    if (directorEmployeeId == null) {
      setSubmitError('Не назначен директор отдела — создать ИПР нельзя')
      return
    }

    const targetGradeId = Number(createForm.targetGradeId)
    if (!Number.isFinite(targetGradeId)) {
      setSubmitError('Выберите целевой грейд')
      return
    }
    if (createForm.periodStart === '' || createForm.periodEnd === '') {
      setSubmitError('Укажите период ИПР')
      return
    }

    const tasksPayload = []
    for (let i = 0; i < taskDrafts.length; i += 1) {
      const row = taskDrafts[i]
      if (row.taskTitle.trim() === '' || row.taskDescription.trim() === '' || row.taskSuccessCriteria.trim() === '') {
        setSubmitError(`Заполните название, описание и критерии задачи №${i + 1}`)
        return
      }
      const taskDurationDays = Number(row.taskDurationDays)
      const taskEffortHoursPlanned =
        row.taskEffortHoursPlanned.trim() === '' ? null : Number(row.taskEffortHoursPlanned)
      if (!Number.isFinite(taskDurationDays) || taskDurationDays <= 0) {
        setSubmitError(`Длительность задачи №${i + 1} должна быть положительным числом`)
        return
      }
      if (taskEffortHoursPlanned != null && (!Number.isFinite(taskEffortHoursPlanned) || taskEffortHoursPlanned < 0)) {
        setSubmitError(`Плановая трудоёмкость задачи №${i + 1} должна быть неотрицательным числом`)
        return
      }
      tasksPayload.push(idpTaskDraftToApiPayload(row))
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      const planId = await developmentPlansApi.createDevelopmentPlan(Math.trunc(selectedEmployee.id), {
        manager_id: Math.trunc(directorEmployeeId),
        team_lead_id: Math.trunc(employeeIdFromJwt),
        period_start: createForm.periodStart,
        period_end: createForm.periodEnd,
        target_grade_id: Math.trunc(targetGradeId),
        tasks: tasksPayload,
      })
      navigate(`/development-plans/${planId}`)
    } catch (e) {
      if (e instanceof ApiError) {
        setSubmitError(e.message)
      } else if (e instanceof Error) {
        setSubmitError(e.message)
      } else {
        setSubmitError('Не удалось создать ИПР')
      }
    } finally {
      setSubmitting(false)
    }
  }, [
    canCreatePlan,
    createForm.periodEnd,
    createForm.periodStart,
    createForm.targetGradeId,
    directorEmployeeId,
    employeeIdFromJwt,
    navigate,
    selectedEmployee,
    submitting,
    taskDrafts,
  ])

  const targetGradePlaceholder = useMemo(() => {
    if (selectedEmployee == null) {
      return 'Сначала выберите сотрудника'
    }
    if (gradeOptionsLoading) {
      return 'Загрузка грейдов…'
    }
    if (eligibleGrades.length === 0) {
      return 'Нет доступных грейдов'
    }
    return 'Выберите грейд'
  }, [selectedEmployee, gradeOptionsLoading, eligibleGrades.length])

  const targetGradeOptions = useMemo(
    () =>
      eligibleGrades.map((grade) => {
        const pid = grade.position_id
        const posLabel = typeof pid === 'number' ? positionLabels[pid] || `Должность #${pid}` : ''
        const gName = String(grade.name ?? '').trim()
        const label = posLabel ? `${posLabel}: ${gName}` : gName
        return {
          value: String(grade.id),
          label,
          description: posLabel ? gName : undefined,
        }
      }),
    [eligibleGrades, positionLabels],
  )

  if (!canCreatePlan) {
    return (
      <article className="page">
        <ol className="page__breadcrumbs">
          <li>
            <Link to="/">Главная</Link>
          </li>
          <li>
            <Link to="/development-plans">ИПР</Link>
          </li>
          <li>Создание</li>
        </ol>
        <h1 className="page__title">Создание ИПР</h1>
        <p className="entity-zone__hint">Доступно только пользователям с ролью тимлида.</p>
        <Link className="entity-zone__link" to="/development-plans">
          Вернуться к списку
        </Link>
      </article>
    )
  }

  return (
    <article className="page">
      <ol className="page__breadcrumbs">
        <li>
          <Link to="/">Главная</Link>
        </li>
        <li>
          <Link to="/development-plans">ИПР</Link>
        </li>
        <li>Создание</li>
      </ol>

      <h1 className="page__title">Новый ИПР</h1>
      <p className="page__lead">
        Менеджером ИПР автоматически назначается директор вашего отдела. В списке сотрудников — только ваш отдел.
      </p>

      {companyId == null ? <p className="entity-zone__hint">Компания не определена.</p> : null}

      <section className="entity-zone__summary">
        <h2 className="entity-zone__summary-title">Параметры плана</h2>
        <div className="entity-zone__filters entity-zone__filters--idp-create">
          <div className="entity-zone__field entity-zone__field--grow entity-zone__field--span-full">
            <span className="entity-zone__field-label">Сотрудник (поиск по ФИО, отдел тимлида)</span>
            <div className="entity-zone__combo">
              <input
                className="entity-zone__input"
                type="search"
                autoComplete="off"
                placeholder="Начните вводить фамилию или имя…"
                value={employeeSearchInput}
                onChange={(ev) => {
                  const v = ev.target.value
                  setEmployeeSearchInput(v)
                  if (selectedEmployee && v !== selectedEmployee.full_name) {
                    setSelectedEmployee(null)
                  }
                  setSuggestOpen(true)
                }}
                onFocus={() => setSuggestOpen(true)}
                onBlur={() => {
                  window.setTimeout(() => setSuggestOpen(false), 180)
                }}
                disabled={teamLeadDepartmentId == null}
              />
              {suggestOpen && teamLeadDepartmentId != null ? (
                <div className="entity-zone__combo-list" role="listbox">
                  {suggestLoading ? (
                    <div className="entity-zone__combo-status">Поиск…</div>
                  ) : employeeSuggestions.length === 0 ? (
                    <div className="entity-zone__combo-status">Сотрудники не найдены</div>
                  ) : (
                    employeeSuggestions.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        role="option"
                        className="entity-zone__combo-option"
                        onMouseDown={(ev) => {
                          ev.preventDefault()
                          setSelectedEmployee(emp)
                          setEmployeeSearchInput(typeof emp.full_name === 'string' ? emp.full_name : '')
                          setSuggestOpen(false)
                        }}
                      >
                        {typeof emp.full_name === 'string' ? emp.full_name : `Сотрудник #${emp.id}`}
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
            {selectedEmployee ? (
              <p className="entity-zone__idp-muted" style={{ marginTop: '0.35rem' }}>
                Выбрано: {selectedEmployee.full_name}
              </p>
            ) : null}
          </div>

          <div className="entity-zone__idp-role-block entity-zone__field--span-full">
            <div className="entity-zone__idp-role-row">
              <span className="entity-zone__field-label entity-zone__idp-role-label">Тимлид</span>
              <span className="entity-zone__idp-role-value">{teamLeadLabel}</span>
            </div>
            <div className="entity-zone__idp-role-row">
              <span className="entity-zone__field-label entity-zone__idp-role-label">Менеджер ИПР (директор отдела)</span>
              <span className="entity-zone__idp-role-value">{directorDisplayName ?? '—'}</span>
            </div>
          </div>

          <label className="entity-zone__field">
            <span className="entity-zone__field-label">Целевой грейд</span>
            <SelectDropdown
              value={createForm.targetGradeId}
              onChange={(next) => setCreateForm((prev) => ({ ...prev, targetGradeId: next }))}
              placeholder={targetGradePlaceholder}
              disabled={selectedEmployee == null || gradeOptionsLoading || eligibleGrades.length === 0}
              options={targetGradeOptions}
            />
            {gradeOptionsMessage ? (
              <InlineAlert variant="warning" role="status" className="ui-alert--field-hint">
                {gradeOptionsMessage}
              </InlineAlert>
            ) : null}
          </label>
          <label className="entity-zone__field">
            <span className="entity-zone__field-label">Период с</span>
            <input
              className="entity-zone__input"
              type="date"
              value={createForm.periodStart}
              onChange={(ev) => setCreateForm((prev) => ({ ...prev, periodStart: ev.target.value }))}
            />
          </label>
          <label className="entity-zone__field">
            <span className="entity-zone__field-label">Период по</span>
            <input
              className="entity-zone__input"
              type="date"
              value={createForm.periodEnd}
              onChange={(ev) => setCreateForm((prev) => ({ ...prev, periodEnd: ev.target.value }))}
            />
          </label>
        </div>

        <h2 className="entity-zone__summary-title">Задачи ИПР</h2>
        {taskDrafts.map((draft, index) => (
          <div key={index} className="entity-zone__idp-section" style={{ marginBottom: '1.25rem' }}>
            <h3 className="entity-zone__idp-section-title">Задача {index + 1}</h3>
            <div className="entity-zone__filters entity-zone__filters--idp-task-row1">
              <label className="entity-zone__field">
                <span className="entity-zone__field-label">Тип</span>
                <SelectDropdown
                  value={draft.taskType}
                  onChange={(next) =>
                    setTaskDrafts((prev) => prev.map((t, i) => (i === index ? { ...t, taskType: next } : t)))
                  }
                  options={IDP_TASK_TYPE_OPTIONS}
                />
              </label>
              <label className="entity-zone__field">
                <span className="entity-zone__field-label">Приоритет</span>
                <SelectDropdown
                  value={draft.taskPriority}
                  onChange={(next) =>
                    setTaskDrafts((prev) => prev.map((t, i) => (i === index ? { ...t, taskPriority: next } : t)))
                  }
                  options={IDP_TASK_PRIORITY_OPTIONS}
                />
              </label>
              <label className="entity-zone__field entity-zone__field--grow">
                <span className="entity-zone__field-label">Название</span>
                <input
                  className="entity-zone__input"
                  value={draft.taskTitle}
                  onChange={(ev) =>
                    setTaskDrafts((prev) =>
                      prev.map((t, i) => (i === index ? { ...t, taskTitle: ev.target.value } : t)),
                    )
                  }
                />
              </label>
              <label className="entity-zone__field entity-zone__field--grow">
                <span className="entity-zone__field-label">Описание</span>
                <input
                  className="entity-zone__input"
                  value={draft.taskDescription}
                  onChange={(ev) =>
                    setTaskDrafts((prev) =>
                      prev.map((t, i) => (i === index ? { ...t, taskDescription: ev.target.value } : t)),
                    )
                  }
                />
              </label>
              <label className="entity-zone__field entity-zone__field--grow">
                <span className="entity-zone__field-label">Критерии успеха</span>
                <input
                  className="entity-zone__input"
                  value={draft.taskSuccessCriteria}
                  onChange={(ev) =>
                    setTaskDrafts((prev) =>
                      prev.map((t, i) => (i === index ? { ...t, taskSuccessCriteria: ev.target.value } : t)),
                    )
                  }
                />
              </label>
            </div>
            <div className="entity-zone__filters entity-zone__filters--idp-task-row2">
              <label className="entity-zone__field">
                <span className="entity-zone__field-label">Плановая дата старта</span>
                <input
                  className="entity-zone__input"
                  type="date"
                  value={draft.taskPlannedStartDate}
                  onChange={(ev) =>
                    setTaskDrafts((prev) =>
                      prev.map((t, i) => (i === index ? { ...t, taskPlannedStartDate: ev.target.value } : t)),
                    )
                  }
                />
              </label>
              <label className="entity-zone__field">
                <span className="entity-zone__field-label">Длительность (дней)</span>
                <input
                  className="entity-zone__input"
                  type="number"
                  min={1}
                  value={draft.taskDurationDays}
                  onChange={(ev) =>
                    setTaskDrafts((prev) =>
                      prev.map((t, i) => (i === index ? { ...t, taskDurationDays: ev.target.value } : t)),
                    )
                  }
                />
              </label>
              <label className="entity-zone__field">
                <span className="entity-zone__field-label">Трудоёмкость (час.)</span>
                <input
                  className="entity-zone__input"
                  type="number"
                  min={0}
                  value={draft.taskEffortHoursPlanned}
                  onChange={(ev) =>
                    setTaskDrafts((prev) =>
                      prev.map((t, i) => (i === index ? { ...t, taskEffortHoursPlanned: ev.target.value } : t)),
                    )
                  }
                />
              </label>
            </div>
            {taskDrafts.length > 1 ? (
              <div className="entity-zone__actions">
                <button
                  type="button"
                  className="entity-zone__icon-button entity-zone__icon-button--danger"
                  title="Удалить задачу"
                  aria-label="Удалить задачу"
                  onClick={() => setTaskDrafts((prev) => prev.filter((_, i) => i !== index))}
                >
                  <TrashIcon aria-hidden />
                </button>
              </div>
            ) : null}
          </div>
        ))}

        <div className="entity-zone__actions">
          <button type="button" className="entity-zone__button" onClick={() => setTaskDrafts((prev) => [...prev, newIdpTaskDraft()])}>
            Добавить задачу
          </button>
          <button
            type="button"
            className="entity-zone__button entity-zone__button--primary"
            disabled={
              submitting ||
              companyId == null ||
              teamLeadDepartmentId == null ||
              directorEmployeeId == null ||
              departmentContextError != null ||
              (selectedEmployee != null &&
                (gradeOptionsLoading || eligibleGrades.length === 0 || createForm.targetGradeId === ''))
            }
            onClick={() => void submitCreate()}
          >
            Создать ИПР
          </button>
          <Link className="entity-zone__button" to="/development-plans">
            Отмена
          </Link>
        </div>
      </section>

      {matrixLookupError ? <InlineAlert variant="error">{matrixLookupError}</InlineAlert> : null}

      {departmentContextError ? <InlineAlert variant="error">{departmentContextError}</InlineAlert> : null}

      {submitError ? <InlineAlert variant="error">{submitError}</InlineAlert> : null}
    </article>
  )
}
