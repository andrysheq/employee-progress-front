import { apiGet, apiPost } from './client.js'
import { buildRegistryQuery, normalizePage } from './registry.js'

/**
 * @typedef {object} EmployeeView
 * @property {number} id
 * @property {number} company_id
 * @property {number} department_id
 * @property {string} email
 * @property {string} full_name
 * @property {boolean} is_active
 * @property {string | null} [hired_at]
 * @property {number | null} [current_salary_rub_month]
 * @property {boolean | null} [current_salary_redacted]
 */

/**
 * @param {number} employeeId
 * @returns {Promise<EmployeeView>}
 */
export function fetchEmployeeById(employeeId) {
  return /** @type {Promise<EmployeeView>} */ (apiGet(`/employees/${Math.trunc(employeeId)}`))
}

/**
 * Карточка сотрудника для текущего JWT: claim `employee_id`, иначе сопоставление по `auth_user_id` (= `sub`).
 * @returns {Promise<EmployeeView>}
 */
export function fetchCurrentEmployee() {
  return /** @type {Promise<EmployeeView>} */ (apiGet('/employees/me'))
}

/**
 * @typedef {object} EmployeeGradeView
 * @property {number} employee_grade_id
 * @property {number} employee_id
 * @property {number} grade_id
 * @property {string} grade_code
 * @property {string} grade_name
 * @property {number} grade_level_order
 * @property {number | null} [position_id]
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
 * @typedef {object} EmployeesRegistryFilter
 * @property {number | null | undefined} [company_id]
 * @property {number | null | undefined} [department_id]
 * @property {boolean | null | undefined} [is_active]
 * @property {string | null | undefined} [hired_from]
 * @property {string | null | undefined} [hired_to]
 * @property {string | null | undefined} [full_name_like]
 * @property {string | null | undefined} [email_like]
 */

/**
 * @typedef {object} RegistryPageOpts
 * @property {number | null | undefined} [page]
 * @property {number | null | undefined} [size]
 * @property {string | null | undefined} [sort]
 */

/**
 * @param {EmployeesRegistryFilter} [filter]
 * @param {RegistryPageOpts} [options]
 * @returns {Promise<{ content: EmployeeView[], totalElements: number, totalPages: number, size: number, page: number }>}
 */
export async function fetchEmployeesRegistry(filter = {}, options = {}) {
  const query = buildRegistryQuery({
    page: options.page ?? 0,
    size: options.size ?? 100,
    sort: options.sort ?? 'createdAt,desc',
  })
  const payload = await apiPost(`/employees/registry${query}`, filter)
  return normalizePage(payload)
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
