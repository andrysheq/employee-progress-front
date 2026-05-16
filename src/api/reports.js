import { apiGet } from './client.js'

/**
 * @typedef {object} ReportsFilter
 * @property {number} company_id
 * @property {string} date_from
 * @property {string} date_to
 * @property {number | null | undefined} [employee_id]
 * @property {number | null | undefined} [team_lead_id]
 */

/**
 * @typedef {object} DevelopmentPlanCompletionItemView
 * @property {number} plan_id
 * @property {number} employee_id
 * @property {string} employee_name
 * @property {number | null} [team_lead_id]
 * @property {string | null} [team_lead_name]
 * @property {string} period_start
 * @property {string} period_end
 * @property {string} plan_status
 * @property {number} completion_percent
 * @property {number} total_tasks_count
 * @property {number} done_tasks_count
 * @property {number} in_progress_tasks_count
 * @property {number} planned_tasks_count
 * @property {number} on_time_done_tasks_share_percent
 */

/**
 * @typedef {object} DevelopmentPlanCompletionReportView
 * @property {number} company_id
 * @property {string} date_from
 * @property {string} date_to
 * @property {number | null} [employee_id]
 * @property {number | null} [team_lead_id]
 * @property {number} plans_total
 * @property {number} tasks_total
 * @property {number} tasks_done
 * @property {number} tasks_in_progress
 * @property {number} tasks_planned
 * @property {number} avg_plan_completion_percent
 * @property {number} on_time_done_tasks_share_percent
 * @property {DevelopmentPlanCompletionItemView[]} items
 */

/**
 * @typedef {object} EffectivenessSummaryReportView
 * @property {number} company_id
 * @property {string} date_from
 * @property {string} date_to
 * @property {number | null} [employee_id]
 * @property {number | null} [team_lead_id]
 * @property {number} plans_total
 * @property {number} plans_active
 * @property {number} plans_completed
 * @property {number} avg_plan_completion_percent
 * @property {number} avg_task_completion_duration_days
 * @property {number} on_time_done_tasks_share_percent
 * @property {number} final_reviews_total
 * @property {number} promotion_approved_total
 * @property {number} promotion_rejected_total
 * @property {number} promotion_conversion_percent
 */

/**
 * @typedef {object} PromotionDecisionHistoryItemView
 * @property {number} decision_id
 * @property {string} decided_at
 * @property {number} employee_id
 * @property {string} employee_name
 * @property {string} from_grade_code
 * @property {string | null} [to_grade_code]
 * @property {'APPROVED_BY_DEPARTMENT_DIRECTOR' | 'APPROVED_BY_GENERAL_DIRECTOR' | 'REJECTED' | string} decision
 * @property {string} rationale
 * @property {string | null} [improvement_plan_summary]
 * @property {number | null} [agreed_salary_rub_month]
 */

/**
 * @typedef {object} PromotionDecisionHistoryReportView
 * @property {number} company_id
 * @property {string} date_from
 * @property {string} date_to
 * @property {number | null} [employee_id]
 * @property {number | null} [team_lead_id]
 * @property {number} decisions_total
 * @property {number} approved_total
 * @property {number} rejected_total
 * @property {PromotionDecisionHistoryItemView[]} items
 */

/**
 * @param {ReportsFilter} filter
 * @returns {string}
 */
function buildReportsQuery(filter) {
  const q = new URLSearchParams()
  q.set('company_id', String(filter.company_id))
  q.set('date_from', filter.date_from)
  q.set('date_to', filter.date_to)
  if (filter.employee_id != null) {
    q.set('employee_id', String(filter.employee_id))
  }
  if (filter.team_lead_id != null) {
    q.set('team_lead_id', String(filter.team_lead_id))
  }
  return q.toString()
}

/**
 * @param {ReportsFilter} filter
 * @returns {Promise<DevelopmentPlanCompletionReportView>}
 */
export function fetchDevelopmentPlansCompletionReport(filter) {
  const query = buildReportsQuery(filter)
  return /** @type {Promise<DevelopmentPlanCompletionReportView>} */ (
    apiGet(`/reports/development-plans/completion?${query}`)
  )
}

/**
 * @param {ReportsFilter} filter
 * @returns {Promise<EffectivenessSummaryReportView>}
 */
export function fetchEffectivenessSummaryReport(filter) {
  const query = buildReportsQuery(filter)
  return /** @type {Promise<EffectivenessSummaryReportView>} */ (
    apiGet(`/reports/effectiveness/summary?${query}`)
  )
}

/**
 * @param {ReportsFilter} filter
 * @returns {Promise<PromotionDecisionHistoryReportView>}
 */
export function fetchPromotionDecisionsHistoryReport(filter) {
  const query = buildReportsQuery(filter)
  return /** @type {Promise<PromotionDecisionHistoryReportView>} */ (
    apiGet(`/reports/promotion-decisions/history?${query}`)
  )
}
