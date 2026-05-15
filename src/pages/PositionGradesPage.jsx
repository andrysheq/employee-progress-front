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
    return `?? ${formatMoney(min)} RUB`
  }
  return `?? ${formatMoney(max)} RUB`
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
    throw new Error('??????? ????? ?????')
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
      setError(positionId == null ? '???????????? ????????????? ?????????.' : null)
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
        setError('?? ??????? ????????? ?????? ?? ?????????')
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
      setActionError('??? ?????? ??????????? ??? ? ????????.')
      return
    }

    let levelOrder
    let min
    let max
    try {
      levelOrder = toNullableInt(gradeForm.levelOrder)
      if (levelOrder == null) {
        setActionError('??? ?????? ?????????? ???????.')
        return
      }
      min = toNullableInt(gradeForm.salaryMinAmount)
      max = toNullableInt(gradeForm.salaryMaxAmount)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '???????????? ???????? ????')
      return
    }

    if (min != null && min < 0) {
      setActionError('??????????? ???????? ?? ????? ???? ?????????????.')
      return
    }
    if (max != null && max < 0) {
      setActionError('???????????? ???????? ?? ????? ???? ?????????????.')
      return
    }
    if (min != null && max != null && max < min) {
      setActionError('???????????? ???????? ?????? ???? ?????? ??? ????? ???????????.')
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
        setActionError('?? ??????? ????????? ?????')
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
        setActionError('?? ??????? ?????????????? ?????')
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
          <Link to="/">???????</Link>
        </li>
        <li>
          <Link to="/grade-model">??????? ???????</Link>
        </li>
        <li>{position?.name || '?????????'}</li>
      </ol>

      <h1 className="page__title">?????? ?? ?????????</h1>
      <p className="page__lead">
        ?????????????? ? ???????????? ?????? ????????? ????????? ???????? ?? ?????? ??????.
      </p>

      {position ? (
        <section className="entity-zone__summary" aria-label="?????? ?? ?????????">
          <div className="entity-zone__summary-title">{position.name}</div>
          <div className="entity-zone__card-meta">
            <span
              className={
                position.is_active
                  ? 'entity-zone__badge entity-zone__badge--active'
                  : 'entity-zone__badge entity-zone__badge--inactive'
              }
            >
              {position.is_active ? '????????? ???????' : '????????? ?????????'}
            </span>
            <span className="entity-zone__badge">{grades.length} ???????</span>
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
          ?????? ???????? ????????? ? ??????
        </label>

        {canManage ? (
          <button
            type="button"
            className="entity-zone__icon-button"
            title="???????? ?????"
            aria-label="???????? ?????"
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

      {loading ? <p className="entity-zone__loading">?????????</p> : null}

      {!loading && !error && !position ? (
        <p className="entity-zone__empty">????????? ?? ??????? ? ????????? ???????.</p>
      ) : null}

      {!loading && position ? (
        <section className="entity-zone__matrix-block">
          <div className="entity-zone__matrix-block-title">??????</div>
          <div className="entity-zone__grades-table">
            <div className={`entity-zone__grades-head${canManage ? ' entity-zone__grades-head--manage' : ''}`}>
              <span>????????</span>
              <span>?????????? ?????</span>
              <span>???????</span>
              {canManage ? <span>????????</span> : null}
            </div>
            {grades.length === 0 ? (
              <p className="entity-zone__muted">?????? ?? ?????????.</p>
            ) : (
              grades.map((g) => {
                const salary = gradeSalaryLine(g)
                return (
                  <div
                    key={g.id}
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
                          title="????????????? ?????"
                          aria-label="????????????? ?????"
                          onClick={() => openEditGrade(g)}
                          disabled={submitting}
                        >
                          {'\u270E'}
                        </button>
                        <button
                          type="button"
                          className="entity-zone__icon-button entity-zone__icon-button--danger"
                          title="?????????????? ?????"
                          aria-label="?????????????? ?????"
                          onClick={() => setGradeToDeactivate(g.id)}
                          disabled={submitting || !g.is_active}
                        >
                          {'\u2212'}
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
            aria-label={gradeForm.mode === 'create' ? '???????? ??????' : '?????????????? ??????'}
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="entity-zone__modal-head">
              <h3 className="entity-zone__modal-title">
                {gradeForm.mode === 'create' ? '????? ?????' : '?????????????? ??????'}
              </h3>
              <button
                type="button"
                className="entity-zone__icon-button"
                onClick={closeModal}
                aria-label="???????"
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
                <span className="entity-zone__field-label">???</span>
                <input
                  className="entity-zone__input"
                  value={gradeForm.code}
                  onChange={(ev) => setGradeForm((f) => (f ? { ...f, code: ev.target.value } : f))}
                />
              </label>
              <label className="entity-zone__field">
                <span className="entity-zone__field-label">????????</span>
                <input
                  className="entity-zone__input"
                  value={gradeForm.name}
                  onChange={(ev) => setGradeForm((f) => (f ? { ...f, name: ev.target.value } : f))}
                />
              </label>
              <label className="entity-zone__field">
                <span className="entity-zone__field-label">???????</span>
                <input
                  className="entity-zone__input"
                  type="number"
                  step="1"
                  value={gradeForm.levelOrder}
                  onChange={(ev) => setGradeForm((f) => (f ? { ...f, levelOrder: ev.target.value } : f))}
                />
              </label>
              <label className="entity-zone__field">
                <span className="entity-zone__field-label">???. ????????</span>
                <input
                  className="entity-zone__input"
                  type="number"
                  step="1"
                  value={gradeForm.salaryMinAmount}
                  onChange={(ev) => setGradeForm((f) => (f ? { ...f, salaryMinAmount: ev.target.value } : f))}
                />
              </label>
              <label className="entity-zone__field">
                <span className="entity-zone__field-label">????. ????????</span>
                <input
                  className="entity-zone__input"
                  type="number"
                  step="1"
                  value={gradeForm.salaryMaxAmount}
                  onChange={(ev) => setGradeForm((f) => (f ? { ...f, salaryMaxAmount: ev.target.value } : f))}
                />
              </label>
              <label className="entity-zone__field entity-zone__field--wide">
                <span className="entity-zone__field-label">????????</span>
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
                ?????????
              </button>
              <button type="button" className="entity-zone__button" onClick={closeModal} disabled={submitting}>
                ??????
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <ConfirmDialog
        open={gradeToDeactivate != null}
        title="??????????? ????????"
        message="?????????????? ??????"
        confirmLabel="??????????????"
        cancelLabel="??????"
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
