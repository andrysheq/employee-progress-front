import { apiGet } from './client.js'

/**
 * @typedef {'INTERIM_PROGRESS' | 'FINAL_PROMOTION'} ReviewType
 */

/**
 * @typedef {'SCHEDULED' | 'COMPLETED' | 'CANCELLED'} ReviewCycleStatus
 */

/**
 * @typedef {object} ReviewCycleView
 * @property {number} review_cycle_id
 * @property {number} employee_id
 * @property {number | null} [plan_id]
 * @property {number[]} considered_development_plan_ids
 * @property {ReviewType} review_type
 * @property {ReviewCycleStatus} status
 * @property {string} scheduled_at
 * @property {string | null} [started_at]
 * @property {string | null} [completed_at]
 * @property {number} initiated_by_employee_id
 */

/**
 * @typedef {object} ReviewCyclesFilter
 * @property {number | null | undefined} [employee_id]
 * @property {number | null | undefined} [company_id]
 * @property {ReviewType | null | undefined} [review_type]
 * @property {ReviewCycleStatus | null | undefined} [status]
 * @property {string | null | undefined} [date_from]
 * @property {string | null | undefined} [date_to]
 */

/**
 * @param {ReviewCyclesFilter} [filter]
 * @returns {Promise<ReviewCycleView[]>}
 */
export function fetchReviewCycles(filter = {}) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(filter)) {
    if (v == null || v === '') {
      continue
    }
    q.set(k, String(v))
  }
  const query = q.toString()
  const path = query ? `/review-cycles?${query}` : '/review-cycles'
  return /** @type {Promise<ReviewCycleView[]>} */ (apiGet(path))
}
