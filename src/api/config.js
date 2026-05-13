/**
 * Базовый URL origin без завершающего слэша.
 * Пустая строка: запросы идут относительно текущего origin (прокси Vite в dev на `/employee-progress`).
 * @type {string}
 */
export function getApiOrigin() {
  const raw = import.meta.env.VITE_API_BASE_URL
  if (raw == null || String(raw).trim() === '') {
    return ''
  }
  return String(raw).replace(/\/$/, '')
}

/** Префикс контекста Spring (см. server.servlet.context-path). */
export const API_CONTEXT_PATH = '/employee-progress'

/**
 * Полный URL для fetch (относительный или абсолютный).
 * @param {string} resourcePath путь API внутри контекста, например `/departments/companies/1`
 */
export function buildApiUrl(resourcePath) {
  const path =
    resourcePath.startsWith('/') ? resourcePath : `/${resourcePath}`
  const withContext = `${API_CONTEXT_PATH}${path}`
  const origin = getApiOrigin()
  if (!origin) {
    return withContext
  }
  return `${origin}${withContext}`
}
