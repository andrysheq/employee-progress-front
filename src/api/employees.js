import { apiGet } from './client.js'

/**
 * @typedef {object} EmployeeView
 * @property {number} id
 * @property {number} company_id
 * @property {number} department_id
 * @property {string} email
 * @property {string} full_name
 * @property {boolean} is_active
 * @property {string | null} [hired_at]
 */

/**
 * @param {number} employeeId
 * @returns {Promise<EmployeeView>}
 */
export function fetchEmployeeById(employeeId) {
  return /** @type {Promise<EmployeeView>} */ (apiGet(`/employees/${Math.trunc(employeeId)}`))
}

/**
 * @typedef {object} EmployeeGradeView
 * @property {number} employee_grade_id
 * @property {number} employee_id
 * @property {number} grade_id
 * @property {string} grade_code
 * @property {string} grade_name
 * @property {number} grade_level_order
 * @property {string} start_date
 * @property {string | null} [end_date]
 * @property {string | null} [change_reason]
 * @property {number} changed_by_employee_id
 * @property {string} changed_by_employee_full_name
 */

/**
 * @param {number} companyId
 * @returns {Promise<EmployeeView[]>}
 */
export function fetchEmployeesByCompany(companyId) {
  return /** @type {Promise<EmployeeView[]>} */ (
    apiGet(`/employees/companies/${Math.trunc(companyId)}`)
  )
}

/**
 * @param {number} employeeId
 * @returns {Promise<EmployeeGradeView>}
 */
export function fetchEmployeeCurrentGrade(employeeId) {
  return /** @type {Promise<EmployeeGradeView>} */ (
    apiGet(`/employees/${Math.trunc(employeeId)}/current-grade`)
  )
}

/**
 * @param {number} employeeId
 * @returns {Promise<EmployeeGradeView[]>}
 */
export function fetchEmployeeGradeHistory(employeeId) {
  return /** @type {Promise<EmployeeGradeView[]>} */ (
    apiGet(`/employees/${Math.trunc(employeeId)}/grade-history`)
  )
}

/**
 * @param {number} employeeId
 * @returns {Promise<string | null>}
 */
export async function fetchEmployeeDisplayName(employeeId) {
  const employee = await fetchEmployeeById(employeeId)
  if (typeof employee.full_name !== 'string') {
    return null
  }
  const fullName = employee.full_name.trim()
  return fullName.length > 0 ? fullName : null
}
