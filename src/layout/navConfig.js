/**
 * @typedef {object} NavItem
 * @property {string} to
 * @property {string} label
 * @property {boolean} [end]
 */

/** Полный список зон (см. `docs/ui-roles.md`; подмножество по ролям — `getVisibleNavItems` в `src/auth/roleNav.js`). */
/** @type {NavItem[]} */
export const mainNavItems = [
  { to: "/", label: "Главная", end: true },
  { to: "/grade-model", label: "Матрица грейдов" },
  { to: "/departments", label: "Отделы" },
  { to: "/employees", label: "Сотрудники" },
  { to: "/policies", label: "Политики" },
  { to: "/development-plans", label: "ИПР" },
  { to: "/reviews", label: "Ревью" },
  { to: "/promotion-decisions", label: "Решения" },
  { to: "/reports", label: "Отчёты" },
]
