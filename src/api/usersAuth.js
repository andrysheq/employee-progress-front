import { buildUsersServiceUrl } from '../config/usersService.js'

/**
 * @param {string} email
 * @param {string} password
 * @returns {Promise<string>} access_token (JWT)
 */
export async function loginWithEmailPassword(email, password) {
  const res = await fetch(buildUsersServiceUrl('/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    let message = 'Не удалось войти'
    const ct = res.headers.get('Content-Type') ?? ''
    try {
      if (ct.includes('application/json')) {
        const j = /** @type {Record<string, unknown>} */ (await res.json())
        const m =
          typeof j.message === 'string'
            ? j.message
            : typeof j.detail === 'string'
              ? j.detail
              : typeof j.error === 'string'
                ? j.error
                : null
        if (m) {
          message = m
        }
      } else {
        const t = (await res.text()).trim()
        if (t) {
          message = t.length > 200 ? `${t.slice(0, 200)}…` : t
        }
      }
    } catch {
      /* оставляем дефолт */
    }
    if (res.status === 401 || res.status === 403) {
      message = 'Неверный email или пароль'
    }
    throw new Error(message)
  }

  const data = /** @type {Record<string, unknown>} */ (await res.json())
  const token = data.accessToken ?? data.access_token
  if (typeof token !== 'string' || token.trim() === '') {
    throw new Error('Ответ сервера без accessToken')
  }
  return token.trim()
}
