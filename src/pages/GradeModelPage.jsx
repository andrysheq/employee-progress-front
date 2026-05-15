import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, gradeModelApi } from '../api/index.js'
import { resolveCompanyId } from '../config/companyContext.js'
import { ConfirmDialog } from '../components/ConfirmDialog.jsx'
import { SpotlightCard } from '../components/ui/SpotlightCard.jsx'
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
  const navigate = useNavigate()
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

  const [competencyModalOpen, setCompetencyModalOpen] = useState(false)
  const [competencyList, setCompetencyList] = useState(
    /** @type {import('../api/gradeModel.js').CompetencyView[]} */ ([]),
  )
  const [competencyListLoading, setCompetencyListLoading] = useState(false)
  const [competencyActionError, setCompetencyActionError] = useState(/** @type {string | null} */ (null))
  const [competencyForm, setCompetencyForm] = useState(
    /** @type {{ mode: 'create' | 'edit', id?: number, code: string, name: string, description: string } | null} */ (null),
  )
  const [competencyToDelete, setCompetencyToDelete] = useState(/** @type {number | null} */ (null))

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
    if (!competencyModalOpen || competencyForm != null) {
      return
    }
    const onKeyDown = (ev) => {
      if (ev.key === 'Escape' && !submitting) {
        setCompetencyModalOpen(false)
        setCompetencyActionError(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [competencyModalOpen, competencyForm, submitting])

  useEffect(() => {
    if (!competencyModalOpen || competencyForm != null) {
      return
    }
    let cancelled = false
    async function run() {
      setCompetencyListLoading(true)
      setCompetencyActionError(null)
      try {
        const list = await gradeModelApi.fetchCompetencies()
        if (!cancelled) {
          setCompetencyList(Array.isArray(list) ? list : [])
        }
      } catch (e) {
        if (!cancelled) {
          setCompetencyList([])
          if (e instanceof ApiError) setCompetencyActionError(e.message)
          else if (e instanceof Error) setCompetencyActionError(e.message)
          else setCompetencyActionError('Не удалось загрузить компетенции')
        }
      } finally {
        if (!cancelled) setCompetencyListLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [competencyModalOpen, competencyForm])

  useEffect(() => {
    if (!competencyForm) {
      return
    }
    const onKeyDown = (ev) => {
      if (ev.key === 'Escape' && !submitting) {
        setCompetencyForm(null)
        setCompetencyActionError(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [competencyForm, submitting])

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

  function closeCompetencyModal() {
    if (submitting) {
      return
    }
    setCompetencyModalOpen(false)
    setCompetencyForm(null)
    setCompetencyActionError(null)
    setCompetencyToDelete(null)
  }

  function onCompetencyBackdropClick() {
    if (submitting) {
      return
    }
    if (competencyForm != null) {
      setCompetencyForm(null)
      setCompetencyActionError(null)
      return
    }
    closeCompetencyModal()
  }

  /** @param {import('../api/gradeModel.js').CompetencyView} c */
  function openEditCompetency(c) {
    setCompetencyActionError(null)
    setCompetencyForm({
      mode: 'edit',
      id: c.id,
      code: c.code ?? '',
      name: c.name ?? '',
      description: c.description ?? '',
    })
  }

  function openCreateCompetency() {
    setCompetencyActionError(null)
    setCompetencyForm({
      mode: 'create',
      code: '',
      name: '',
      description: '',
    })
  }

  async function handleSaveCompetency() {
    if (!competencyForm) {
      return
    }
    const code = competencyForm.code.trim()
    const name = competencyForm.name.trim()
    if (!code || !name) {
      setCompetencyActionError('Укажите код и наименование компетенции.')
      return
    }
    setSubmitting(true)
    setCompetencyActionError(null)
    try {
      const payload = {
        code,
        name,
        description: trimToNull(competencyForm.description),
      }
      if (competencyForm.mode === 'create') {
        await gradeModelApi.createCompetency(payload)
      } else if (competencyForm.id != null) {
        await gradeModelApi.updateCompetency(competencyForm.id, payload)
      }
      setCompetencyForm(null)
      const list = await gradeModelApi.fetchCompetencies()
      setCompetencyList(Array.isArray(list) ? list : [])
    } catch (e) {
      if (e instanceof ApiError) setCompetencyActionError(e.message)
      else if (e instanceof Error) setCompetencyActionError(e.message)
      else setCompetencyActionError('Не удалось сохранить компетенцию')
    } finally {
      setSubmitting(false)
    }
  }

  /** @param {number} competencyId */
  async function handleConfirmDeleteCompetency(competencyId) {
    setSubmitting(true)
    setCompetencyActionError(null)
    try {
      await gradeModelApi.deleteCompetency(competencyId)
      setCompetencyToDelete(null)
      const list = await gradeModelApi.fetchCompetencies()
      setCompetencyList(Array.isArray(list) ? list : [])
    } catch (e) {
      if (e instanceof ApiError) setCompetencyActionError(e.message)
      else if (e instanceof Error) setCompetencyActionError(e.message)
      else setCompetencyActionError('Не удалось удалить компетенцию')
    } finally {
      setSubmitting(false)
    }
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
        <div className="entity-zone__toolbar entity-zone__toolbar--spread">
          <label className="entity-zone__toggle">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(ev) => setOnlyActive(ev.target.checked)}
            />
            Только активные должности
          </label>

          {canManage ? (
            <div className="entity-zone__toolbar-actions">
              <button
                type="button"
                className="entity-zone__button"
                onClick={() => {
                  setCompetencyModalOpen(true)
                  setCompetencyForm(null)
                  setCompetencyActionError(null)
                  setCompetencyToDelete(null)
                }}
                disabled={submitting}
              >
                Компетенции
              </button>
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
            </div>
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
        <div className="entity-zone__grid entity-zone__grid--idp">
          {positions.map((row) => {
            const p = row.position
            const grades = Array.isArray(row.grades) ? row.grades : []
            const positionUrl = `/grade-model/positions/${p.id}`

            return (
              <SpotlightCard
                key={p.id}
                neutral
                className="entity-zone__card--clickable grade-matrix-spotlight-card"
                role="link"
                tabIndex={0}
                aria-label={`Открыть грейды должности: ${p.name ?? ''}`}
                onClick={() => navigate(positionUrl)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault()
                    navigate(positionUrl)
                  }
                }}
              >
                <div className="entity-zone__card-head">
                  <div>
                    <div className="entity-zone__card-name">{p.name}</div>
                    {p.code ? <div className="entity-zone__card-code">{p.code}</div> : null}
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
                  <span className="entity-zone__badge">{grades.length} грейдов</span>

                  {canManage ? (
                    <span className="entity-zone__icon-actions">
                      <button
                        type="button"
                        className="entity-zone__icon-button"
                        title="Редактировать должность"
                        aria-label="Редактировать должность"
                        onClick={(ev) => {
                          ev.stopPropagation()
                          openEditPosition(p)
                        }}
                        disabled={submitting}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="entity-zone__icon-button entity-zone__icon-button--danger"
                        title="Деактивировать должность"
                        aria-label="Деактивировать должность"
                        onClick={(ev) => {
                          ev.stopPropagation()
                          setPositionToDeactivate(p.id)
                        }}
                        disabled={submitting || !p.is_active}
                      >
                        −
                      </button>
                    </span>
                  ) : null}
                </div>
              </SpotlightCard>
            )
          })}
        </div>
      ) : null}

      {competencyModalOpen ? (
        <div className="entity-zone__modal-backdrop" role="presentation" onClick={onCompetencyBackdropClick}>
          <section
            className={`entity-zone__modal${competencyForm ? '' : ' entity-zone__modal--wide'}`}
            role="dialog"
            aria-modal="true"
            aria-label={
              competencyForm == null
                ? 'Справочник компетенций'
                : competencyForm.mode === 'create'
                  ? 'Новая компетенция'
                  : 'Редактирование компетенции'
            }
            onClick={(ev) => ev.stopPropagation()}
          >
            {competencyForm == null ? (
              <>
                <div className="entity-zone__modal-head">
                  <h3 className="entity-zone__modal-title">Компетенции</h3>
                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="entity-zone__button entity-zone__button--primary"
                      onClick={openCreateCompetency}
                      disabled={submitting || competencyListLoading}
                    >
                      Добавить
                    </button>
                    <button
                      type="button"
                      className="entity-zone__icon-button"
                      onClick={closeCompetencyModal}
                      aria-label="Закрыть"
                      disabled={submitting}
                    >
                      ×
                    </button>
                  </div>
                </div>

                {competencyActionError ? (
                  <div className="entity-zone__error" role="alert">
                    {competencyActionError}
                  </div>
                ) : null}

                {competencyListLoading ? (
                  <p className="entity-zone__loading">Загрузка списка…</p>
                ) : competencyList.length === 0 ? (
                  <p className="entity-zone__muted">Компетенций пока нет. Нажмите «Добавить», чтобы создать первую.</p>
                ) : (
                  <div className="entity-zone__competency-table" role="table" aria-label="Список компетенций">
                    <div className="entity-zone__competency-head" role="row">
                      <span role="columnheader">Код</span>
                      <span role="columnheader">Наименование</span>
                      <span role="columnheader">Описание</span>
                      <span role="columnheader">Действия</span>
                    </div>
                    {competencyList.map((c) => (
                      <div key={c.id} className="entity-zone__competency-row" role="row">
                        <span>{c.code ?? '—'}</span>
                        <span>{c.name ?? '—'}</span>
                        <span className="entity-zone__competency-desc" title={c.description ?? undefined}>
                          {c.description?.trim() ? c.description : '—'}
                        </span>
                        <span className="entity-zone__icon-actions">
                          <button
                            type="button"
                            className="entity-zone__icon-button"
                            title="Редактировать"
                            aria-label="Редактировать компетенцию"
                            onClick={() => openEditCompetency(c)}
                            disabled={submitting}
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="entity-zone__icon-button entity-zone__icon-button--danger"
                            title="Удалить"
                            aria-label="Удалить компетенцию"
                            onClick={() => setCompetencyToDelete(c.id)}
                            disabled={submitting}
                          >
                            −
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="entity-zone__modal-head">
                  <h3 className="entity-zone__modal-title">
                    {competencyForm.mode === 'create' ? 'Новая компетенция' : 'Редактирование компетенции'}
                  </h3>
                  <button
                    type="button"
                    className="entity-zone__icon-button"
                    onClick={() => (!submitting ? setCompetencyForm(null) : undefined)}
                    aria-label="Назад к списку"
                    disabled={submitting}
                  >
                    ×
                  </button>
                </div>

                {competencyActionError ? (
                  <div className="entity-zone__error" role="alert">
                    {competencyActionError}
                  </div>
                ) : null}

                <div className="entity-zone__filters">
                  <label className="entity-zone__field">
                    <span className="entity-zone__field-label">Код</span>
                    <input
                      className="entity-zone__input"
                      value={competencyForm.code}
                      onChange={(ev) =>
                        setCompetencyForm((f) => (f ? { ...f, code: ev.target.value } : f))
                      }
                    />
                  </label>
                  <label className="entity-zone__field entity-zone__field--wide">
                    <span className="entity-zone__field-label">Наименование</span>
                    <input
                      className="entity-zone__input"
                      value={competencyForm.name}
                      onChange={(ev) =>
                        setCompetencyForm((f) => (f ? { ...f, name: ev.target.value } : f))
                      }
                    />
                  </label>
                  <label className="entity-zone__field entity-zone__field--wide">
                    <span className="entity-zone__field-label">Описание</span>
                    <input
                      className="entity-zone__input"
                      value={competencyForm.description}
                      onChange={(ev) =>
                        setCompetencyForm((f) => (f ? { ...f, description: ev.target.value } : f))
                      }
                    />
                  </label>
                </div>

                <div className="entity-zone__actions">
                  <button
                    type="button"
                    className="entity-zone__button entity-zone__button--primary"
                    onClick={() => void handleSaveCompetency()}
                    disabled={submitting}
                  >
                    Сохранить
                  </button>
                  <button
                    type="button"
                    className="entity-zone__button"
                    onClick={() => (!submitting ? setCompetencyForm(null) : undefined)}
                    disabled={submitting}
                  >
                    Отмена
                  </button>
                </div>
              </>
            )}
          </section>
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
        open={competencyToDelete != null}
        title="Подтвердите действие"
        message={
          competencyToDelete != null
            ? `Удалить компетенцию «${
                competencyList.find((x) => x.id === competencyToDelete)?.name ?? 'запись'
              }»? Связанные критерии в грейдах могут перестать быть доступны.`
            : ''
        }
        confirmLabel="Удалить"
        cancelLabel="Отменить"
        destructive
        busy={submitting}
        onCancel={() => (!submitting ? setCompetencyToDelete(null) : undefined)}
        onConfirm={() => {
          if (competencyToDelete != null) {
            void handleConfirmDeleteCompetency(competencyToDelete)
          }
        }}
      />

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
