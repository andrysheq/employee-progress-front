const DIRECTOR_ROLE_ALIASES = new Set([
  'Директор отдела',
  'Генеральный директор',
  '1000',
  '1001',
  'ROLE_DEPARTMENT_DIRECTOR',
  'ROLE_GENERAL_DIRECTOR',
  'DEPARTMENT_DIRECTOR',
  'GENERAL_DIRECTOR',
])

const TEAM_LEAD_ROLE_ALIASES = new Set([
  'Тимлид',
  '1002',
  'ROLE_TEAM_LEAD',
  'TEAM_LEAD',
])

const EMPLOYEE_ROLE_ALIASES = new Set([
  'Сотрудник',
  '1003',
  'ROLE_EMPLOYEE',
  'EMPLOYEE',
])

/**
 * @param {unknown} role
 * @returns {string}
 */
function normalizeRole(role) {
  return String(role ?? '').trim()
}

/**
 * @param {string[] | null | undefined} roles
 * @returns {boolean}
 */
const GENERAL_DIRECTOR_ROLE_ALIASES = new Set([
  'Генеральный директор',
  '1001',
  'ROLE_GENERAL_DIRECTOR',
  'GENERAL_DIRECTOR',
])

export function hasDirectorRole(roles) {
  if (!Array.isArray(roles)) {
    return false
  }
  return roles.some((role) => DIRECTOR_ROLE_ALIASES.has(normalizeRole(role)))
}

/**
 * @param {string[] | null | undefined} roles
 * @returns {boolean}
 */
export function hasGeneralDirectorRole(roles) {
  if (!Array.isArray(roles)) {
    return false
  }
  return roles.some((role) => GENERAL_DIRECTOR_ROLE_ALIASES.has(normalizeRole(role)))
}

/**
 * @param {string[] | null | undefined} roles
 * @returns {boolean}
 */
export function hasTeamLeadRole(roles) {
  if (!Array.isArray(roles)) {
    return false
  }
  return roles.some((role) => TEAM_LEAD_ROLE_ALIASES.has(normalizeRole(role)))
}

/**
 * @param {string[] | null | undefined} roles
 * @returns {boolean}
 */
export function hasEmployeeRole(roles) {
  if (!Array.isArray(roles)) {
    return false
  }
  return roles.some((role) => EMPLOYEE_ROLE_ALIASES.has(normalizeRole(role)))
}
