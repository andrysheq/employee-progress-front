/**
 * @typedef {object} RegistryPage
 * @property {unknown[]} content
 * @property {number} [number]
 * @property {number} [size]
 * @property {number} [total_elements]
 * @property {number} [total_pages]
 */

/**
 * @param {Record<string, string | number | boolean | null | undefined>} [query]
 * @returns {string}
 */
export function buildRegistryQuery(query = {}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value == null || value === '') {
      continue
    }
    params.set(key, String(value))
  }
  const serialized = params.toString()
  return serialized ? `?${serialized}` : ''
}

/**
 * @template T
 * @param {unknown} payload
 * @returns {{ content: T[], totalElements: number, totalPages: number, size: number, page: number }}
 */
export function normalizePage(payload) {
  if (!payload || typeof payload !== 'object') {
    return { content: [], totalElements: 0, totalPages: 0, size: 0, page: 0 }
  }

  const page = /** @type {RegistryPage} */ (payload)
  const content = Array.isArray(page.content) ? /** @type {T[]} */ (page.content) : []
  const totalElements = Number(page.total_elements)
  const totalPages = Number(page.total_pages)
  const size = Number(page.size)
  const currentPage = Number(page.number)

  return {
    content,
    totalElements: Number.isFinite(totalElements) ? Math.max(0, Math.trunc(totalElements)) : content.length,
    totalPages: Number.isFinite(totalPages) ? Math.max(0, Math.trunc(totalPages)) : 1,
    size: Number.isFinite(size) ? Math.max(0, Math.trunc(size)) : content.length,
    page: Number.isFinite(currentPage) ? Math.max(0, Math.trunc(currentPage)) : 0,
  }
}
