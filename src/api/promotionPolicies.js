import { apiGet, apiPatch, apiPost, apiPut } from './client.js'
import { buildRegistryQuery, normalizePage } from './registry.js'

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

/**
 * @typedef {object} PromotionPolicyRegistryFilter
 * @property {number | null | undefined} [company_id]
 * @property {boolean | null | undefined} [is_active]
 * @property {string | null | undefined} [effective_from]
 * @property {string | null | undefined} [effective_to]
 * @property {string | null | undefined} [name_like]
 */

/**
 * @typedef {object} RegistryPageOpts
 * @property {number | null | undefined} [page]
 * @property {number | null | undefined} [size]
 * @property {string | null | undefined} [sort]
 */

/**
 * @typedef {object} PromotionPolicyUpsertRequest
 * @property {string | null | undefined} [name]
 * @property {number | null | undefined} [min_months_between_reviews]
 * @property {number | string | null | undefined} [min_completion_percent]
 * @property {number | string | null | undefined} [weight_team_lead]
 * @property {number | string | null | undefined} [weight_manager]
 * @property {string | null | undefined} [effective_from]
 * @property {string | null | undefined} [effective_to]
 * @property {boolean | null | undefined} [is_active]
 */

/**
 * @param {PromotionPolicyRegistryFilter} [filter]
 * @param {RegistryPageOpts} [options]
 * @returns {Promise<{ content: PromotionPolicyView[], totalElements: number, totalPages: number, size: number, page: number }>}
 */
export async function fetchPoliciesRegistry(filter = {}, options = {}) {
  const query = buildRegistryQuery({
    page: options.page ?? 0,
    size: options.size ?? 100,
    sort: options.sort ?? 'effectiveFrom,desc',
  })
  const payload = await apiPost(`/promotion-policies/registry${query}`, filter)
  return normalizePage(payload)
}

/**
 * @param {number} companyId
 * @param {PromotionPolicyUpsertRequest} body
 * @returns {Promise<number>}
 */
export function createPolicy(companyId, body) {
  return /** @type {Promise<number>} */ (apiPost(`/promotion-policies/companies/${Math.trunc(companyId)}`, body))
}

/**
 * @param {number} policyId
 * @param {PromotionPolicyUpsertRequest} body
 * @returns {Promise<PromotionPolicyView>}
 */
export function updatePolicy(policyId, body) {
  return /** @type {Promise<PromotionPolicyView>} */ (apiPut(`/promotion-policies/${Math.trunc(policyId)}`, body))
}

/**
 * @param {number} policyId
 * @returns {Promise<PromotionPolicyView>}
 */
export function activatePolicy(policyId) {
  return /** @type {Promise<PromotionPolicyView>} */ (
    apiPatch(`/promotion-policies/${Math.trunc(policyId)}/activate`)
  )
}

/**
 * @param {number} policyId
 * @returns {Promise<PromotionPolicyView>}
 */
export function deactivatePolicy(policyId) {
  return /** @type {Promise<PromotionPolicyView>} */ (
    apiPatch(`/promotion-policies/${Math.trunc(policyId)}/deactivate`)
  )
}
