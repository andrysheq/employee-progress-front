/**
 * Декодирование payload JWT без проверки подписи (только для чтения claim'ов в UI).
 * @param {string} accessToken
 * @returns {Record<string, unknown> | null}
 */
export function parseJwtPayload(accessToken) {
  if (!accessToken || typeof accessToken !== 'string') {
    return null
  }
  const parts = accessToken.split('.')
  if (parts.length < 2) {
    return null
  }
  const segment = parts[1]
  if (!segment) {
    return null
  }
  let base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
  const pad = base64.length % 4
  if (pad === 2) {
    base64 += '=='
  } else if (pad === 3) {
    base64 += '='
  } else if (pad !== 0) {
    return null
  }
  try {
    const json = atob(base64)
    return /** @type {Record<string, unknown>} */ (JSON.parse(json))
  } catch {
    return null
  }
}
