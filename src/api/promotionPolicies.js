import { apiGet } from './client.js'

/**
 * @typedef {object} PromotionPolicyView
 * @property {number} id
 * @property {number} company_id
 * @property {string} name
 * @property {number} min_months_between_reviews
 * @property {number | string} min_completion_percent
 * @property {number | string} weight_team_lead
 * @property {number | string} weight_manager
 * @property {string} effective_from
 * @property {string | null} [effective_to]
 * @property {boolean} is_active
 */

/**
 * @param {number} companyId
 * @param {boolean} [onlyActive=true]
 * @returns {Promise<PromotionPolicyView[]>}
 */
export function fetchPoliciesByCompany(companyId, onlyActive = true) {
  const q = new URLSearchParams({ onlyActive: String(onlyActive) })
  return /** @type {Promise<PromotionPolicyView[]>} */ (
    apiGet(`/promotion-policies/companies/${companyId}?${q.toString()}`)
  )
}

/**
 * @param {number} companyId
 * @returns {Promise<PromotionPolicyView>}
 */
export function fetchActivePolicy(companyId) {
  return /** @type {Promise<PromotionPolicyView>} */ (
    apiGet(`/promotion-policies/companies/${companyId}/active`)
  )
}
