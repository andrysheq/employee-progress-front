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
    return `Оклад: ${min}–${max}`
  }
  if (min != null) {
    return `Оклад от: ${min}`
  }
  return `Оклад до: ${max}`
}

export function GradeModelPage() {
  const { companyId, source } = resolveCompanyId()
  const [onlyActive, setOnlyActive] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [requestId, setRequestId] = useState(/** @type {string | null} */ (null))
  const [matrix, setMatrix] = useState(
    /** @type {import('../api/gradeModel.js').GradeModelMatrixView | null} */ (null),
  )

  const load = useCallback(async () => {
    if (companyId == null) {
      setMatrix(null)
      setError(null)
      setRequestId(null)
      return
    }
    setLoading(true)
    setError(null)
    setRequestId(null)
    try {
      const data = await gradeModelApi.fetchGradeMatrix(companyId, onlyActive)
      setMatrix(data && typeof data === 'object' ? data : null)
    } catch (e) {
      setMatrix(null)
      if (e instanceof ApiError) {
        setError(e.message)
        setRequestId(e.requestId)
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

  const companyHint =
    source === 'jwt'
      ? 'Компания из JWT'
      : source === 'env'
        ? 'Компания из VITE_DEV_COMPANY_ID'
        : null

  const positions = matrix?.positions && Array.isArray(matrix.positions) ? matrix.positions : []

  return (
    <article className="page">
      <ol className="page__breadcrumbs">
        <li>
          <Link to="/">Главная</Link>
        </li>
        <li>Матрица грейдов</li>
      </ol>

      <h1 className="page__title">Матрица грейдов</h1>
      <p className="page__lead">
        Должности и линейки грейдов компании. Управление моделью — по API (роли с грантами grade model); чтение
        матрицы — <code>READ_COMPANY_GRADE_MATRIX</code>. Вилки окладов в ответе могут отсутствовать в зависимости от
        роли и настроек backend.
      </p>

      {companyId == null ? (
        <div className="entity-zone__error" role="status">
          <strong>Не задана компания.</strong> Нужен claim в JWT (см. <code>VITE_JWT_COMPANY_CLAIM</code>) или{' '}
          <code>VITE_DEV_COMPANY_ID</code> в <code>.env</code>.
        </div>
      ) : null}

      {companyId != null ? (
        <div className="entity-zone__toolbar">
          <label className="entity-zone__toggle">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(ev) => setOnlyActive(ev.target.checked)}
            />
            Только активные должности и грейды
          </label>
          <span className="entity-zone__hint">
            {companyHint ? (
              <>
                {companyHint}: <strong>{companyId}</strong>
              </>
            ) : (
              <>
                Компания: <strong>{companyId}</strong>
              </>
            )}
          </span>
        </div>
      ) : null}

      {error ? (
        <div className="entity-zone__error" role="alert">
          {error}
          {requestId ? (
            <>
              {' '}
              <code>(request_id: {requestId})</code>
            </>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <p className="entity-zone__loading">Загрузка…</p>
      ) : null}

      {!loading && companyId != null && positions.length === 0 && !error ? (
        <p className="entity-zone__empty">В матрице пока нет должностей (или нет данных для фильтра).</p>
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
                <div className="entity-zone__card-code">{p.code}</div>
                {p.description ? (
                  <p className="entity-zone__card-desc">{p.description}</p>
                ) : null}
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
                </div>
                <div className="entity-zone__matrix-block">
                  <div className="entity-zone__matrix-block-title">Грейды</div>
                  {grades.map((g) => {
                    const salary = gradeSalaryLine(g)
                    return (
                      <div key={g.id} className="entity-zone__grade-row">
                        <strong>{g.name}</strong> <span className="entity-zone__hint">({g.code})</span>
                        {salary ? (
                          <>
                            {' '}
                            · <span className="entity-zone__hint">{salary}</span>
                          </>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </article>
            )
          })}
        </div>
      ) : null}
    </article>
  )
}
