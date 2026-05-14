import { apiGet } from './client.js'

/**
 * @typedef {'APPROVED' | 'REJECTED'} PromotionDecisionType
 */

/**
 * @typedef {object} PromotionDecisionView
 * @property {number} decision_id
 * @property {number} review_cycle_id
 * @property {number} employee_id
 * @property {string} employee_name
 * @property {string} from_grade_code
 * @property {string | null} [to_grade_code]
 * @property {PromotionDecisionType | string} decision
 * @property {string} rationale
 * @property {string | null} [improvement_plan_summary]
 * @property {number} decided_by_id
 * @property {string} decided_by_name
 * @property {string} decided_at
 */

/**
 * @typedef {object} PromotionDecisionsFilter
 * @property {number | null | undefined} [employee_id]
 * @property {number | null | undefined} [review_cycle_id]
 * @property {number | null | undefined} [company_id]
 * @property {number | null | undefined} [team_lead_id]
 * @property {number | null | undefined} [decided_by_id]
 * @property {PromotionDecisionType | null | undefined} [decision]
 * @property {string | null | undefined} [date_from]
 * @property {string | null | undefined} [date_to]
 */

/**
 * @param {PromotionDecisionsFilter} [filter]
 * @returns {Promise<PromotionDecisionView[]>}
 */
export function fetchPromotionDecisions(filter = {}) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(filter)) {
    if (v == null || v === '') {
      continue
    }
    q.set(k, String(v))
  }
  const query = q.toString()
  const path = query ? `/promotion-decisions?${query}` : '/promotion-decisions'
  return /** @type {Promise<PromotionDecisionView[]>} */ (apiGet(path))
}
