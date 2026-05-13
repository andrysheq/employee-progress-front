import { mainNavItems } from '../layout/navConfig.js'

/** Роли с полным набором зон навигации (см. docs/ui-roles.md). */
const DIRECTOR_ROLES = new Set(['Директор отдела', 'Генеральный директор'])

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
 * Пункты верхнего меню с учётом ролей из JWT (эвристика по docs/ui-roles.md).
 * Если ролей нет или неизвестны — показываем все пункты (удобно для кастомных токенов).
 * @param {string[]} roles
 */
export function getVisibleNavItems(roles) {
  const list = roles.filter(Boolean)
  if (list.length === 0) {
    return mainNavItems
  }
  if (list.some((r) => DIRECTOR_ROLES.has(r))) {
    return mainNavItems
  }

  const allowed = new Set()
  for (const r of list) {
    if (r === 'Тимлид') {
      TEAM_LEAD_PATHS.forEach((p) => allowed.add(p))
    } else if (r === 'Сотрудник') {
      EMPLOYEE_PATHS.forEach((p) => allowed.add(p))
    } else {
      return mainNavItems
    }
  }
  if (allowed.size === 0) {
    return mainNavItems
  }
  return mainNavItems.filter((item) => allowed.has(item.to))
}
