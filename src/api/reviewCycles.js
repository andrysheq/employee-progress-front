import { apiGet, apiPost } from './client.js'
import { buildRegistryQuery, normalizePage } from './registry.js'

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

/**
 * @typedef {object} ReviewCycleRegistryFilter
 * @property {number | null | undefined} [employee_id]
 * @property {number | null | undefined} [company_id]
 * @property {ReviewType | null | undefined} [review_type]
 * @property {ReviewCycleStatus | null | undefined} [status]
 * @property {number | null | undefined} [initiated_by_employee_id]
 * @property {string | null | undefined} [date_from]
 * @property {string | null | undefined} [date_to]
 * @property {string | null | undefined} [employee_title_like]
 */

/**
 * @typedef {object} RegistryPageOpts
 * @property {number | null | undefined} [page]
 * @property {number | null | undefined} [size]
 * @property {string | null | undefined} [sort]
 */

/**
 * @param {ReviewCycleRegistryFilter} [filter]
 * @param {RegistryPageOpts} [options]
 * @returns {Promise<{ content: ReviewCycleView[], totalElements: number, totalPages: number, size: number, page: number }>}
 */
export async function fetchReviewCyclesRegistry(filter = {}, options = {}) {
  const query = buildRegistryQuery({
    page: options.page ?? 0,
    size: options.size ?? 100,
    sort: options.sort ?? 'scheduledAt,desc',
  })
  const payload = await apiPost(`/review-cycles/registry${query}`, filter)
  return normalizePage(payload)
}
