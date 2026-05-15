import { mainNavItems } from '../layout/navConfig.js'

const ROLE_ALIASES = {
  GENERAL_DIRECTOR: new Set([
    '\u0413\u0435\u043d\u0435\u0440\u0430\u043b\u044c\u043d\u044b\u0439 \u0434\u0438\u0440\u0435\u043a\u0442\u043e\u0440',
    '1001',
    'ROLE_GENERAL_DIRECTOR',
    'GENERAL_DIRECTOR',
  ]),
  DEPARTMENT_DIRECTOR: new Set([
    '\u0414\u0438\u0440\u0435\u043a\u0442\u043e\u0440 \u043e\u0442\u0434\u0435\u043b\u0430',
    '1000',
    'ROLE_DEPARTMENT_DIRECTOR',
    'DEPARTMENT_DIRECTOR',
  ]),
  TEAM_LEAD: new Set([
    '\u0422\u0438\u043c\u043b\u0438\u0434',
    '1002',
    'ROLE_TEAM_LEAD',
    'TEAM_LEAD',
  ]),
  EMPLOYEE: new Set([
    '\u0421\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u043a',
    '1003',
    'ROLE_EMPLOYEE',
    'EMPLOYEE',
  ]),
}

const SAFE_DEFAULT_PATHS = new Set([
  '/',
  '/grade-model',
  '/departments',
  '/employees',
  '/policies',
  '/development-plans',
  '/reviews',
])

const DEPARTMENT_DIRECTOR_PATHS = new Set([
  ...SAFE_DEFAULT_PATHS,
  '/promotion-decisions',
  '/reports',
])

const TEAM_LEAD_PATHS = new Set([
  ...SAFE_DEFAULT_PATHS,
  '/reports',
])

const EMPLOYEE_PATHS = SAFE_DEFAULT_PATHS

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
export function normalizeJwtRoles(raw) {
  if (Array.isArray(raw)) {
    return raw.map((r) => String(r).trim()).filter(Boolean)
  }
  if (typeof raw === 'string' && raw.trim() !== '') {
    return [raw.trim()]
  }
  return []
}

/**
 * @param {string} role
 * @param {Set<string>} aliases
 */
function hasRoleAlias(role, aliases) {
  const normalized = String(role).trim()
  return aliases.has(normalized)
}

/**
 * @param {string[]} roles
 */
export function getVisibleNavItems(roles) {
  const list = Array.isArray(roles) ? roles.filter(Boolean) : []

  if (list.some((r) => hasRoleAlias(r, ROLE_ALIASES.GENERAL_DIRECTOR))) {
    return mainNavItems
  }

  const allowed = new Set()
  let hasKnownRole = false

  for (const role of list) {
    if (hasRoleAlias(role, ROLE_ALIASES.DEPARTMENT_DIRECTOR)) {
      hasKnownRole = true
      DEPARTMENT_DIRECTOR_PATHS.forEach((p) => allowed.add(p))
      continue
    }
    if (hasRoleAlias(role, ROLE_ALIASES.TEAM_LEAD)) {
      hasKnownRole = true
      TEAM_LEAD_PATHS.forEach((p) => allowed.add(p))
      continue
    }
    if (hasRoleAlias(role, ROLE_ALIASES.EMPLOYEE)) {
      hasKnownRole = true
      EMPLOYEE_PATHS.forEach((p) => allowed.add(p))
    }
  }

  if (!hasKnownRole || allowed.size === 0) {
    return mainNavItems.filter((item) => SAFE_DEFAULT_PATHS.has(item.to))
  }

  return mainNavItems.filter((item) => allowed.has(item.to))
}
