import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, employeesApi, reviewCyclesApi } from '../api/index.js'
import { useAuth } from '../auth/useAuth.js'
import { hasDirectorRole, hasGeneralDirectorRole } from '../auth/roleChecks.js'
import { resolveCompanyId } from '../config/companyContext.js'
import { formatDateTimeRuNoSeconds } from '../utils/dateFormat.js'
import { InlineAlert } from '../components/ui/Alert.jsx'
import { SelectDropdown } from '../components/ui/SelectDropdown.jsx'
import { useDisplayWhileRefreshing } from '../hooks/useDisplayWhileRefreshing.js'
import { cn } from '../lib/utils.js'
import './pages.css'
import './EntityZone.css'

const REVIEW_TYPE_LABEL = {
  FINAL_PROMOTION: 'Собеседование на повышение',
}

const STATUS_LABEL = {
  SCHEDULED: 'Запланирован',
  COMPLETED: 'Завершён',
  CANCELLED: 'Отменён',
}

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Все' },
  { value: 'SCHEDULED', label: 'Запланирован', description: 'Ожидают проведения' },
  { value: 'COMPLETED', label: 'Завершён', description: 'Итог зафиксирован' },
  { value: 'CANCELLED', label: 'Отменён', description: 'Собеседование отменено' },
]

/**
 * @returns {string}
 */
function defaultFutureDatetimeLocal() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  d.setHours(10, 0, 0, 0)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function buildEmployeeNameMap(employees) {
  const map = new Map()
  if (!Array.isArray(employees)) {
    return map
  }
  for (const employee of employees) {
    if (employee && typeof employee.id === 'number' && typeof employee.full_name === 'string') {
      map.set(employee.id, employee.full_name)
    }
  }
  return map
}

export function ReviewsPage() {
  const { companyId } = resolveCompanyId()
  const navigate = useNavigate()
  const { roles, employeeIdFromJwt } = useAuth()
  const canScheduleFinalReview = hasDirectorRole(roles)
  const isGeneralDirector = hasGeneralDirectorRole(roles)

  const [myDepartmentId, setMyDepartmentId] = useState(/** @type {number | null} */ (null))
  const [myDepartmentLookupDone, setMyDepartmentLookupDone] = useState(() => employeeIdFromJwt == null)
  const [scheduleEmployeeId, setScheduleEmployeeId] = useState('')
  const [scheduleAt, setScheduleAt] = useState(() => defaultFutureDatetimeLocal())
  const [openFinalReviewEmployeeIds, setOpenFinalReviewEmployeeIds] = useState(
    () => /** @type {Set<number>} */ (new Set()),
  )
  const [scheduleBusy, setScheduleBusy] = useState(false)
  const [scheduleError, setScheduleError] = useState(/** @type {string | null} */ (null))
  const [scheduleInfo, setScheduleInfo] = useState(/** @type {string | null} */ (null))
  const [scheduleAdvisories, setScheduleAdvisories] = useState(/** @type {string[] | null} */ (null))

  const [scheduleEligibleIds, setScheduleEligibleIds] = useState(/** @type {Set<number> | null} */ (null))
  const [scheduleEligibleLoading, setScheduleEligibleLoading] = useState(false)
  const [scheduleEligibleLoadError, setScheduleEligibleLoadError] = useState(/** @type {string | null} */ (null))

  const [employeeNameLike, setEmployeeNameLike] = useState('')
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [items, setItems] = useState(
    /** @type {import('../api/reviewCycles.js').ReviewCycleView[] | null} */ (null),
  )
  const [employees, setEmployees] = useState(
    /** @type {import('../api/employees.js').EmployeeView[] | null} */ (null),
  )

  const loadEmployees = useCallback(async () => {
    if (companyId == null) {
      setEmployees(null)
      return
    }
    try {
      const page = await employeesApi.fetchEmployeesRegistry(
        { company_id: companyId, is_active: true },
        { size: 300, sort: 'fullName,asc' },
      )
      setEmployees(page.content)
    } catch {
      setEmployees(null)
    }
  }, [companyId])

  useEffect(() => {
    void loadEmployees()
  }, [loadEmployees])

  useEffect(() => {
    if (employeeIdFromJwt == null) {
      setMyDepartmentId(null)
      setMyDepartmentLookupDone(true)
      return
    }
    setMyDepartmentLookupDone(false)
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
      .finally(() => {
        if (!cancelled) {
          setMyDepartmentLookupDone(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [employeeIdFromJwt])

  const employeeNameMap = useMemo(() => buildEmployeeNameMap(employees), [employees])

  const scheduleEmployeeOptions = useMemo(() => {
    if (!Array.isArray(employees) || scheduleEligibleIds == null) {
      return []
    }
    let list = employees.filter((e) => e && e.is_active !== false && scheduleEligibleIds.has(e.id))
    if (!isGeneralDirector && myDepartmentId != null) {
      list = list.filter((e) => Number(e.department_id) === myDepartmentId)
    }
    return list.slice().sort((a, b) => String(a.full_name ?? '').localeCompare(String(b.full_name ?? ''), 'ru'))
  }, [employees, isGeneralDirector, myDepartmentId, scheduleEligibleIds])

  const loadScheduleEligibleIds = useCallback(async () => {
    if (!canScheduleFinalReview || companyId == null || !myDepartmentLookupDone) {
      return
    }
    setScheduleEligibleLoading(true)
    setScheduleEligibleLoadError(null)
    try {
      const departmentParam = !isGeneralDirector && myDepartmentId != null ? myDepartmentId : undefined
      const ids = await reviewCyclesApi.fetchFinalPromotionScheduleEligibleEmployeeIds({
        company_id: companyId,
        department_id: departmentParam,
      })
      setScheduleEligibleIds(new Set(ids.map((id) => Math.trunc(Number(id)))))
    } catch {
      setScheduleEligibleIds(null)
      setScheduleEligibleLoadError('Не удалось загрузить список сотрудников, доступных для собеседования.')
    } finally {
      setScheduleEligibleLoading(false)
    }
  }, [canScheduleFinalReview, companyId, myDepartmentLookupDone, isGeneralDirector, myDepartmentId])

  useEffect(() => {
    if (!canScheduleFinalReview || companyId == null) {
      setScheduleEligibleIds(null)
      setScheduleEligibleLoading(false)
      setScheduleEligibleLoadError(null)
      return
    }
    if (!myDepartmentLookupDone) {
      return
    }
    void loadScheduleEligibleIds()
  }, [canScheduleFinalReview, companyId, myDepartmentLookupDone, loadScheduleEligibleIds])

  const loadOpenFinalReviews = useCallback(async () => {
    if (!canScheduleFinalReview || companyId == null) {
      setOpenFinalReviewEmployeeIds(new Set())
      return
    }
    try {
      const page = await reviewCyclesApi.fetchReviewCyclesRegistry(
        {
          company_id: companyId,
          review_type: 'FINAL_PROMOTION',
          status: 'SCHEDULED',
        },
        { size: 300 },
      )
      setOpenFinalReviewEmployeeIds(new Set(page.content.map((cycle) => cycle.employee_id)))
    } catch {
      setOpenFinalReviewEmployeeIds(new Set())
    }
  }, [canScheduleFinalReview, companyId])

  useEffect(() => {
    void loadOpenFinalReviews()
  }, [loadOpenFinalReviews])

  const load = useCallback(async () => {
    if (companyId == null) {
      setItems(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const page = await reviewCyclesApi.fetchReviewCyclesRegistry(
        {
          company_id: companyId,
          review_type: 'FINAL_PROMOTION',
          status: status || null,
          date_from: dateFrom || null,
          date_to: dateTo || null,
          employee_title_like: employeeNameLike.trim() || null,
        },
        { size: 100, sort: 'scheduledAt,desc' },
      )
      setItems(page.content)
    } catch (e) {
      setItems(null)
      if (e instanceof ApiError) {
        setError(e.message)
      } else if (e instanceof Error) {
        setError(e.message)
      } else {
        setError('Не удалось загрузить собеседования')
      }
    } finally {
      setLoading(false)
    }
  }, [companyId, dateFrom, dateTo, employeeNameLike, status])

  useEffect(() => {
    void load()
  }, [load])

  async function handleScheduleFinalReview(ev) {
    ev.preventDefault()
    if (employeeIdFromJwt == null) {
      setScheduleError('Не удалось определить сотрудника-директора в сессии.')
      return
    }
    const targetEmployeeId = Number(scheduleEmployeeId)
    if (!Number.isFinite(targetEmployeeId) || targetEmployeeId <= 0) {
      setScheduleError('Выберите сотрудника.')
      return
    }
    if (scheduleAt.trim() === '') {
      setScheduleError('Укажите плановую дату и время собеседования.')
      return
    }
    if (openFinalReviewEmployeeIds.has(targetEmployeeId)) {
      setScheduleError('У выбранного сотрудника уже есть запланированное собеседование.')
      return
    }

    setScheduleBusy(true)
    setScheduleError(null)
    setScheduleInfo(null)
    setScheduleAdvisories(null)
    try {
      const result = await reviewCyclesApi.scheduleFinalPromotionReview(targetEmployeeId, {
        director_employee_id: employeeIdFromJwt,
        scheduled_at: `${scheduleAt.trim()}:00`,
      })
      const planCount = Array.isArray(result.considered_development_plan_ids)
        ? result.considered_development_plan_ids.length
        : 0
      setScheduleInfo(
        `Собеседование №${result.review_cycle_id} назначено (ИПР в основе: ${planCount}).`,
      )
      if (Array.isArray(result.policy_advisories) && result.policy_advisories.length > 0) {
        setScheduleAdvisories(result.policy_advisories)
      }
      setScheduleEmployeeId('')
      setScheduleAt(defaultFutureDatetimeLocal())
      await Promise.all([load(), loadOpenFinalReviews(), loadScheduleEligibleIds()])
      navigate(`/reviews/${result.review_cycle_id}`)
    } catch (e) {
      if (e instanceof ApiError) setScheduleError(e.message)
      else if (e instanceof Error) setScheduleError(e.message)
      else setScheduleError('Не удалось назначить собеседование')
    } finally {
      setScheduleBusy(false)
    }
  }

  const { displayData: displayItems, showBlockingSpinner, isRefreshing } = useDisplayWhileRefreshing(items, loading)

  return (
    <article className="page">
      <ol className="page__breadcrumbs">
        <li>
          <Link to="/">Главная</Link>
        </li>
        <li>Собеседования</li>
      </ol>

      <h1 className="page__title">Собеседования</h1>
      <p className="page__lead">Плановые и завершённые собеседования на повышение. Нажмите на карточку, чтобы открыть детали.</p>

      {companyId == null ? (
        <InlineAlert variant="warning" role="status">
          Не удалось определить компанию.
        </InlineAlert>
      ) : null}

      {canScheduleFinalReview ? (
        <section className="entity-zone__idp-section" style={{ marginBottom: '1.5rem' }}>
          <h2 className="entity-zone__idp-section-title">Назначить собеседование на повышение</h2>
          <p className="entity-zone__idp-muted" style={{ marginBottom: '0.75rem' }}>
            Доступно после завершения ИПР сотрудника. В списке ниже — только те, кому собеседование можно назначить сейчас (есть завершённый ИПР в основе, нет открытого запланированного собеседования). Рекомендации политики не блокируют назначение.
            {!isGeneralDirector && myDepartmentId != null
              ? ' Список ограничен сотрудниками вашего отдела.'
              : ''}
          </p>
          {scheduleError ? (
            <InlineAlert variant="error" className="ui-alert--mb-sm">
              {scheduleError}
            </InlineAlert>
          ) : null}
          {scheduleEligibleLoadError ? (
            <InlineAlert variant="warning" className="ui-alert--mb-sm" role="status">
              {scheduleEligibleLoadError}
            </InlineAlert>
          ) : null}
          {scheduleInfo ? (
            <p className="entity-zone__idp-muted" style={{ marginBottom: '0.75rem' }}>
              {scheduleInfo}
            </p>
          ) : null}
          {scheduleAdvisories && scheduleAdvisories.length > 0 ? (
            <ul className="entity-zone__idp-muted" style={{ marginBottom: '0.75rem' }}>
              {scheduleAdvisories.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}
          <form
            className="entity-zone__filters entity-zone__filters--reviews-schedule"
            onSubmit={(ev) => void handleScheduleFinalReview(ev)}
          >
            <label className="entity-zone__field entity-zone__field--grow">
              <span className="entity-zone__field-label">Сотрудник</span>
              <SelectDropdown
                value={scheduleEmployeeId}
                onChange={setScheduleEmployeeId}
                placeholder={
                  !myDepartmentLookupDone || scheduleEligibleLoading
                    ? 'Загрузка списка…'
                    : scheduleEligibleLoadError
                      ? 'Список недоступен'
                      : 'Выберите сотрудника'
                }
                disabled={
                  scheduleBusy ||
                  !myDepartmentLookupDone ||
                  scheduleEligibleLoading ||
                  scheduleEligibleLoadError != null ||
                  scheduleEmployeeOptions.length === 0
                }
                options={[
                  { value: '', label: 'Выберите сотрудника' },
                  ...scheduleEmployeeOptions.map((employee) => {
                    const hasOpen = openFinalReviewEmployeeIds.has(employee.id)
                    return {
                      value: String(employee.id),
                      label: employee.full_name,
                      description: hasOpen ? 'Собеседование уже запланировано' : undefined,
                      disabled: hasOpen,
                    }
                  }),
                ]}
              />
            </label>
            <label className="entity-zone__field entity-zone__field--datetime-narrow">
              <span className="entity-zone__field-label">Плановая дата и время</span>
              <input
                className="entity-zone__input"
                type="datetime-local"
                value={scheduleAt}
                onChange={(ev) => setScheduleAt(ev.target.value)}
                disabled={scheduleBusy}
              />
            </label>
            <label className="entity-zone__field">
              <span className="entity-zone__field-label" aria-hidden="true">
                {'\u00a0'}
              </span>
              <button
                className="entity-zone__button entity-zone__button--primary entity-zone__button--align-field"
                type="submit"
                disabled={
                  scheduleBusy ||
                  employeeIdFromJwt == null ||
                  !myDepartmentLookupDone ||
                  scheduleEligibleLoading ||
                  scheduleEligibleLoadError != null ||
                  scheduleEmployeeOptions.length === 0
                }
              >
                {scheduleBusy ? 'Назначение…' : 'Назначить собеседование'}
              </button>
            </label>
          </form>
          {scheduleEligibleLoadError ? null : !myDepartmentLookupDone ? (
            <p className="entity-zone__idp-muted" style={{ marginTop: '0.5rem' }}>
              Определение зоны видимости…
            </p>
          ) : scheduleEligibleLoading && scheduleEmployeeOptions.length === 0 ? (
            <p className="entity-zone__idp-muted" style={{ marginTop: '0.5rem' }}>
              Загрузка списка доступных сотрудников…
            </p>
          ) : !scheduleEligibleLoading && scheduleEligibleIds != null && scheduleEmployeeOptions.length === 0 ? (
            <p className="entity-zone__idp-muted" style={{ marginTop: '0.5rem' }}>
              Нет сотрудников, которым сейчас можно назначить собеседование: нет подходящего завершённого ИПР в основе или уже есть запланированное собеседование.
            </p>
          ) : null}
        </section>
      ) : null}

      <form
        className="entity-zone__filters entity-zone__filters--reviews-filters"
        onSubmit={(ev) => {
          ev.preventDefault()
          void load()
        }}
      >
        <label className="entity-zone__field entity-zone__field--grow">
          <span className="entity-zone__field-label">Сотрудник (поиск по ФИО)</span>
          <input
            className="entity-zone__input"
            value={employeeNameLike}
            onChange={(ev) => setEmployeeNameLike(ev.target.value)}
            placeholder="Например: Петров"
          />
        </label>
        <label className="entity-zone__field">
          <span className="entity-zone__field-label">Статус</span>
          <SelectDropdown value={status} onChange={setStatus} options={STATUS_FILTER_OPTIONS} />
        </label>
        <label className="entity-zone__field entity-zone__field--date-narrow">
          <span className="entity-zone__field-label">Период: с</span>
          <input className="entity-zone__input" type="date" value={dateFrom} onChange={(ev) => setDateFrom(ev.target.value)} />
        </label>
        <label className="entity-zone__field entity-zone__field--date-narrow">
          <span className="entity-zone__field-label">Период: по</span>
          <input className="entity-zone__input" type="date" value={dateTo} onChange={(ev) => setDateTo(ev.target.value)} />
        </label>
      </form>

      <div className="entity-zone__actions">
        <button className="entity-zone__button entity-zone__button--primary" type="button" onClick={() => void load()}>
          Применить фильтры
        </button>
      </div>

      {error ? <InlineAlert variant="error">{error}</InlineAlert> : null}

      {showBlockingSpinner ? <p className="entity-zone__loading">Загрузка…</p> : null}

      {companyId != null && displayItems && displayItems.length === 0 && !error ? (
        <p className="entity-zone__empty">Собеседования не найдены.</p>
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
          {displayItems.map((item) => {
            const employeeName = employeeNameMap.get(item.employee_id) ?? 'Сотрудник'
            const typeKey = String(item.review_type ?? '').toUpperCase()
            const typeLabel = REVIEW_TYPE_LABEL[/** @type {keyof typeof REVIEW_TYPE_LABEL} */ (typeKey)] ?? item.review_type
            const statusKey = String(item.status ?? '').toUpperCase()
            const statusLabel = STATUS_LABEL[/** @type {keyof typeof STATUS_LABEL} */ (statusKey)] ?? item.status
            const planCount = (item.considered_development_plan_ids ?? []).length
            const detailUrl = `/reviews/${item.review_cycle_id}`

            return (
              <article
                key={item.review_cycle_id}
                className="entity-zone__card entity-zone__card--panel entity-zone__card--clickable"
                role="link"
                tabIndex={0}
                aria-label={`Открыть собеседование: ${employeeName}`}
                onClick={() => navigate(detailUrl)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault()
                    navigate(detailUrl)
                  }
                }}
              >
                <div className="entity-zone__card-name">{employeeName}</div>
                <div className="entity-zone__card-code entity-zone__card-code--status-lg">{typeLabel}</div>
                <div className="entity-zone__card-meta">
                  <span className="entity-zone__badge">{statusLabel}</span>
                  <span className="entity-zone__badge">ИПР в основе: {planCount}</span>
                </div>
                <p className="entity-zone__card-desc">
                  Плановая дата встречи: {formatDateTimeRuNoSeconds(item.scheduled_at)}
                </p>
                <p className="entity-zone__card-desc entity-zone__task-stats">
                  Дата создания: {formatDateTimeRuNoSeconds(item.created_at)}
                </p>
                <p className="entity-zone__card-desc entity-zone__task-stats">
                  Дата завершения: {formatDateTimeRuNoSeconds(item.completed_at)}
                </p>
              </article>
            )
          })}
          </div>
        </div>
      ) : null}
    </article>
  )
}
