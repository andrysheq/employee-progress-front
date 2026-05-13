import { apiGet, apiPatch, apiPost, apiPut } from './client.js'

/**
 * @typedef {object} DepartmentView
 * @property {number} id
 * @property {number} company_id
 * @property {string} code
 * @property {string} name
 * @property {string} [description]
 * @property {number | null} [director_employee_id]
 * @property {boolean} is_active
 */

/**
 * @typedef {object} DepartmentUpsertBody
 * @property {string} [code]
 * @property {string} [name]
 * @property {string} [description]
 * @property {boolean} [is_active]
 */

/**
 * @typedef {object} DepartmentDirectorBody
 * @property {number | null} [director_employee_id]
 */

/**
 * @param {number} companyId
 * @param {boolean} [onlyActive=true]
 * @returns {Promise<DepartmentView[]>}
 */
export function fetchDepartmentsByCompany(companyId, onlyActive = true) {
  const q = new URLSearchParams({ onlyActive: String(onlyActive) })
  return /** @type {Promise<DepartmentView[]>} */ (
    apiGet(`/departments/companies/${companyId}?${q.toString()}`)
  )
}

/**
 * @param {number} departmentId
 * @returns {Promise<DepartmentView>}
 */
export function fetchDepartment(departmentId) {
  return /** @type {Promise<DepartmentView>} */ (
    apiGet(`/departments/${departmentId}`)
  )
}

/**
 * @param {number} companyId
 * @param {DepartmentUpsertBody} body
 * @returns {Promise<number>} id созданного отдела
 */
export function createDepartment(companyId, body) {
  return /** @type {Promise<number>} */ (
    apiPost(`/departments/companies/${companyId}`, body)
  )
}

/**
 * @param {number} departmentId
 * @param {DepartmentUpsertBody} body
 * @returns {Promise<DepartmentView>}
 */
export function updateDepartment(departmentId, body) {
  return /** @type {Promise<DepartmentView>} */ (
    apiPut(`/departments/${departmentId}`, body)
  )
}

/**
 * @param {number} departmentId
 * @param {DepartmentDirectorBody} body
 * @returns {Promise<DepartmentView>}
 */
export function assignDepartmentDirector(departmentId, body) {
  return /** @type {Promise<DepartmentView>} */ (
    apiPatch(`/departments/${departmentId}/director`, body)
  )
}

/**
 * @param {number} departmentId
 * @returns {Promise<void>}
 */
export function deactivateDepartment(departmentId) {
  return /** @type {Promise<void>} */ (
    apiPatch(`/departments/${departmentId}/deactivate`, undefined, {
      parseAs: 'void',
    })
  )
}
