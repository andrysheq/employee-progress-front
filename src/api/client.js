import { buildApiUrl } from './config.js'
import { getAccessToken } from './token.js'
import { ApiError, isApiResultEnvelope } from './errors.js'

/**
 * @typedef {'json' | 'void'} ParseMode
 */

/**
 * @param {string} method
 * @param {string} resourcePath путь внутри `/employee-progress`, с ведущим слэшем
 * @param {object} [options]
 * @param {unknown} [options.jsonBody] тело как объект — сериализуется в JSON (поля в snake_case, как на backend)
 * @param {Record<string, string>} [options.headers]
 * @param {ParseMode} [options.parseAs] по умолчанию `json`; для 204 / пустого тела используйте `void`
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<unknown>}
 */
export async function apiRequest(method, resourcePath, options = {}) {
  const {
    jsonBody,
    headers: extraHeaders,
    parseAs = 'json',
    signal,
    ...rest
  } = options

  const url = buildApiUrl(resourcePath)
  const headers = new Headers(extraHeaders ?? {})

  const requestId = crypto.randomUUID()
  headers.set('X-Request-ID', requestId)

  const token = getAccessToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  /** @type {RequestInit} */
  const init = {
    method,
    ...rest,
    headers,
    signal,
  }

  if (jsonBody !== undefined) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    init.body = JSON.stringify(jsonBody)
  }

  const response = await fetch(url, init)

  const serverRequestId = response.headers.get('X-Request-ID') ?? requestId

  if (!response.ok) {
    /** @type {unknown} */
    let parsed
    const ct = response.headers.get('Content-Type') ?? ''
    if (ct.includes('application/json')) {
      try {
        parsed = await response.json()
      } catch {
        parsed = null
      }
    } else {
      const text = await response.text()
      parsed = text
        ? { meta: { code: String(response.status), message: text, request_id: serverRequestId } }
        : null
    }
    if (parsed && isApiResultEnvelope(parsed)) {
      const err = ApiError.fromEnvelope(parsed, response.status)
      err.requestId = err.requestId ?? serverRequestId
      throw err
    }
    throw new ApiError({
      httpStatus: response.status,
      code: String(response.status),
      message: response.statusText || `HTTP ${response.status}`,
      requestId: serverRequestId,
      body: parsed,
    })
  }

  if (parseAs === 'void' || response.status === 204) {
    await response.text()
    return undefined
  }

  const text = await response.text()
  if (!text) {
    return undefined
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new ApiError({
      httpStatus: response.status,
      code: 'invalid_json',
      message: 'Ответ сервера не является JSON',
      requestId: serverRequestId,
      body: text,
    })
  }
}

/** @param {string} resourcePath @param {object} [opts] */
export function apiGet(resourcePath, opts) {
  return apiRequest('GET', resourcePath, opts)
}

/** @param {string} resourcePath @param {unknown} [jsonBody] @param {object} [opts] */
export function apiPost(resourcePath, jsonBody, opts) {
  return apiRequest('POST', resourcePath, { ...opts, jsonBody })
}

/** @param {string} resourcePath @param {unknown} [jsonBody] @param {object} [opts] */
export function apiPut(resourcePath, jsonBody, opts) {
  return apiRequest('PUT', resourcePath, { ...opts, jsonBody })
}

/** @param {string} resourcePath @param {unknown} [jsonBody] @param {object} [opts] */
export function apiPatch(resourcePath, jsonBody, opts) {
  return apiRequest('PATCH', resourcePath, { ...opts, jsonBody })
}

/** @param {string} resourcePath @param {object} [opts] */
export function apiDelete(resourcePath, opts) {
  return apiRequest('DELETE', resourcePath, opts)
}
