import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, gradeModelApi } from '../api/index.js'
import { resolveCompanyId } from '../config/companyContext.js'
import './pages.css'
import './EntityZone.css'

/**
 * @param {import('../api/gradeModel.js').GradeView} g
 */
function gradeSalaryLine(g) {
  const min = g.salary_min_amount
  const max = g.salary_max_amount
  if (min == null && max == null) {
    return null
  }
  if (min != null && max != null) {
    return `${min}–${max}`
  }
  if (min != null) {
    return `от ${min}`
  }
  return `до ${max}`
}

/**
 * @param {string} value
 * @returns {string | null}
 */
function trimToNull(value) {
  const t = value.trim()
  return t.length > 0 ? t : null
}

/**
 * @param {string} value
 * @returns {number | null}
 */
function toNullableInt(value) {
  const t = value.trim()
  if (!t) {
    return null
  }
  const n = Number(t)
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw new Error('Введите целое число')
  }
  return n
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
  const [gradeForm, setGradeForm] = useState(
    /** @type {{ mode: 'create' | 'edit', gradeId?: number, positionId: number, code: string, name: string, description: string, levelOrder: string, salaryMinAmount: string, salaryMaxAmount: string, isActive: boolean } | null} */ (null),
  )

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
    const modalOpen = positionForm != null || gradeForm != null
    if (!modalOpen) {
      return
    }
    const onKeyDown = (ev) => {
      if (ev.key === 'Escape' && !submitting) {
        setPositionForm(null)
        setGradeForm(null)
        setActionError(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [positionForm, gradeForm, submitting])

  const positions = matrix?.positions && Array.isArray(matrix.positions) ? matrix.positions : []

  /** @param {import('../api/gradeModel.js').PositionView} p */
  function openEditPosition(p) {
    setActionError(null)
    setGradeForm(null)
    setPositionForm({
      mode: 'edit',
      positionId: p.id,
      code: p.code ?? '',
      name: p.name ?? '',
      description: p.description ?? '',
      isActive: Boolean(p.is_active),
    })
  }

  /** @param {number} positionId */
  function openCreateGrade(positionId) {
    setActionError(null)
    setPositionForm(null)
    setGradeForm({
      mode: 'create',
      positionId,
      code: '',
      name: '',
      description: '',
      levelOrder: '',
      salaryMinAmount: '',
      salaryMaxAmount: '',
      isActive: true,
    })
  }

  /** @param {import('../api/gradeModel.js').GradeView} g @param {number} positionId */
  function openEditGrade(g, positionId) {
    setActionError(null)
    setPositionForm(null)
    setGradeForm({
      mode: 'edit',
      gradeId: g.id,
      positionId,
      code: g.code ?? '',
      name: g.name ?? '',
      description: g.description ?? '',
      levelOrder: g.level_order == null ? '' : String(g.level_order),
      salaryMinAmount: g.salary_min_amount == null ? '' : String(g.salary_min_amount),
      salaryMaxAmount: g.salary_max_amount == null ? '' : String(g.salary_max_amount),
      isActive: Boolean(g.is_active),
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

  async function handleSaveGrade() {
    if (!gradeForm || companyId == null) {
      return
    }
    const code = gradeForm.code.trim()
    const name = gradeForm.name.trim()
    if (!code || !name) {
      setActionError('Для грейда обязательны код и название.')
      return
    }

    let levelOrder
    let min
    let max
    try {
      levelOrder = toNullableInt(gradeForm.levelOrder)
      if (levelOrder == null) {
        setActionError('Для грейда обязателен порядок.')
        return
      }
      min = toNullableInt(gradeForm.salaryMinAmount)
      max = toNullableInt(gradeForm.salaryMaxAmount)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Некорректные числовые поля')
      return
    }

    if (min != null && min < 0) {
      setActionError('Минимальная зарплата не может быть отрицательной.')
      return
    }
    if (max != null && max < 0) {
      setActionError('Максимальная зарплата не может быть отрицательной.')
      return
    }
    if (min != null && max != null && max < min) {
      setActionError('Максимальная зарплата должна быть больше или равна минимальной.')
      return
    }

    setSubmitting(true)
    setActionError(null)
    try {
      const payload = {
        position_id: gradeForm.positionId,
        code,
        name,
        level_order: levelOrder,
        description: trimToNull(gradeForm.description),
        salary_min_amount: min,
        salary_max_amount: max,
        is_active: gradeForm.isActive,
      }

      if (gradeForm.mode === 'create') {
        await gradeModelApi.createGrade(companyId, payload)
      } else {
        await gradeModelApi.updateGrade(gradeForm.gradeId, payload)
      }

      setGradeForm(null)
      await load()
    } catch (e) {
      if (e instanceof ApiError) {
        setActionError(e.message)
      } else if (e instanceof Error) {
        setActionError(e.message)
      } else {
        setActionError('Не удалось сохранить грейд')
      }
    } finally {
      setSubmitting(false)
    }
  }

  /** @param {number} positionId */
  async function handleDeactivatePosition(positionId) {
    if (!window.confirm('Деактивировать должность?')) {
      return
    }
    setSubmitting(true)
    setActionError(null)
    try {
      await gradeModelApi.deactivatePosition(positionId)
      setPositionForm(null)
      setGradeForm(null)
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

  /** @param {number} gradeId */
  async function handleDeactivateGrade(gradeId) {
    if (!window.confirm('Деактивировать грейд?')) {
      return
    }
    setSubmitting(true)
    setActionError(null)
    try {
      await gradeModelApi.deactivateGrade(gradeId)
      setGradeForm(null)
      await load()
    } catch (e) {
      if (e instanceof ApiError) {
        setActionError(e.message)
      } else if (e instanceof Error) {
        setActionError(e.message)
      } else {
        setActionError('Не удалось деактивировать грейд')
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
    setGradeForm(null)
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
      <p className="page__lead">Должности и линейки грейдов вашей компании.</p>

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
            Только активные должности и грейды
          </label>

          {canManage ? (
            <button
              type="button"
              className="entity-zone__icon-button"
              onClick={() => {
                setActionError(null)
                setGradeForm(null)
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

      {actionError && !(positionForm || gradeForm) ? (
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
            const grades = Array.isArray(row.grades) ? [...row.grades] : []
            grades.sort((a, b) => (a.level_order ?? 0) - (b.level_order ?? 0))

            return (
              <article key={p.id} className="entity-zone__card">
                <div className="entity-zone__card-name">{p.name}</div>
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
                        title="Добавить грейд"
                        aria-label="Добавить грейд"
                        onClick={() => openCreateGrade(p.id)}
                        disabled={submitting}
                      >
                        +
                      </button>
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
                        onClick={() => void handleDeactivatePosition(p.id)}
                        disabled={submitting || !p.is_active}
                      >
                        −
                      </button>
                    </span>
                  ) : null}
                </div>

                <div className="entity-zone__matrix-block">
                  <div className="entity-zone__matrix-block-title">Грейды</div>
                  <div className="entity-zone__grades-table">
                    <div className={`entity-zone__grades-head${canManage ? ' entity-zone__grades-head--manage' : ''}`}>
                      <span>Название</span>
                      <span>Зарплатная вилка</span>
                      <span>Порядок</span>
                      {canManage ? <span>Действия</span> : null}
                    </div>
                    {grades.length === 0 ? (
                      <p className="entity-zone__muted">Грейды не добавлены.</p>
                    ) : (
                      grades.map((g) => {
                        const salary = gradeSalaryLine(g)
                        return (
                          <div key={g.id} className={`entity-zone__grades-row${canManage ? ' entity-zone__grades-row--manage' : ''}`}>
                            <span>{g.name || '—'}</span>
                            <span>{salary ?? '—'}</span>
                            <span>{g.level_order ?? '—'}</span>
                            {canManage ? (
                              <span className="entity-zone__icon-actions">
                                <button
                                  type="button"
                                  className="entity-zone__icon-button"
                                  title="Редактировать грейд"
                                  aria-label="Редактировать грейд"
                                  onClick={() => openEditGrade(g, p.id)}
                                  disabled={submitting}
                                >
                                  ✎
                                </button>
                                <button
                                  type="button"
                                  className="entity-zone__icon-button entity-zone__icon-button--danger"
                                  title="Деактивировать грейд"
                                  aria-label="Деактивировать грейд"
                                  onClick={() => void handleDeactivateGrade(g.id)}
                                  disabled={submitting || !g.is_active}
                                >
                                  −
                                </button>
                              </span>
                            ) : null}
                          </div>
                        )
                      })
                    )}
                  </div>
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

      {gradeForm ? (
        <div className="entity-zone__modal-backdrop" role="presentation" onClick={closeModal}>
          <section
            className="entity-zone__modal"
            role="dialog"
            aria-modal="true"
            aria-label={gradeForm.mode === 'create' ? 'Создание грейда' : 'Редактирование грейда'}
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="entity-zone__modal-head">
              <h3 className="entity-zone__modal-title">
                {gradeForm.mode === 'create' ? 'Новый грейд' : 'Редактирование грейда'}
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
                  value={gradeForm.code}
                  onChange={(ev) => setGradeForm((f) => (f ? { ...f, code: ev.target.value } : f))}
                />
              </label>
              <label className="entity-zone__field">
                <span className="entity-zone__field-label">Название</span>
                <input
                  className="entity-zone__input"
                  value={gradeForm.name}
                  onChange={(ev) => setGradeForm((f) => (f ? { ...f, name: ev.target.value } : f))}
                />
              </label>
              <label className="entity-zone__field">
                <span className="entity-zone__field-label">Порядок</span>
                <input
                  className="entity-zone__input"
                  type="number"
                  step="1"
                  value={gradeForm.levelOrder}
                  onChange={(ev) => setGradeForm((f) => (f ? { ...f, levelOrder: ev.target.value } : f))}
                />
              </label>
              <label className="entity-zone__field">
                <span className="entity-zone__field-label">Мин. зарплата</span>
                <input
                  className="entity-zone__input"
                  type="number"
                  step="1"
                  value={gradeForm.salaryMinAmount}
                  onChange={(ev) => setGradeForm((f) => (f ? { ...f, salaryMinAmount: ev.target.value } : f))}
                />
              </label>
              <label className="entity-zone__field">
                <span className="entity-zone__field-label">Макс. зарплата</span>
                <input
                  className="entity-zone__input"
                  type="number"
                  step="1"
                  value={gradeForm.salaryMaxAmount}
                  onChange={(ev) => setGradeForm((f) => (f ? { ...f, salaryMaxAmount: ev.target.value } : f))}
                />
              </label>
              <label className="entity-zone__field entity-zone__field--wide">
                <span className="entity-zone__field-label">Описание</span>
                <input
                  className="entity-zone__input"
                  value={gradeForm.description}
                  onChange={(ev) => setGradeForm((f) => (f ? { ...f, description: ev.target.value } : f))}
                />
              </label>
            </div>

            <div className="entity-zone__actions">
              <button
                type="button"
                className="entity-zone__button entity-zone__button--primary"
                onClick={handleSaveGrade}
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
    </article>
  )
}
