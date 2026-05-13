/**
 * Базовый URL users-service (origin без завершающего слэша).
 * Пусто — запросы относительно текущего origin (в dev прокси Vite: `/users` → `http://localhost:8001`).
 * @returns {string}
 */
export function getUsersServiceOrigin() {
  const raw = import.meta.env.VITE_USERS_API_BASE_URL
  if (raw == null || String(raw).trim() === '') {
    return ''
  }
  return String(raw).replace(/\/$/, '')
}

/**
 * Полный URL метода auth (контекст Spring `/users` уже в path).
 * @param {string} path например `/auth/login`
 */
export function buildUsersServiceUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`
  const origin = getUsersServiceOrigin()
  if (!origin) {
    return `/users${p}`
  }
  return `${origin}/users${p}`
}
