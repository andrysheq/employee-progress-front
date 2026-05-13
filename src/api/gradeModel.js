import { apiGet } from './client.js'

/**
 * @typedef {object} PositionView
 * @property {number} id
 * @property {number} company_id
 * @property {string} code
 * @property {string} name
 * @property {string} [description]
 * @property {boolean} is_active
 */

/**
 * @typedef {object} GradeView
 * @property {number} id
 * @property {string} code
 * @property {string} name
 * @property {number} level_order
 * @property {boolean} is_active
 * @property {number | null} [salary_min_amount]
 * @property {number | null} [salary_max_amount]
 */

/**
 * @typedef {object} PositionMatrixRow
 * @property {PositionView} position
 * @property {GradeView[]} grades
 */

/**
 * @typedef {object} GradeModelMatrixView
 * @property {number} company_id
 * @property {PositionMatrixRow[]} positions
 */

/**
 * @param {number} companyId
 * @param {boolean} [onlyActive=true]
 * @returns {Promise<GradeModelMatrixView>}
 */
export function fetchGradeMatrix(companyId, onlyActive = true) {
  const q = new URLSearchParams({ onlyActive: String(onlyActive) })
  return /** @type {Promise<GradeModelMatrixView>} */ (
    apiGet(`/grade-model/companies/${companyId}/matrix?${q.toString()}`)
  )
}
