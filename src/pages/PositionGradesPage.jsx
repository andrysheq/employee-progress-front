import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, gradeModelApi } from '../api/index.js'
import { resolveCompanyId } from '../config/companyContext.js'
import { ConfirmDialog } from '../components/ConfirmDialog.jsx'
import './pages.css'
import './EntityZone.css'

/**
 * @param {import('../api/gradeModel.js').GradeView} g
 */
function gradeSalaryLine(g) {
  const min = g.salary_min_amount
  const max = g.salary_max_amount
  const formatMoney = (value) => String(Math.trunc(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  if (min == null && max == null) {
    return null
  }
  if (min != null && max != null) {
    return `${formatMoney(min)}-${formatMoney(max)} RUB`
  }
  if (min != null) {
    return `�� ${formatMoney(min)} RUB`
  }
  return `�� ${formatMoney(max)} RUB`
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

export function PositionGradesPage() {
  const { companyId } = resolveCompanyId()
  const canManage = true

  const params = useParams()
  const positionId = useMemo(() => {
    const raw = params.positionId
    if (!raw) {
      return null
    }
    const n = Number(raw)
    return Number.isInteger(n) && n > 0 ? n : null
  }, [params.positionId])

  const [onlyActive, setOnlyActive] = useState(true)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [actionError, setActionError] = useState(/** @type {string | null} */ (null))
  const [matrix, setMatrix] = useState(
    /** @type {import('../api/gradeModel.js').GradeModelMatrixView | null} */ (null),
  )
  const [gradeForm, setGradeForm] = useState(
    /** @type {{ mode: 'create' | 'edit', gradeId?: number, positionId: number, code: string, name: string, description: string, levelOrder: string, salaryMinAmount: string, salaryMaxAmount: string, isActive: boolean } | null} */ (null),
  )
  const [gradeToDeactivate, setGradeToDeactivate] = useState(/** @type {number | null} */ (null))

  const load = useCallback(async () => {
    if (companyId == null || positionId == null) {
      setMatrix(null)
      setError(positionId == null ? 'Некорректный идентификатор должности.' : null)
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
        setError('Не удалось загрузить данные по должности')
      }
    } finally {
      setLoading(false)
    }
  }, [companyId, onlyActive, positionId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!gradeForm) {
      return
    }
    const onKeyDown = (ev) => {
      if (ev.key === 'Escape' && !submitting) {
        setGradeForm(null)
    setGradeToDeactivate(null)
    setActionError(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [gradeForm, submitting])

  const row = useMemo(() => {
    if (!matrix?.positions || positionId == null) {
      return null
    }
    return matrix.positions.find((item) => item.position?.id === positionId) ?? null
  }, [matrix, positionId])

  const position = row?.position ?? null
  const grades = useMemo(() => {
    const list = Array.isArray(row?.grades) ? [...row.grades] : []
    list.sort((a, b) => (a.level_order ?? 0) - (b.level_order ?? 0))
    return list
  }, [row])

  function openCreateGrade() {
    if (positionId == null) {
      return
    }
    setActionError(null)
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

  /** @param {import('../api/gradeModel.js').GradeView} g */
  function openEditGrade(g) {
    if (positionId == null) {
      return
    }
    setActionError(null)
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
      setGradeToDeactivate(null)
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

  /** @param {number} gradeId */
  async function handleDeactivateGrade(gradeId) {
    setSubmitting(true)
    setActionError(null)
    try {
      await gradeModelApi.deactivateGrade(gradeId)
      setGradeForm(null)
      setGradeToDeactivate(null)
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
    setGradeForm(null)
    setGradeToDeactivate(null)
    setActionError(null)
  }

  return (
    <article className="page">
      <ol className="page__breadcrumbs">
        <li>
          <Link to="/">Главная</Link>
        </li>
        <li>
          <Link to="/grade-model">Матрица грейдов</Link>
        </li>
        <li>{position?.name || 'Должность'}</li>
      </ol>

      <h1 className="page__title">Грейды по должности</h1>
      <p className="page__lead">Просматривайте и редактируйте грейды выбранной должности отдельно от общего списка.</p>

      {position ? (
        <section className="entity-zone__summary" aria-label="Сводка по должности">
          <div className="entity-zone__summary-title">{position.name}</div>
          <div className="entity-zone__card-meta">
            <span
              className={
                position.is_active
                  ? 'entity-zone__badge entity-zone__badge--active'
                  : 'entity-zone__badge entity-zone__badge--inactive'
              }
            >
              {position.is_active ? 'Должность активна' : 'Должность неактивна'}
            </span>
            <span className="entity-zone__badge">{grades.length} грейдов</span>
          </div>
        </section>
      ) : null}

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
            title="Добавить грейд"
            aria-label="Добавить грейд"
            onClick={openCreateGrade}
            disabled={submitting || positionId == null}
          >
            +
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="entity-zone__error" role="alert">
          {error}
        </div>
      ) : null}

      {actionError && !gradeForm ? (
        <div className="entity-zone__error" role="alert">
          {actionError}
        </div>
      ) : null}

      {loading ? <p className="entity-zone__loading">Загрузка…</p> : null}

      {!loading && !error && !position ? (
        <p className="entity-zone__empty">Должность не найдена в выбранной матрице.</p>
      ) : null}

      {!loading && position ? (
        <section className="entity-zone__matrix-block">
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
                  <div
                    key={g.id}
                    className={`entity-zone__grades-row${canManage ? ' entity-zone__grades-row--manage' : ''}`}
                  >
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
                          onClick={() => openEditGrade(g)}
                          disabled={submitting}
                        >
                          ✎
              </button>
                        <button
                          type="button"
                          className="entity-zone__icon-button entity-zone__icon-button--danger"
                          title="Деактивировать грейд"
                          aria-label="Деактивировать грейд"
                          onClick={() => setGradeToDeactivate(g.id)}
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
        </section>
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

      <ConfirmDialog
        open={gradeToDeactivate != null}
        title="Подтвердите действие"
        message="Деактивировать грейд?"
        confirmLabel="Деактивировать"
        cancelLabel="Отменить"
        destructive
        busy={submitting}
        onCancel={() => (!submitting ? setGradeToDeactivate(null) : undefined)}
        onConfirm={() => {
          if (gradeToDeactivate != null) {
            void handleDeactivateGrade(gradeToDeactivate)
          }
        }}
      />
    </article>
  )
}

