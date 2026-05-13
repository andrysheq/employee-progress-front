/**
 * @typedef {object} ApiMeta
 * @property {string} code
 * @property {string} [message]
 * @property {string | null} [request_id]
 * @property {string} [timestamp]
 */

/**
 * @typedef {object} ApiResultEnvelope
 * @property {ApiMeta} meta
 * @property {unknown} [data]
 */

export class ApiError extends Error {
  /**
   * @param {object} p
   * @param {number} p.httpStatus
   * @param {string} p.code
   * @param {string} p.message
   * @param {string | null | undefined} p.requestId
   * @param {unknown} [p.body]
   */
  constructor({ httpStatus, code, message, requestId, body }) {
    super(message)
    this.name = 'ApiError'
    this.httpStatus = httpStatus
    this.code = code
    this.requestId = requestId ?? null
    this.body = body
  }

  /**
   * @param {ApiResultEnvelope} envelope
   * @param {number} httpStatus
   */
  static fromEnvelope(envelope, httpStatus) {
    const meta = envelope?.meta ?? {}
    return new ApiError({
      httpStatus,
      code: meta.code != null ? String(meta.code) : String(httpStatus),
      message:
        meta.message != null && String(meta.message) !== ''
          ? String(meta.message)
          : `HTTP ${httpStatus}`,
      requestId: meta.request_id ?? null,
      body: envelope,
    })
  }
}

/**
 * @param {unknown} value
 * @returns {value is ApiResultEnvelope}
 */
export function isApiResultEnvelope(value) {
  return (
    value != null &&
    typeof value === 'object' &&
    'meta' in value &&
    value.meta != null &&
    typeof value.meta === 'object' &&
    'code' in value.meta
  )
}
