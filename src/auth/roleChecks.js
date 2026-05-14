const DIRECTOR_ROLES = new Set(['Директор отдела', 'Генеральный директор'])

/**
 * @param {string[] | null | undefined} roles
 * @returns {boolean}
 */
export function hasDirectorRole(roles) {
  if (!Array.isArray(roles)) {
    return false
  }
  return roles.some((role) => DIRECTOR_ROLES.has(String(role)))
}

/**
 * @param {string[] | null | undefined} roles
 * @returns {boolean}
 */
export function hasTeamLeadRole(roles) {
  if (!Array.isArray(roles)) {
    return false
  }
  return roles.some((role) => String(role) === 'Тимлид')
}

/**
 * @param {string[] | null | undefined} roles
 * @returns {boolean}
 */
export function hasEmployeeRole(roles) {
  if (!Array.isArray(roles)) {
    return false
  }
  return roles.some((role) => String(role) === 'Сотрудник')
}
