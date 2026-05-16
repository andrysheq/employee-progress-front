/**
 * @typedef {object} NavItem
 * @property {string} to
 * @property {string} label
 * @property {boolean} [end]
 * @property {string} [description] Краткий текст для карточек на главной (не у пункта «Главная»).
 */

/** Полный список зон (см. `docs/ui-roles.md`; подмножество по ролям — `getVisibleNavItems` в `src/auth/roleNav.js`). */
/** @type {NavItem[]} */
export const mainNavItems = [
  { to: '/', label: 'Главная', end: true },
  {
    to: '/grade-model',
    label: 'Матрица грейдов',
    description: 'Позиции, компетенции и уровни требований по грейдам.',
  },
  {
    to: '/departments',
    label: 'Отделы',
    description: 'Организационная структура и справочник отделов компании.',
  },
  {
    to: '/employees',
    label: 'Сотрудники',
    description: 'Список сотрудников и переход к карточкам и данным по людям.',
  },
  {
    to: '/policies',
    label: 'Политики',
    description: 'Корпоративные политики и регламенты развития и оценки.',
  },
  {
    to: '/development-plans',
    label: 'ИПР',
    description: 'Индивидуальные планы развития: цели, задачи и контроль исполнения.',
  },
  {
    to: '/reviews',
    label: 'Собеседования',
    description: 'Циклы оценочных собеседований и материалы по проведению оценки.',
  },
  {
    to: '/promotion-decisions',
    label: 'Решения',
    description: 'Журнал решений о повышении, смене грейда и связанных статусах.',
  },
  {
    to: '/reports',
    label: 'Отчёты',
    description: 'Сводки и выгрузки по данным системы для анализа и отчётности.',
  },
]
