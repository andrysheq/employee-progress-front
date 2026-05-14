import { apiGet, apiPost } from './client.js'
import { buildRegistryQuery, normalizePage } from './registry.js'

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

/**
 * @typedef {object} DevelopmentPlanRegistryFilter
 * @property {number | null | undefined} [company_id]
 * @property {number | null | undefined} [employee_id]
 * @property {number | null | undefined} [manager_id]
 * @property {number | null | undefined} [team_lead_id]
 * @property {number | null | undefined} [target_grade_id]
 * @property {'DRAFT' | 'ACTIVE' | 'ARCHIVED' | null | undefined} [status]
 * @property {string | null | undefined} [period_start_from]
 * @property {string | null | undefined} [period_end_to]
 * @property {string | null | undefined} [employee_title_like]
 */

/**
 * @typedef {object} RegistryPageOpts
 * @property {number | null | undefined} [page]
 * @property {number | null | undefined} [size]
 * @property {string | null | undefined} [sort]
 */

/**
 * @typedef {object} DevelopmentPlanTaskCreateRequest
 * @property {'LEARNING' | 'PROJECT' | 'SOFT_SKILL'} task_type
 * @property {string} title
 * @property {string} description
 * @property {string} success_criteria
 * @property {'HIGH' | 'MIDDLE' | 'LOW'} priority
 * @property {string | null | undefined} [planned_start_date]
 * @property {number} duration_days
 * @property {number | null | undefined} [effort_hours_planned]
 */

/**
 * @typedef {object} DevelopmentPlanCreateRequest
 * @property {number} manager_id
 * @property {number} team_lead_id
 * @property {string} period_start
 * @property {string} period_end
 * @property {number} target_grade_id
 * @property {DevelopmentPlanTaskCreateRequest[]} tasks
 */

/**
 * @param {DevelopmentPlanRegistryFilter} [filter]
 * @param {RegistryPageOpts} [options]
 * @returns {Promise<{ content: DevelopmentPlanView[], totalElements: number, totalPages: number, size: number, page: number }>}
 */
export async function fetchDevelopmentPlansRegistry(filter = {}, options = {}) {
  const query = buildRegistryQuery({
    page: options.page ?? 0,
    size: options.size ?? 100,
    sort: options.sort ?? 'createdAt,desc',
  })
  const payload = await apiPost(`/development-plans/registry${query}`, filter)
  return normalizePage(payload)
}

/**
 * @param {number} employeeId
 * @param {DevelopmentPlanCreateRequest} body
 * @returns {Promise<number>}
 */
export function createDevelopmentPlan(employeeId, body) {
  return /** @type {Promise<number>} */ (
    apiPost(`/development-plans/employees/${Math.trunc(employeeId)}`, body)
  )
}
