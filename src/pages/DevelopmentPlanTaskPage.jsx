import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, developmentPlansApi, employeesApi } from '../api/index.js'
import { useAuth } from '../auth/useAuth.js'
import { hasTeamLeadRole } from '../auth/roleChecks.js'
import { resolveCompanyId } from '../config/companyContext.js'
import { formatDateTimeRuNoSeconds } from '../utils/dateFormat.js'
import './pages.css'
import './EntityZone.css'

const TASK_STATUS_LABEL = {
  PLANNED: 'Запланирована',
  IN_PROGRESS: 'В работе',
  DONE: 'Выполнена',
}

const TASK_TYPE_LABEL = {
  LEARNING: 'Обучение',
  PROJECT: 'Проект',
  SOFT_SKILL: 'Soft skills',
}

const TASK_PRIORITY_LABEL = {
  HIGH: 'Высокий',
  MIDDLE: 'Средний',
  LOW: 'Низкий',
}

/**
 * @param {Record<string, unknown>} row
 * @returns {number | null}
 */
function rowAuthorEmployeeId(row) {
  const raw = row.created_by_employee_id ?? row.createdByEmployeeId
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw
  }
  if (typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))) {
    return Number(raw)
  }
  return null
}

/**
 * @param {Record<string, unknown>} row
 * @param {Map<number, string>} employeeNameById
 */
function formatProgressAuthorLine(row, employeeNameById) {
  const id = rowAuthorEmployeeId(row)
  if (id == null) {
    return 'Автор записи не указан'
  }
  return employeeNameById.get(id) ?? `Сотрудник #${id}`
}

/**
 * @param {Record<string, unknown>} row
 * @param {Map<number, string>} employeeNameById
 */
function formatCommentAuthorChip(row, employeeNameById) {
  const id = rowAuthorEmployeeId(row)
  if (id == null) {
    return 'Автор не указан'
  }
  return employeeNameById.get(id) ?? `Сотрудник #${id}`
}

/**
 * @param {string} status
 */
function taskStatusChipClass(status) {
  const s = String(status ?? '').toUpperCase()
  if (s === 'DONE') return 'entity-zone__idp-chip entity-zone__idp-chip--status-done'
  if (s === 'IN_PROGRESS') return 'entity-zone__idp-chip entity-zone__idp-chip--status-progress'
  return 'entity-zone__idp-chip entity-zone__idp-chip--status-planned'
}

export function DevelopmentPlanTaskPage() {
  const { planId, taskId } = useParams()
  const { companyId } = resolveCompanyId()
  const { roles, employeeIdFromJwt } = useAuth()
  const [plan, setPlan] = useState(null)
  const [task, setTask] = useState(null)
  const [progressHistory, setProgressHistory] = useState([])
  const [comments, setComments] = useState([])
  const [attachments, setAttachments] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [newComment, setNewComment] = useState('')
  const [commentBusy, setCommentBusy] = useState(false)
  const [commentError, setCommentError] = useState(null)

  const [doneScore, setDoneScore] = useState('8')
  const [doneBusy, setDoneBusy] = useState(false)
  const [doneError, setDoneError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!planId || !taskId) return
      setLoading(true)
      setError(null)
      try {
        const pId = Number(planId)
        const tId = Number(taskId)
        const [planData, tasks, progress, commentsData, attachmentsData, employeesPage] = await Promise.all([
          developmentPlansApi.fetchDevelopmentPlanById(pId),
          developmentPlansApi.fetchPlanTasks(pId),
          developmentPlansApi.fetchTaskProgressHistory(pId, tId),
          developmentPlansApi.fetchTaskComments(pId, tId),
          developmentPlansApi.fetchTaskAttachments(pId, tId),
          companyId == null
            ? Promise.resolve({ content: [] })
            : employeesApi.fetchEmployeesRegistry({ company_id: companyId }, { size: 300, sort: 'fullName,asc' }),
        ])
        if (cancelled) return
        setPlan(planData)
        setTask((tasks ?? []).find((x) => Number(x.id) === tId) ?? null)
        setProgressHistory(Array.isArray(progress) ? progress : [])
        setComments(Array.isArray(commentsData) ? commentsData : [])
        setAttachments(Array.isArray(attachmentsData) ? attachmentsData : [])
        setEmployees(Array.isArray(employeesPage?.content) ? employeesPage.content : [])
      } catch (e) {
        if (cancelled) return
        if (e instanceof ApiError) setError(e.message)
        else if (e instanceof Error) setError(e.message)
        else setError('Не удалось загрузить задачу')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [planId, taskId, companyId])

  const employeeNameById = useMemo(() => {
    const m = new Map()
    for (const e of employees) m.set(e.id, e.full_name)
    return m
  }, [employees])

  const planExecutionReady =
    plan != null && String(plan.status ?? '').toUpperCase() === 'ACTIVE' && Boolean(plan.approved_at)

  const isPlanEmployee =
    plan != null && employeeIdFromJwt != null && Number(plan.employee_id) === Number(employeeIdFromJwt)

  const isAssignedTeamLead =
    hasTeamLeadRole(roles) &&
    plan != null &&
    plan.team_lead_id != null &&
    employeeIdFromJwt != null &&
    Number(plan.team_lead_id) === Number(employeeIdFromJwt)

  const st = task ? String(task.status ?? '').toUpperCase() : ''
  const statusLabel = TASK_STATUS_LABEL[/** @type {keyof typeof TASK_STATUS_LABEL} */ (st)] ?? task?.status
  const tt = task ? String(task.task_type ?? '').toUpperCase() : ''
  const typeLabel = task
    ? TASK_TYPE_LABEL[/** @type {keyof typeof TASK_TYPE_LABEL} */ (tt)] ?? task.task_type ?? '—'
    : '—'
  const pr = task ? String(task.priority ?? '').toUpperCase() : ''
  const priorityLabel = task
    ? TASK_PRIORITY_LABEL[/** @type {keyof typeof TASK_PRIORITY_LABEL} */ (pr)] ?? task.priority ?? '—'
    : '—'

  return (
    <article className="page">
      <ol className="page__breadcrumbs">
        <li><Link to="/">Главная</Link></li>
        <li><Link to="/development-plans">ИПР</Link></li>
        <li><Link to={`/development-plans/${planId}`}>План #{planId}</Link></li>
        <li>Задача #{taskId}</li>
      </ol>
      <h1 className="page__title">Задача ИПР</h1>

      {error ? <div className="entity-zone__error" role="alert">{error}</div> : null}
      {loading ? <p className="entity-zone__loading">Загрузка…</p> : null}

      {!loading && task ? (
        <section className="entity-zone__summary">
          <header className="entity-zone__idp-hero">
            <div className="entity-zone__idp-hero-main">
              <p className="entity-zone__idp-hero-name">{task.title}</p>
              <div className="entity-zone__idp-chip-row" style={{ marginTop: '0.35rem' }}>
                <span className={taskStatusChipClass(st)}>{statusLabel}</span>
                <span className="entity-zone__idp-chip">{typeLabel}</span>
                <span className="entity-zone__idp-chip">Приоритет: {priorityLabel}</span>
              </div>
              <p className="entity-zone__idp-hero-meta" style={{ marginTop: '0.5rem' }}>
                Срок: {formatDateTimeRuNoSeconds(task.due_date)}
              </p>
            </div>
          </header>

          {task.description ? (
            <section className="entity-zone__idp-section">
              <h2 className="entity-zone__idp-section-title">Описание</h2>
              <p className="entity-zone__idp-muted" style={{ whiteSpace: 'pre-wrap' }}>{task.description}</p>
            </section>
          ) : null}

          <section className="entity-zone__idp-section" aria-labelledby="task-history-heading">
            <h2 id="task-history-heading" className="entity-zone__idp-section-title">История выполнения</h2>
            <div className="entity-zone__idp-cards">
              {progressHistory.length === 0 ? (
                <p className="entity-zone__idp-muted">Записей пока нет.</p>
              ) : (
                progressHistory.map((x) => (
                  <article key={x.id} className="entity-zone__idp-card">
                    <div className="entity-zone__idp-card-head">
                      <span className="entity-zone__idp-card-title">{x.progress_percent}%</span>
                      <span className="entity-zone__idp-chip">{formatDateTimeRuNoSeconds(x.created_at)}</span>
                    </div>
                    <p className="entity-zone__idp-muted">
                      {formatProgressAuthorLine(x, employeeNameById)}
                    </p>
                    {x.comment ? (
                      <p className="entity-zone__idp-muted" style={{ marginTop: '0.35rem' }}>
                        {x.comment}
                      </p>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="entity-zone__idp-section" aria-labelledby="task-comments-heading">
            <h2 id="task-comments-heading" className="entity-zone__idp-section-title">Комментарии</h2>
            <div className="entity-zone__idp-cards">
              {comments.length === 0 ? (
                <p className="entity-zone__idp-muted">Комментариев пока нет.</p>
              ) : (
                comments.map((x) => (
                  <article key={x.id} className="entity-zone__idp-card">
                    <div className="entity-zone__idp-card-head">
                      <span className="entity-zone__idp-chip">{formatDateTimeRuNoSeconds(x.created_at)}</span>
                      <span className="entity-zone__idp-chip">
                        {formatCommentAuthorChip(x, employeeNameById)}
                      </span>
                    </div>
                    <p className="entity-zone__idp-muted" style={{ marginTop: '0.35rem', whiteSpace: 'pre-wrap' }}>
                      {x.comment}
                    </p>
                  </article>
                ))
              )}
            </div>
            {isPlanEmployee && planExecutionReady && task && st !== 'DONE' ? (
              <div style={{ marginTop: '1rem' }}>
                <h3 className="entity-zone__idp-section-title" style={{ fontSize: '1rem' }}>
                  Новый комментарий
                </h3>
                <p className="entity-zone__idp-muted" style={{ marginBottom: '0.5rem' }}>
                  Комментарии фиксируются от имени владельца ИПР (сотрудника).
                </p>
                <textarea
                  className="entity-zone__input"
                  rows={3}
                  value={newComment}
                  onChange={(ev) => setNewComment(ev.target.value)}
                  placeholder="Текст комментария…"
                />
                {commentError ? (
                  <div className="entity-zone__error" role="alert" style={{ marginTop: '0.35rem' }}>
                    {commentError}
                  </div>
                ) : null}
                <div className="entity-zone__actions" style={{ marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="entity-zone__button entity-zone__button--primary"
                    disabled={commentBusy || newComment.trim() === ''}
                    onClick={async () => {
                      if (!planId || !taskId) return
                      setCommentBusy(true)
                      setCommentError(null)
                      try {
                        await developmentPlansApi.addDevelopmentPlanTaskComment(Number(planId), Number(taskId), {
                          comment: newComment.trim(),
                        })
                        setNewComment('')
                        const list = await developmentPlansApi.fetchTaskComments(Number(planId), Number(taskId))
                        setComments(Array.isArray(list) ? list : [])
                      } catch (e) {
                        if (e instanceof ApiError) setCommentError(e.message)
                        else if (e instanceof Error) setCommentError(e.message)
                        else setCommentError('Не удалось отправить комментарий')
                      } finally {
                        setCommentBusy(false)
                      }
                    }}
                  >
                    Отправить
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          {isAssignedTeamLead && planExecutionReady && task && st !== 'DONE' ? (
            <section className="entity-zone__idp-section" aria-labelledby="task-tl-done-heading">
              <h2 id="task-tl-done-heading" className="entity-zone__idp-section-title">
                Завершение задачи (тимлид)
              </h2>
              <p className="entity-zone__idp-muted">
                Перевод в статус «Выполнена» с обязательной оценкой по шкале 1–10.
              </p>
              <label className="entity-zone__field" style={{ maxWidth: '12rem' }}>
                <span className="entity-zone__field-label">Оценка (1–10)</span>
                <input
                  className="entity-zone__input"
                  type="number"
                  min={1}
                  max={10}
                  value={doneScore}
                  onChange={(ev) => setDoneScore(ev.target.value)}
                />
              </label>
              {doneError ? (
                <div className="entity-zone__error" role="alert" style={{ marginTop: '0.35rem' }}>
                  {doneError}
                </div>
              ) : null}
              <div className="entity-zone__actions" style={{ marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="entity-zone__button entity-zone__button--primary"
                  disabled={doneBusy || employeeIdFromJwt == null}
                  onClick={async () => {
                    if (!planId || !taskId || employeeIdFromJwt == null) return
                    const score = Math.trunc(Number(doneScore))
                    if (!Number.isFinite(score) || score < 1 || score > 10) {
                      setDoneError('Введите оценку от 1 до 10')
                      return
                    }
                    setDoneBusy(true)
                    setDoneError(null)
                    try {
                      const updated = await developmentPlansApi.updateDevelopmentPlanTaskStatus(
                        Number(planId),
                        Number(taskId),
                        {
                          participant_employee_id: employeeIdFromJwt,
                          status: 'DONE',
                          team_lead_task_score: score,
                        },
                      )
                      setTask(updated)
                    } catch (e) {
                      if (e instanceof ApiError) setDoneError(e.message)
                      else if (e instanceof Error) setDoneError(e.message)
                      else setDoneError('Не удалось обновить статус')
                    } finally {
                      setDoneBusy(false)
                    }
                  }}
                >
                  Завершить задачу
                </button>
              </div>
            </section>
          ) : null}

          <section className="entity-zone__idp-section" aria-labelledby="task-attach-heading">
            <h2 id="task-attach-heading" className="entity-zone__idp-section-title">Вложения</h2>
            <div className="entity-zone__idp-cards">
              {attachments.length === 0 ? (
                <p className="entity-zone__idp-muted">Файлов пока нет.</p>
              ) : (
                attachments.map((x) => (
                  <article key={x.id} className="entity-zone__idp-card">
                    <div className="entity-zone__idp-card-head">
                      <a className="entity-zone__idp-link" href={x.download_url} target="_blank" rel="noreferrer">
                        {x.file_name}
                      </a>
                    </div>
                    <p className="entity-zone__idp-muted" style={{ marginTop: '0.35rem' }}>
                      {x.content_type ?? '—'}
                    </p>
                    <p className="entity-zone__idp-muted" style={{ marginTop: '0.2rem' }}>
                      {x.size_bytes != null ? `${x.size_bytes} байт` : '—'}
                    </p>
                    <p className="entity-zone__idp-muted" style={{ marginTop: '0.2rem' }}>
                      {formatDateTimeRuNoSeconds(x.created_at)}
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>
        </section>
      ) : null}
    </article>
  )
}
