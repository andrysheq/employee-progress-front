import { apiGet } from './client.js'

/**
 * @typedef {object} DevelopmentPlanTaskView
 * @property {number} id
 * @property {string} title
 * @property {string} [description]
 * @property {string} [task_type]
 * @property {string} [priority]
 * @property {string | null} [planned_start_date]
 * @property {string} due_date
 * @property {string} [status]
 * @property {number | null} [team_lead_task_score]
 */

/**
 * @typedef {object} DevelopmentPlanCompetencyItemView
 * @property {number} id
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
 * @property {number | null} [team_lead_plan_score_hundredths]
 * @property {DevelopmentPlanTaskView[]} tasks
 * @property {DevelopmentPlanCompetencyItemView[]} [competency_items]
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

/**
 * @param {number} planId
 * @returns {Promise<DevelopmentPlanView>}
 */
export function fetchDevelopmentPlanById(planId) {
  return /** @type {Promise<DevelopmentPlanView>} */ (apiGet(`/development-plans/${Math.trunc(planId)}`))
}
