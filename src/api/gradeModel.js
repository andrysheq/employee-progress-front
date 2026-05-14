import { apiGet, apiPost, apiPut, apiPatch } from './client.js'

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

/**
 * @param {number} companyId
 * @param {{ code: string, name: string, description?: string | null, is_active?: boolean }} payload
 * @returns {Promise<number>}
 */
export function createPosition(companyId, payload) {
  return /** @type {Promise<number>} */ (
    apiPost(`/grade-model/companies/${companyId}/positions`, payload)
  )
}

/**
 * @param {number} positionId
 * @param {{ code?: string, name?: string, description?: string | null, is_active?: boolean }} payload
 * @returns {Promise<PositionView>}
 */
export function updatePosition(positionId, payload) {
  return /** @type {Promise<PositionView>} */ (
    apiPut(`/grade-model/positions/${positionId}`, payload)
  )
}

/**
 * @param {number} positionId
 * @returns {Promise<void>}
 */
export function deactivatePosition(positionId) {
  return /** @type {Promise<void>} */ (
    apiPatch(`/grade-model/positions/${positionId}/deactivate`, undefined, { parseAs: 'void' })
  )
}

/**
 * @param {number} companyId
 * @param {{
 *   position_id: number,
 *   code: string,
 *   name: string,
 *   level_order: number,
 *   description?: string | null,
 *   salary_min_amount?: number | null,
 *   salary_max_amount?: number | null,
 *   is_active?: boolean
 * }} payload
 * @returns {Promise<number>}
 */
export function createGrade(companyId, payload) {
  return /** @type {Promise<number>} */ (
    apiPost(`/grade-model/companies/${companyId}/grades`, payload)
  )
}

/**
 * @param {number} gradeId
 * @param {{
 *   position_id?: number,
 *   code?: string,
 *   name?: string,
 *   level_order?: number,
 *   description?: string | null,
 *   salary_min_amount?: number | null,
 *   salary_max_amount?: number | null,
 *   is_active?: boolean
 * }} payload
 * @returns {Promise<GradeView>}
 */
export function updateGrade(gradeId, payload) {
  return /** @type {Promise<GradeView>} */ (
    apiPut(`/grade-model/grades/${gradeId}`, payload)
  )
}

/**
 * @param {number} gradeId
 * @returns {Promise<void>}
 */
export function deactivateGrade(gradeId) {
  return /** @type {Promise<void>} */ (
    apiPatch(`/grade-model/grades/${gradeId}/deactivate`, undefined, { parseAs: 'void' })
  )
}
