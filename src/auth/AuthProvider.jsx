import { useCallback, useMemo, useState } from 'react'
import { AuthContext } from './authContext.js'
import { parseJwtPayload } from './jwtPayload.js'
import { getAccessToken } from '../api/token.js'
import { COMPANY_CLAIM, EMPLOYEE_CLAIM } from '../config/companyContext.js'
import { normalizeJwtRoles, getVisibleNavItems } from './roleNav.js'

/** @typedef {import('react').ReactNode} ReactNode */

/**
 * @typedef {object} AuthContextValue
 * @property {boolean} isAuthenticated
 * @property {string[]} roles
 * @property {string | null} subject
 * @property {number | null} companyIdFromJwt
 * @property {number | null} employeeIdFromJwt
 * @property {import('../layout/navConfig.js').NavItem[]} visibleNavItems
 * @property {(accessToken: string) => void} setSessionToken
 * @property {() => void} clearSession
 */

/** @param {{ children: ReactNode }} props */
export function AuthProvider({ children }) {
  const [version, setVersion] = useState(0)

  const snapshot = useMemo(() => {
    void version
    const token = getAccessToken()
    if (!token) {
      return {
        isAuthenticated: false,
        roles: /** @type {string[]} */ ([]),
        subject: null,
        companyIdFromJwt: null,
        employeeIdFromJwt: null,
      }
    }
    const payload = parseJwtPayload(token)
    const roles = normalizeJwtRoles(payload?.roles)
    const subject = payload?.sub != null ? String(payload.sub) : null
    return {
      isAuthenticated: true,
      roles,
      subject,
      companyIdFromJwt: readPositiveLong(payload, COMPANY_CLAIM),
      employeeIdFromJwt: readPositiveLong(payload, EMPLOYEE_CLAIM),
    }
  }, [version])

  const setSessionToken = useCallback((accessToken) => {
    try {
      sessionStorage.setItem('ep_access_token', accessToken)
    } catch {
      /* ignore */
    }
    setVersion((v) => v + 1)
  }, [])

  const clearSession = useCallback(() => {
    try {
      sessionStorage.removeItem('ep_access_token')
    } catch {
      /* ignore */
    }
    setVersion((v) => v + 1)
  }, [])

  const visibleNavItems = useMemo(
    () => getVisibleNavItems(snapshot.roles),
    [snapshot.roles],
  )

  const value = useMemo(
    () => ({
      ...snapshot,
      visibleNavItems,
      setSessionToken,
      clearSession,
    }),
    [snapshot, visibleNavItems, setSessionToken, clearSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * @param {Record<string, unknown> | null} payload
 * @param {string} claim
 * @returns {number | null}
 */
function readPositiveLong(payload, claim) {
  if (!payload || payload[claim] == null) {
    return null
  }
  const n = Number(payload[claim])
  if (!Number.isFinite(n) || n <= 0) {
    return null
  }
  return Math.trunc(n)
}
