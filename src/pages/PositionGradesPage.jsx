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
    return `от ${formatMoney(min)} RUB`
  }
  return `до ${formatMoney(max)} RUB`
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

  const [competencies, setCompetencies] = useState(
    /** @type {import('../api/gradeModel.js').CompetencyView[]} */ ([]),
  )
  const [competencyLevels, setCompetencyLevels] = useState(
    /** @type {import('../api/gradeModel.js').RefCompetencyLevelView[]} */ ([]),
  )
  const [dictionariesError, setDictionariesError] = useState(/** @type {string | null} */ (null))

  const [criterionForm, setCriterionForm] = useState(
    /** @type {{ gradeId: number, mode: 'create' | 'edit', criterionId?: number, competencyId: string, requiredLevelId: string } | null} */ (null),
  )
  const [criterionError, setCriterionError] = useState(/** @type {string | null} */ (null))
  const [criterionToDelete, setCriterionToDelete] = useState(
    /** @type {{ id: number, label: string } | null} */ (null),
  )

  const load = useCallback(async () => {
    if (companyId == null || positionId == null) {
      setMatrix(null)
      setError(positionId == null ? 'Неверный идентификатор должности.' : null)
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
  }, [companyId, onlyActive, positionId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (companyId == null || positionId == null) {
      setCompetencies([])
      setCompetencyLevels([])
      setDictionariesError(null)
      return
    }
    let cancelled = false
    async function run() {
      setDictionariesError(null)
      try {
        const [cList, lList] = await Promise.all([
          gradeModelApi.fetchCompetencies(),
          gradeModelApi.fetchCompetencyLevels(true),
        ])
        if (!cancelled) {
          const levelsRaw = Array.isArray(lList) ? lList : []
          levelsRaw.sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0))
          setCompetencies(Array.isArray(cList) ? cList : [])
          setCompetencyLevels(levelsRaw)
        }
      } catch (e) {
        if (!cancelled) {
          setCompetencies([])
          setCompetencyLevels([])
          if (e instanceof ApiError) {
            setDictionariesError(e.message)
          } else if (e instanceof Error) {
            setDictionariesError(e.message)
          } else {
            setDictionariesError('Не удалось загрузить компетенции и уровни')
          }
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [companyId, positionId])

  useEffect(() => {
    if (!criterionForm) {
      return
    }
    const onKeyDown = (ev) => {
      if (ev.key === 'Escape' && !submitting) {
        setCriterionForm(null)
        setCriterionError(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [criterionForm, submitting])

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
        setActionError('Укажите порядок уровня.')
        return
      }
      min = toNullableInt(gradeForm.salaryMinAmount)
      max = toNullableInt(gradeForm.salaryMaxAmount)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Некорректный ввод числа')
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
      setActionError('Максимальная зарплата не может быть меньше минимальной.')
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

  function closeCriterionModal() {
    if (submitting) {
      return
    }
    setCriterionForm(null)
    setCriterionError(null)
  }

  /** @param {number} gradeId */
  function openCreateCriterion(gradeId) {
    setCriterionError(null)
    setCriterionForm({
      gradeId,
      mode: 'create',
      competencyId: '',
      requiredLevelId: '',
    })
  }

  /**
   * @param {number} gradeId
   * @param {import('../api/gradeModel.js').GradeCriterionView} c
   */
  function openEditCriterion(gradeId, c) {
    setCriterionError(null)
    setCriterionForm({
      gradeId,
      mode: 'edit',
      criterionId: c.id,
      competencyId: String(c.competency_id),
      requiredLevelId: String(c.required_level_id),
    })
  }

  async function handleSaveCriterion() {
    if (!criterionForm) {
      return
    }
    const competency_id = Number(criterionForm.competencyId)
    const required_level_id = Number(criterionForm.requiredLevelId)
    if (!Number.isInteger(competency_id) || competency_id <= 0) {
      setCriterionError('Выберите компетенцию.')
      return
    }
    if (!Number.isInteger(required_level_id) || required_level_id <= 0) {
      setCriterionError('Выберите требуемый уровень.')
      return
    }

    setSubmitting(true)
    setCriterionError(null)
    try {
      if (criterionForm.mode === 'create') {
        await gradeModelApi.createGradeCriterion(criterionForm.gradeId, {
          competency_id,
          required_level_id,
        })
      } else if (criterionForm.criterionId != null) {
        await gradeModelApi.updateGradeCriterion(criterionForm.criterionId, {
          competency_id,
          required_level_id,
        })
      }
      setCriterionForm(null)
      await load()
    } catch (e) {
      if (e instanceof ApiError) {
        setCriterionError(e.message)
      } else if (e instanceof Error) {
        setCriterionError(e.message)
      } else {
        setCriterionError('Не удалось сохранить требование по компетенции')
      }
    } finally {
      setSubmitting(false)
    }
  }

  /** @param {number} criterionId */
  async function handleConfirmDeleteCriterion(criterionId) {
    setSubmitting(true)
    setActionError(null)
    try {
      await gradeModelApi.deleteGradeCriterion(criterionId)
      setCriterionToDelete(null)
      await load()
    } catch (e) {
      if (e instanceof ApiError) {
        setActionError(e.message)
      } else if (e instanceof Error) {
        setActionError(e.message)
      } else {
        setActionError('Не удалось удалить требование')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const dictReady = competencies.length > 0 && competencyLevels.length > 0 && dictionariesError == null

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
      <p className="page__lead">
        Просматривайте и редактируйте грейды выбранной должности в матрице грейдов.
      </p>

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

      {dictionariesError && position ? (
        <div className="entity-zone__error" role="alert">
          {dictionariesError} Управление требованиями по компетенциям недоступно, пока не загрузятся справочники.
        </div>
      ) : null}

      {error ? (
        <div className="entity-zone__error" role="alert">
          {error}
        </div>
      ) : null}

      {actionError && !gradeForm && !criterionForm ? (
        <div className="entity-zone__error" role="alert">
          {actionError}
        </div>
      ) : null}

      {loading ? <p className="entity-zone__loading">Загрузка…</p> : null}

      {!loading && !error && !position ? (
        <p className="entity-zone__empty">Должность не найдена в матрице грейдов.</p>
      ) : null}

      {!loading && position ? (
        <section className="entity-zone__matrix-block">
          <div className="entity-zone__matrix-block-title">Грейды</div>
          <div className="entity-zone__grades-table">
            <div className={`entity-zone__grades-head${canManage ? ' entity-zone__grades-head--manage' : ''}`}>
              <span>Название</span>
              <span>Диапазон зарплаты</span>
              <span>Уровень</span>
              {canManage ? <span>Действия</span> : null}
            </div>
            {grades.length === 0 ? (
              <p className="entity-zone__muted">Грейдов для этой должности пока нет.</p>
            ) : (
              grades.map((g) => {
                const salary = gradeSalaryLine(g)
                const criteriaRaw = Array.isArray(g.criteria) ? [...g.criteria] : []
                criteriaRaw.sort((a, b) =>
                  (a.competency_name ?? '').localeCompare(b.competency_name ?? '', undefined, {
                    sensitivity: 'base',
                  }),
                )

                return (
                  <div key={g.id} className="entity-zone__grade-block">
                    <div
                      className={`entity-zone__grades-row${canManage ? ' entity-zone__grades-row--manage' : ''}`}
                    >
                      <span>{g.name || '?'}</span>
                      <span>{salary ?? '?'}</span>
                      <span>{g.level_order ?? '?'}</span>
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
                            {'\u270E'}
                          </button>
                          <button
                            type="button"
                            className="entity-zone__icon-button entity-zone__icon-button--danger"
                            title="Деактивировать грейд"
                            aria-label="Деактивировать грейд"
                            onClick={() => setGradeToDeactivate(g.id)}
                            disabled={submitting || !g.is_active}
                          >
                            {'\u2212'}
                          </button>
                        </span>
                      ) : null}
                    </div>

                    <div className="entity-zone__grade-criteria">
                      <div className="entity-zone__grade-criteria-title">Требования по компетенциям</div>
                      {criteriaRaw.length === 0 ? (
                        <p className="entity-zone__muted" style={{ margin: '0.15rem 0 0' }}>
                          Для этого грейда пока не заданы компетенции.
                        </p>
                      ) : (
                        criteriaRaw.map((c) => (
                          <div key={c.id} className="entity-zone__criterion-row">
                            <span>
                              <strong>{c.competency_name ?? '?'}</strong>
                              {' — '}
                              {c.required_level_name ?? '?'}
                            </span>
                            {canManage ? (
                              <span className="entity-zone__icon-actions">
                                <button
                                  type="button"
                                  className="entity-zone__icon-button"
                                  title="Изменить требование"
                                  aria-label="Изменить требование по компетенции"
                                  onClick={() => openEditCriterion(g.id, c)}
                                  disabled={submitting || !dictReady}
                                >
                                  {'\u270E'}
                                </button>
                                <button
                                  type="button"
                                  className="entity-zone__icon-button entity-zone__icon-button--danger"
                                  title="Удалить требование"
                                  aria-label="Удалить требование по компетенции"
                                  onClick={() =>
                                    setCriterionToDelete({
                                      id: c.id,
                                      label: `${c.competency_name ?? '?'} — ${c.required_level_name ?? '?'}`,
                                    })
                                  }
                                  disabled={submitting || !dictReady}
                                >
                                  {'\u2212'}
                                </button>
                              </span>
                            ) : null}
                          </div>
                        ))
                      )}
                      {canManage ? (
                        <div style={{ marginTop: '0.45rem' }}>
                          <button
                            type="button"
                            className="entity-zone__button"
                            onClick={() => openCreateCriterion(g.id)}
                            disabled={submitting || !dictReady}
                          >
                            + Добавить компетенцию
                          </button>
                          {!dictReady && dictionariesError == null ? (
                            <span className="entity-zone__hint" style={{ display: 'block', marginTop: '0.35rem' }}>
                              Дождитесь загрузки справочников компетенций и уровней или задайте их на странице «Матрица
                              грейдов».
                            </span>
                          ) : null}
                          {!dictReady && dictionariesError != null ? (
                            <span className="entity-zone__hint" style={{ display: 'block', marginTop: '0.35rem' }}>
                              Исправьте ошибку загрузки справочников выше.
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
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
                {'\u00D7'}
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
                <span className="entity-zone__field-label">Порядок уровня</span>
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

      {criterionForm ? (
        <div className="entity-zone__modal-backdrop" role="presentation" onClick={closeCriterionModal}>
          <section
            className="entity-zone__modal"
            role="dialog"
            aria-modal="true"
            aria-label={
              criterionForm.mode === 'create'
                ? 'Добавление требования по компетенции'
                : 'Редактирование требования по компетенции'
            }
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="entity-zone__modal-head">
              <h3 className="entity-zone__modal-title">
                {criterionForm.mode === 'create'
                  ? 'Компетенция для грейда'
                  : 'Изменить требование по компетенции'}
              </h3>
              <button
                type="button"
                className="entity-zone__icon-button"
                onClick={closeCriterionModal}
                aria-label="Закрыть"
                disabled={submitting}
              >
                {'\u00D7'}
              </button>
            </div>

            <p className="entity-zone__muted" style={{ margin: '0 0 0.65rem' }}>
              Грейд:{' '}
              <strong>{grades.find((gr) => gr.id === criterionForm.gradeId)?.name ?? '—'}</strong>
            </p>

            {criterionError ? (
              <div className="entity-zone__error" role="alert">
                {criterionError}
              </div>
            ) : null}

            <div className="entity-zone__filters entity-zone__filters--row">
              <label className="entity-zone__field entity-zone__field--wide">
                <span className="entity-zone__field-label">Компетенция</span>
                <select
                  className="entity-zone__select"
                  value={criterionForm.competencyId}
                  onChange={(ev) =>
                    setCriterionForm((f) => (f ? { ...f, competencyId: ev.target.value } : f))
                  }
                >
                  <option value="">Выберите компетенцию</option>
                  {competencies.map((co) => (
                    <option key={co.id} value={String(co.id)}>
                      {co.code ? `${co.code} — ${co.name}` : co.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="entity-zone__field entity-zone__field--wide">
                <span className="entity-zone__field-label">Требуемый уровень</span>
                <select
                  className="entity-zone__select"
                  value={criterionForm.requiredLevelId}
                  onChange={(ev) =>
                    setCriterionForm((f) => (f ? { ...f, requiredLevelId: ev.target.value } : f))
                  }
                >
                  <option value="">Выберите уровень</option>
                  {competencyLevels.map((lv) => (
                    <option key={lv.id} value={String(lv.id)}>
                      {lv.code ? `${lv.code} — ${lv.name}` : lv.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="entity-zone__actions">
              <button
                type="button"
                className="entity-zone__button entity-zone__button--primary"
                onClick={() => void handleSaveCriterion()}
                disabled={submitting}
              >
                Сохранить
              </button>
              <button type="button" className="entity-zone__button" onClick={closeCriterionModal} disabled={submitting}>
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

      <ConfirmDialog
        open={criterionToDelete != null}
        title="Подтвердите действие"
        message={
          criterionToDelete != null
            ? `Удалить требование по компетенции «${criterionToDelete.label}»?`
            : ''
        }
        confirmLabel="Удалить"
        cancelLabel="Отменить"
        destructive
        busy={submitting}
        onCancel={() => (!submitting ? setCriterionToDelete(null) : undefined)}
        onConfirm={() => {
          if (criterionToDelete != null) {
            void handleConfirmDeleteCriterion(criterionToDelete.id)
          }
        }}
      />
    </article>
  )
}
