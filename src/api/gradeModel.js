import { apiGet, apiPost, apiPut, apiPatch } from './client.js'
import { buildRegistryQuery, normalizePage } from './registry.js'

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
 * @property {number} [company_id]
 * @property {number} [position_id]
 * @property {string} code
 * @property {string} name
 * @property {number} level_order
 * @property {boolean} is_active
 * @property {number | null} [salary_min_amount]
 * @property {number | null} [salary_max_amount]
 */

/**
 * @typedef {object} GradeRegistryFilter
 * @property {number | null | undefined} [company_id]
 * @property {number | null | undefined} [position_id]
 * @property {boolean | null | undefined} [is_active]
 * @property {number | null | undefined} [level_from]
 * @property {number | null | undefined} [level_to]
 * @property {string | null | undefined} [code_like]
 * @property {string | null | undefined} [name_like]
 */

/**
 * @typedef {object} RegistryPageOpts
 * @property {number | null | undefined} [page]
 * @property {number | null | undefined} [size]
 * @property {string | null | undefined} [sort]
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
 * @param {GradeRegistryFilter} [filter]
 * @param {RegistryPageOpts} [options]
 * @returns {Promise<{ content: GradeView[], totalElements: number, totalPages: number, size: number, page: number }>}
 */
export async function fetchGradeRegistry(filter = {}, options = {}) {
  const query = buildRegistryQuery({
    page: options.page ?? 0,
    size: options.size ?? 100,
    sort: options.sort ?? 'levelOrder,asc',
  })
  const payload = await apiPost(`/grade-model/grades/registry${query}`, filter)
  return normalizePage(payload)
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
