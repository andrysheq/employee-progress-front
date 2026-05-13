/**
 * Идентификатор компании для локальной разработки UI без полноценного auth-контекста.
 * @returns {number | null}
 */
export function getDevCompanyId() {
  const raw = import.meta.env.VITE_DEV_COMPANY_ID
  if (raw == null || String(raw).trim() === '') {
    return null
  }
  const n = Number(String(raw).trim())
  if (!Number.isFinite(n) || n <= 0) {
    return null
  }
  return Math.trunc(n)
}
