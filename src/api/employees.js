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

