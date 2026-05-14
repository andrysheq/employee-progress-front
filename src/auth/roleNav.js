import { mainNavItems } from '../layout/navConfig.js'

/** Полный набор зон навигации доступен генеральному директору. */
const GENERAL_DIRECTOR_ROLES = new Set(['Генеральный директор'])

/** Для директора отдела скрываем Решения и Отчёты. */
const DEPARTMENT_DIRECTOR_PATHS = new Set([
  '/',
  '/grade-model',
  '/departments',
  '/employees',
  '/policies',
  '/development-plans',
  '/reviews',
])

/** Пути для тимлида: без кадровых решений (зона Е). */
const TEAM_LEAD_PATHS = new Set([
  '/',
  '/grade-model',
  '/departments',
  '/employees',
  '/policies',
  '/development-plans',
  '/reviews',
  '/reports',
])

/** Пути для сотрудника: без отчётов и кадровых решений (зона Ж и Е). */
const EMPLOYEE_PATHS = new Set([
  '/',
  '/grade-model',
  '/departments',
  '/employees',
  '/policies',
  '/development-plans',
  '/reviews',
])

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
 * Пункты верхнего меню с учётом ролей из JWT.
 * Если роль не распознана, она игнорируется.
 * Если нет ни одной распознанной роли, показываем полный набор.
 * @param {string[]} roles
 */
export function getVisibleNavItems(roles) {
  const list = Array.isArray(roles) ? roles.filter(Boolean) : []
  if (list.length === 0) {
    return mainNavItems
  }

  if (list.some((r) => GENERAL_DIRECTOR_ROLES.has(r))) {
    return mainNavItems
  }

  const allowed = new Set()
  let hasKnownRole = false

  for (const role of list) {
    if (role === 'Директор отдела') {
      hasKnownRole = true
      DEPARTMENT_DIRECTOR_PATHS.forEach((p) => allowed.add(p))
      continue
    }
    if (role === 'Тимлид') {
      hasKnownRole = true
      TEAM_LEAD_PATHS.forEach((p) => allowed.add(p))
      continue
    }
    if (role === 'Сотрудник') {
      hasKnownRole = true
      EMPLOYEE_PATHS.forEach((p) => allowed.add(p))
    }
  }

  if (!hasKnownRole || allowed.size === 0) {
    return mainNavItems
  }

  return mainNavItems.filter((item) => allowed.has(item.to))
}
