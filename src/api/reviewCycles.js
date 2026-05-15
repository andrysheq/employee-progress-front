import { apiGet, apiPatch, apiPost } from './client.js'
import { buildRegistryQuery, normalizePage } from './registry.js'

/**
 * @typedef {'FINAL_PROMOTION'} ReviewType
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
 * @property {string} created_at
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

/**
 * @param {number} reviewCycleId
 * @returns {Promise<ReviewCycleView>}
 */
export function fetchReviewCycleById(reviewCycleId) {
  return /** @type {Promise<ReviewCycleView>} */ (
    apiGet(`/review-cycles/${Math.trunc(reviewCycleId)}`)
  )
}

/**
 * @typedef {object} InterimReviewAssessmentView
 * @property {number} assessment_id
 * @property {number} interim_review_id
 * @property {number} reviewer_employee_id
 * @property {string} reviewer_employee_full_name
 * @property {string} reviewer_role
 * @property {number | null} [score]
 * @property {string} recommendation
 * @property {string | null} [strengths]
 * @property {string | null} [gaps]
 * @property {string | null} [comment]
 */

/**
 * @param {number} reviewCycleId
 * @returns {Promise<InterimReviewAssessmentView[]>}
 */
export function fetchInterimReviewAssessments(reviewCycleId) {
  return /** @type {Promise<InterimReviewAssessmentView[]>} */ (
    apiGet(`/review-cycles/${Math.trunc(reviewCycleId)}/assessments`)
  )
}

/**
 * @typedef {object} FinalPromotionReviewScheduleRequest
 * @property {number} director_employee_id
 * @property {string} scheduled_at ISO-8601 local date-time
 */

/**
 * @typedef {object} FinalPromotionReviewScheduleView
 * @property {number} review_cycle_id
 * @property {number | null} [basis_plan_id]
 * @property {number[]} considered_development_plan_ids
 * @property {boolean} policy_compliant
 * @property {string[]} policy_advisories
 */

/**
 * @param {number} employeeId
 * @param {FinalPromotionReviewScheduleRequest} body
 * @returns {Promise<FinalPromotionReviewScheduleView>}
 */
export function scheduleFinalPromotionReview(employeeId, body) {
  return /** @type {Promise<FinalPromotionReviewScheduleView>} */ (
    apiPost(`/review-cycles/employees/${Math.trunc(employeeId)}/final-promotion`, body)
  )
}

/**
 * @typedef {object} FinalPromotionDecisionRequest
 * @property {number} director_employee_id
 * @property {'APPROVED' | 'REJECTED'} decision
 * @property {number | null | undefined} [target_grade_id]
 * @property {string} rationale
 * @property {string | null | undefined} [improvement_plan_summary]
 */

/**
 * @typedef {object} FinalPromotionDecisionResultView
 * @property {number} promotion_decision_id
 * @property {number | null} [weighted_score_advisory]
 * @property {boolean} policy_compliant
 * @property {string[]} policy_advisories
 */

/**
 * @param {number} reviewCycleId
 * @param {FinalPromotionDecisionRequest} body
 * @returns {Promise<FinalPromotionDecisionResultView>}
 */
export function makeFinalPromotionDecision(reviewCycleId, body) {
  return /** @type {Promise<FinalPromotionDecisionResultView>} */ (
    apiPost(`/review-cycles/${Math.trunc(reviewCycleId)}/promotion-decision`, body)
  )
}

/**
 * @typedef {object} PromotionInterviewScheduleHistoryView
 * @property {number} history_id
 * @property {string} previous_scheduled_at
 * @property {string} new_scheduled_at
 * @property {number} rescheduled_by_employee_id
 * @property {string} rescheduled_by_employee_name
 * @property {string} rescheduled_at
 * @property {string | null} [comment]
 */

/**
 * @typedef {object} ReviewCycleRescheduleRequest
 * @property {number} rescheduled_by_employee_id
 * @property {string} scheduled_at ISO-8601 local date-time
 * @property {string | null | undefined} [comment]
 */

/**
 * @param {number} reviewCycleId
 * @param {ReviewCycleRescheduleRequest} body
 * @returns {Promise<ReviewCycleView>}
 */
export function rescheduleReviewCycle(reviewCycleId, body) {
  return /** @type {Promise<ReviewCycleView>} */ (
    apiPatch(`/review-cycles/${Math.trunc(reviewCycleId)}/reschedule`, body)
  )
}

/**
 * @param {number} reviewCycleId
 * @returns {Promise<PromotionInterviewScheduleHistoryView[]>}
 */
export function fetchPromotionInterviewScheduleHistory(reviewCycleId) {
  return /** @type {Promise<PromotionInterviewScheduleHistoryView[]>} */ (
    apiGet(`/review-cycles/${Math.trunc(reviewCycleId)}/schedule-history`)
  )
}
