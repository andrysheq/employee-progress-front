/** Опции выпадающих списков для задач ИПР (тип / приоритет). */

/** @type {{ value: string, label: string, description?: string }[]} */
export const IDP_TASK_TYPE_OPTIONS = [
  { value: 'LEARNING', label: 'Обучение', description: 'Курсы и обучающие активности' },
  { value: 'PROJECT', label: 'Проект', description: 'Практика на рабочих задачах' },
  { value: 'SOFT_SKILL', label: 'Soft skills', description: 'Коммуникация и самоорганизация' },
]

/** @type {{ value: string, label: string, description?: string }[]} */
export const IDP_TASK_PRIORITY_OPTIONS = [
  { value: 'HIGH', label: 'Высокий', description: 'Сделать в первую очередь' },
  { value: 'MIDDLE', label: 'Средний', description: 'Обычный приоритет' },
  { value: 'LOW', label: 'Низкий', description: 'Можно отложить' },
]
