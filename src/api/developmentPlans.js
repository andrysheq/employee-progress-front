import { apiGet } from './client.js'

/**
 * @typedef {object} DevelopmentPlanTaskView
 * @property {number} id
 * @property {string} title
 * @property {string} [status]
 */

/**
 * @typedef {object} DevelopmentPlanView
 * @property {number} id
 * @property {number} employee_id
 * @property {number} manager_id
 * @property {number | null} [team_lead_id]
 * @property {number | null} [target_grade_id]
 * @property {string} period_start
 * @property {string} period_end
 * @property {string} status
 * @property {string | null} [approved_at]
 * @property {string} created_at
 * @property {DevelopmentPlanTaskView[]} tasks
 */

/**
 * @param {number} employeeId
 * @returns {Promise<DevelopmentPlanView[]>}
 */
export function fetchEmployeePlans(employeeId) {
  return /** @type {Promise<DevelopmentPlanView[]>} */ (
    apiGet(`/development-plans/employees/${employeeId}`)
  )
}
