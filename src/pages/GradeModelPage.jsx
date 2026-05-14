import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, gradeModelApi } from '../api/index.js'
import { resolveCompanyId } from '../config/companyContext.js'
import { ConfirmDialog } from '../components/ConfirmDialog.jsx'
import './pages.css'
import './EntityZone.css'

/**
 * @param {string} value
 * @returns {string | null}
 */
function trimToNull(value) {
  const t = value.trim()
  return t.length > 0 ? t : null
}

export function GradeModelPage() {
  const { companyId } = resolveCompanyId()
  const canManage = true

  const [onlyActive, setOnlyActive] = useState(true)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [actionError, setActionError] = useState(/** @type {string | null} */ (null))
  const [matrix, setMatrix] = useState(
    /** @type {import('../api/gradeModel.js').GradeModelMatrixView | null} */ (null),
  )
  const [positionForm, setPositionForm] = useState(
    /** @type {{ mode: 'create' | 'edit', positionId?: number, code: string, name: string, description: string, isActive: boolean } | null} */ (null),
  )
  const [positionToDeactivate, setPositionToDeactivate] = useState(/** @type {number | null} */ (null))

  const load = useCallback(async () => {
    if (companyId == null) {
      setMatrix(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await gradeModelApi.fetchGradeMatrix(companyId, onlyActive)
      setMatrix(data && typeof data === 'object' ? data : null)
    } catch (e) {
      setMatrix(null)
      if (e instanceof ApiError) {
        setError(e.message)
      } else if (e instanceof Error) {
        setError(e.message)
      } else {
        setError('Не удалось загрузить матрицу грейдов')
      }
    } finally {
      setLoading(false)
    }
  }, [companyId, onlyActive])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!positionForm) {
      return
    }
    const onKeyDown = (ev) => {
      if (ev.key === 'Escape' && !submitting) {
        setPositionForm(null)
    setPositionToDeactivate(null)
    setActionError(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [positionForm, submitting])

  const positions = matrix?.positions && Array.isArray(matrix.positions) ? matrix.positions : []

  /** @param {import('../api/gradeModel.js').PositionView} p */
  function openEditPosition(p) {
    setActionError(null)
    setPositionForm({
      mode: 'edit',
      positionId: p.id,
      code: p.code ?? '',
      name: p.name ?? '',
      description: p.description ?? '',
      isActive: Boolean(p.is_active),
    })
  }

  async function handleSavePosition() {
    if (!positionForm || companyId == null) {
      return
    }
    const code = positionForm.code.trim()
    const name = positionForm.name.trim()
    if (!code || !name) {
      setActionError('Для должности обязательны код и название.')
      return
    }

    setSubmitting(true)
    setActionError(null)
    try {
      const payload = {
        code,
        name,
        description: trimToNull(positionForm.description),
        is_active: positionForm.isActive,
      }
      if (positionForm.mode === 'create') {
        await gradeModelApi.createPosition(companyId, payload)
      } else {
        await gradeModelApi.updatePosition(positionForm.positionId, payload)
      }
      setPositionForm(null)
      setPositionToDeactivate(null)
      await load()
    } catch (e) {
      if (e instanceof ApiError) {
        setActionError(e.message)
      } else if (e instanceof Error) {
        setActionError(e.message)
      } else {
        setActionError('Не удалось сохранить должность')
      }
    } finally {
      setSubmitting(false)
    }
  }

  /** @param {number} positionId */
  async function handleDeactivatePosition(positionId) {
    setSubmitting(true)
    setActionError(null)
    try {
      await gradeModelApi.deactivatePosition(positionId)
      setPositionForm(null)
      setPositionToDeactivate(null)
      await load()
    } catch (e) {
      if (e instanceof ApiError) {
        setActionError(e.message)
      } else if (e instanceof Error) {
        setActionError(e.message)
      } else {
        setActionError('Не удалось деактивировать должность')
      }
    } finally {
      setSubmitting(false)
    }
  }

  function closeModal() {
    if (submitting) {
      return
    }
    setPositionForm(null)
    setPositionToDeactivate(null)
    setActionError(null)
  }

  return (
    <article className="page">
      <ol className="page__breadcrumbs">
        <li>
          <Link to="/">Главная</Link>
        </li>
        <li>Матрица грейдов</li>
      </ol>

      <h1 className="page__title">Матрица грейдов</h1>

      {companyId == null ? (
        <div className="entity-zone__error" role="status">
          Не удалось определить компанию для загрузки матрицы. Обновите страницу или войдите заново.
        </div>
      ) : (
        <div className="entity-zone__toolbar">
          <label className="entity-zone__toggle">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(ev) => setOnlyActive(ev.target.checked)}
            />
            Только активные должности
          </label>

          {canManage ? (
            <button
              type="button"
              className="entity-zone__icon-button"
              onClick={() => {
                setActionError(null)
                setPositionForm({
                  mode: 'create',
                  code: '',
                  name: '',
                  description: '',
                  isActive: true,
                })
              }}
              title="Добавить должность"
              aria-label="Добавить должность"
              disabled={submitting}
            >
              +
            </button>
          ) : null}
        </div>
      )}

      {error ? (
        <div className="entity-zone__error" role="alert">
          {error}
        </div>
      ) : null}

      {actionError && !positionForm ? (
        <div className="entity-zone__error" role="alert">
          {actionError}
        </div>
      ) : null}

      {loading ? <p className="entity-zone__loading">Загрузка…</p> : null}

      {!loading && companyId != null && positions.length === 0 && !error ? (
        <p className="entity-zone__empty">В матрице пока нет данных.</p>
      ) : null}

      {!loading && positions.length > 0 ? (
        <div className="entity-zone__grid">
          {positions.map((row) => {
            const p = row.position
            const grades = Array.isArray(row.grades) ? row.grades : []

            return (
              <article key={p.id} className="entity-zone__card entity-zone__card--panel">
                <div className="entity-zone__card-head">
                  <div>
                    <div className="entity-zone__card-name">{p.name}</div>
                  </div>
                </div>

                <div className="entity-zone__card-meta">
                  <span
                    className={
                      p.is_active
                        ? 'entity-zone__badge entity-zone__badge--active'
                        : 'entity-zone__badge entity-zone__badge--inactive'
                    }
                  >
                    {p.is_active ? 'Должность активна' : 'Должность неактивна'}
                  </span>
                  <Link
                    to={`/grade-model/positions/${p.id}`}
                    className="entity-zone__badge entity-zone__badge-link"
                  >
                    {grades.length} грейдов
                  </Link>

                  {canManage ? (
                    <span className="entity-zone__icon-actions">
                      <button
                        type="button"
                        className="entity-zone__icon-button"
                        title="Редактировать должность"
                        aria-label="Редактировать должность"
                        onClick={() => openEditPosition(p)}
                        disabled={submitting}
                      >
                        ✎
              </button>
                      <button
                        type="button"
                        className="entity-zone__icon-button entity-zone__icon-button--danger"
                        title="Деактивировать должность"
                        aria-label="Деактивировать должность"
                        onClick={() => setPositionToDeactivate(p.id)}
                        disabled={submitting || !p.is_active}
                      >
                        −
              </button>
                    </span>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      ) : null}

      {positionForm ? (
        <div className="entity-zone__modal-backdrop" role="presentation" onClick={closeModal}>
          <section
            className="entity-zone__modal"
            role="dialog"
            aria-modal="true"
            aria-label={positionForm.mode === 'create' ? 'Создание должности' : 'Редактирование должности'}
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="entity-zone__modal-head">
              <h3 className="entity-zone__modal-title">
                {positionForm.mode === 'create' ? 'Новая должность' : 'Редактирование должности'}
              </h3>
              <button
                type="button"
                className="entity-zone__icon-button"
                onClick={closeModal}
                aria-label="Закрыть"
                disabled={submitting}
              >
                ×
              </button>
            </div>

            {actionError ? (
              <div className="entity-zone__error" role="alert">
                {actionError}
              </div>
            ) : null}

            <div className="entity-zone__filters">
              <label className="entity-zone__field">
                <span className="entity-zone__field-label">Код</span>
                <input
                  className="entity-zone__input"
                  value={positionForm.code}
                  onChange={(ev) => setPositionForm((f) => (f ? { ...f, code: ev.target.value } : f))}
                />
              </label>
              <label className="entity-zone__field">
                <span className="entity-zone__field-label">Название</span>
                <input
                  className="entity-zone__input"
                  value={positionForm.name}
                  onChange={(ev) => setPositionForm((f) => (f ? { ...f, name: ev.target.value } : f))}
                />
              </label>
              <label className="entity-zone__field entity-zone__field--wide">
                <span className="entity-zone__field-label">Описание</span>
                <input
                  className="entity-zone__input"
                  value={positionForm.description}
                  onChange={(ev) => setPositionForm((f) => (f ? { ...f, description: ev.target.value } : f))}
                />
              </label>
            </div>

            <div className="entity-zone__actions">
              <button
                type="button"
                className="entity-zone__button entity-zone__button--primary"
                onClick={handleSavePosition}
                disabled={submitting}
              >
                Сохранить
              </button>
              <button type="button" className="entity-zone__button" onClick={closeModal} disabled={submitting}>
                Отмена
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <ConfirmDialog
        open={positionToDeactivate != null}
        title="Подтвердите действие"
        message="Деактивировать должность?"
        confirmLabel="Деактивировать"
        cancelLabel="Отменить"
        destructive
        busy={submitting}
        onCancel={() => (!submitting ? setPositionToDeactivate(null) : undefined)}
        onConfirm={() => {
          if (positionToDeactivate != null) {
            void handleDeactivatePosition(positionToDeactivate)
          }
        }}
      />
    </article>
  )
}
