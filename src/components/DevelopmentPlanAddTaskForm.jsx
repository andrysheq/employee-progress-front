import { useState } from 'react'
import { ApiError, developmentPlansApi } from '../api/index.js'
import { idpTaskDraftToApiPayload, newIdpTaskDraft } from '../utils/idpTaskDraft.js'
import { IDP_TASK_PRIORITY_OPTIONS, IDP_TASK_TYPE_OPTIONS } from '../utils/idpSelectOptions.js'
import { SelectDropdown } from './ui/SelectDropdown.jsx'

/**
 * @param {object} props
 * @param {number} props.planId
 * @param {string} [props.defaultPlannedStartDate] ISO date YYYY-MM-DD for period start
 * @param {() => Promise<void>} props.onCreated
 */
export function DevelopmentPlanAddTaskForm({ planId, defaultPlannedStartDate, onCreated }) {
  const [draft, setDraft] = useState(() => {
    const base = newIdpTaskDraft()
    if (defaultPlannedStartDate) {
      base.taskPlannedStartDate = defaultPlannedStartDate.slice(0, 10)
    }
    return base
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  return (
    <div className="entity-zone__idp-section" style={{ marginTop: '1rem' }}>
      <h3 className="entity-zone__idp-section-title">Добавить задачу</h3>
      <div className="entity-zone__filters entity-zone__filters--idp-task-row1">
        <label className="entity-zone__field">
          <span className="entity-zone__field-label">Тип</span>
          <SelectDropdown
            value={draft.taskType}
            onChange={(next) => setDraft((prev) => ({ ...prev, taskType: next }))}
            options={IDP_TASK_TYPE_OPTIONS}
          />
        </label>
        <label className="entity-zone__field">
          <span className="entity-zone__field-label">Приоритет</span>
          <SelectDropdown
            value={draft.taskPriority}
            onChange={(next) => setDraft((prev) => ({ ...prev, taskPriority: next }))}
            options={IDP_TASK_PRIORITY_OPTIONS}
          />
        </label>
        <label className="entity-zone__field entity-zone__field--grow">
          <span className="entity-zone__field-label">Название</span>
          <input
            className="entity-zone__input"
            value={draft.taskTitle}
            onChange={(ev) => setDraft((prev) => ({ ...prev, taskTitle: ev.target.value }))}
          />
        </label>
      </div>
      <div className="entity-zone__filters entity-zone__filters--idp-task-row1" style={{ marginTop: '0.5rem' }}>
        <label className="entity-zone__field entity-zone__field--grow">
          <span className="entity-zone__field-label">Описание</span>
          <input
            className="entity-zone__input"
            value={draft.taskDescription}
            onChange={(ev) => setDraft((prev) => ({ ...prev, taskDescription: ev.target.value }))}
          />
        </label>
        <label className="entity-zone__field entity-zone__field--grow">
          <span className="entity-zone__field-label">Критерии успеха</span>
          <input
            className="entity-zone__input"
            value={draft.taskSuccessCriteria}
            onChange={(ev) => setDraft((prev) => ({ ...prev, taskSuccessCriteria: ev.target.value }))}
          />
        </label>
      </div>
      <div className="entity-zone__filters entity-zone__filters--idp-task-row2" style={{ marginTop: '0.5rem' }}>
        <label className="entity-zone__field">
          <span className="entity-zone__field-label">Плановая дата старта</span>
          <input
            className="entity-zone__input"
            type="date"
            value={draft.taskPlannedStartDate}
            onChange={(ev) => setDraft((prev) => ({ ...prev, taskPlannedStartDate: ev.target.value }))}
          />
        </label>
        <label className="entity-zone__field">
          <span className="entity-zone__field-label">Длительность (дней)</span>
          <input
            className="entity-zone__input"
            type="number"
            min={1}
            value={draft.taskDurationDays}
            onChange={(ev) => setDraft((prev) => ({ ...prev, taskDurationDays: ev.target.value }))}
          />
        </label>
        <label className="entity-zone__field">
          <span className="entity-zone__field-label">Трудоёмкость (час.)</span>
          <input
            className="entity-zone__input"
            type="number"
            min={0}
            value={draft.taskEffortHoursPlanned}
            onChange={(ev) => setDraft((prev) => ({ ...prev, taskEffortHoursPlanned: ev.target.value }))}
          />
        </label>
      </div>
      {error ? (
        <div className="entity-zone__error" role="alert" style={{ marginTop: '0.5rem' }}>
          {error}
        </div>
      ) : null}
      <div className="entity-zone__actions" style={{ marginTop: '0.5rem' }}>
        <button
          type="button"
          className="entity-zone__button entity-zone__button--primary"
          disabled={
            busy ||
            draft.taskTitle.trim() === '' ||
            draft.taskDescription.trim() === '' ||
            draft.taskSuccessCriteria.trim() === '' ||
            !Number.isFinite(Number(draft.taskDurationDays)) ||
            Number(draft.taskDurationDays) < 1
          }
          onClick={async () => {
            setBusy(true)
            setError(null)
            try {
              await developmentPlansApi.createDevelopmentPlanTask(planId, idpTaskDraftToApiPayload(draft))
              const reset = newIdpTaskDraft()
              if (defaultPlannedStartDate) {
                reset.taskPlannedStartDate = defaultPlannedStartDate.slice(0, 10)
              }
              setDraft(reset)
              await onCreated()
            } catch (e) {
              if (e instanceof ApiError) setError(e.message)
              else if (e instanceof Error) setError(e.message)
              else setError('Не удалось создать задачу')
            } finally {
              setBusy(false)
            }
          }}
        >
          Сохранить задачу
        </button>
      </div>
    </div>
  )
}
