import { parseJwtPayload } from '../auth/jwtPayload.js'
import { getAccessToken } from '../api/token.js'
import { getDevCompanyId } from './devCompany.js'

const COMPANY_CLAIM =
  import.meta.env.VITE_JWT_COMPANY_CLAIM != null &&
  String(import.meta.env.VITE_JWT_COMPANY_CLAIM).trim() !== ''
    ? String(import.meta.env.VITE_JWT_COMPANY_CLAIM).trim()
    : 'company_id'

const EMPLOYEE_CLAIM =
  import.meta.env.VITE_JWT_EMPLOYEE_CLAIM != null &&
  String(import.meta.env.VITE_JWT_EMPLOYEE_CLAIM).trim() !== ''
    ? String(import.meta.env.VITE_JWT_EMPLOYEE_CLAIM).trim()
    : 'employee_id'

/**
 * @returns {Record<string, unknown> | null}
 */
export function getJwtPayload() {
  const t = getAccessToken()
  if (!t) {
    return null
  }
  return parseJwtPayload(t)
}

/**
 * @param {string} claimName
 * @returns {number | null}
 */
function readPositiveLongClaim(claimName) {
  const p = getJwtPayload()
  if (!p || p[claimName] == null) {
    return null
  }
  const n = Number(p[claimName])
  if (!Number.isFinite(n) || n <= 0) {
    return null
  }
  return Math.trunc(n)
}

/**
 * Идентификатор компании: из JWT (`VITE_JWT_COMPANY_CLAIM`, по умолчанию `company_id`), иначе `VITE_DEV_COMPANY_ID`.
 * @returns {number | null}
 */
export function getEffectiveCompanyId() {
  const fromJwt = readPositiveLongClaim(COMPANY_CLAIM)
  if (fromJwt != null) {
    return fromJwt
  }
  return getDevCompanyId()
}

/**
 * @typedef {'jwt' | 'env' | 'none'} CompanyIdSource
 */

/**
 * @returns {{ companyId: number | null, source: CompanyIdSource }}
 */
export function resolveCompanyId() {
  const fromJwt = readPositiveLongClaim(COMPANY_CLAIM)
  if (fromJwt != null) {
    return { companyId: fromJwt, source: 'jwt' }
  }
  const dev = getDevCompanyId()
  if (dev != null) {
    return { companyId: dev, source: 'env' }
  }
  return { companyId: null, source: 'none' }
}

/**
 * `employee_id` из JWT (если выдан users-service), иначе `null`.
 * @returns {number | null}
 */
export function getEffectiveEmployeeId() {
  return readPositiveLongClaim(EMPLOYEE_CLAIM)
}

export { COMPANY_CLAIM, EMPLOYEE_CLAIM }
